import { useCallback, useEffect, useState } from "react"
import type { Player } from "@pelafut/shared"
import { supabase } from "@/lib/supabaseClient"
import { colorForIndex } from "@/features/teams/teamColors"

export interface FormationTeam {
  number: number
  color: string
  captainId: string | null
  players: Player[]
}

export type FormationPhase = "setup" | "draft" | "done"

function emptyTeams(numTeams: number): FormationTeam[] {
  return Array.from({ length: numTeams }, (_, i) => ({
    number: i + 1,
    color: colorForIndex(i).hex,
    captainId: null,
    players: [],
  }))
}

export function useTeamFormation(matchId: string) {
  const [teams, setTeams] = useState<FormationTeam[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [participants, setParticipants] = useState<Player[]>([])
  const [phase, setPhase] = useState<FormationPhase>("setup")
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("players_per_team")
      .eq("id", matchId)
      .single()
    if (matchError || !match) {
      setError(matchError?.message ?? "Pelada não encontrada")
      setLoading(false)
      return
    }

    const { data: matchPlayers, error: mpError } = await supabase
      .from("match_players")
      .select("players(*)")
      .eq("match_id", matchId)
    if (mpError) {
      setError(mpError.message)
      setLoading(false)
      return
    }
    const loadedParticipants = ((matchPlayers ?? []) as unknown as { players: Player }[]).map(
      (r) => r.players
    )
    setParticipants(loadedParticipants)

    const { data: existingTeams, error: teamsError } = await supabase
      .from("teams")
      .select("id, color, position, captain_player_id, team_players(player_id, players(*))")
      .eq("match_id", matchId)
      .order("position")
    if (teamsError) {
      setError(teamsError.message)
      setLoading(false)
      return
    }

    if (existingTeams && existingTeams.length > 0) {
      setTeams(
        existingTeams.map((t, i) => ({
          number: i + 1,
          color: t.color,
          captainId: t.captain_player_id,
          players: (t.team_players as unknown as { players: Player }[]).map((tp) => tp.players),
        }))
      )
      setAvailablePlayers([])
      setPhase("done")
      setLoading(false)
      return
    }

    const numTeams =
      loadedParticipants.length > 0 && match.players_per_team > 0
        ? Math.ceil(loadedParticipants.length / match.players_per_team)
        : 0
    setTeams(emptyTeams(numTeams))
    setAvailablePlayers(loadedParticipants)
    setCurrentTeamIndex(0)
    setPhase("setup")
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    load()
  }, [load])

  function setTeamColor(teamIndex: number, color: string) {
    setTeams((prev) => prev.map((t, i) => (i === teamIndex ? { ...t, color } : t)))
  }

  function startDraft() {
    setCurrentTeamIndex(0)
    setPhase("draft")
  }

  function pickPlayer(playerId: string) {
    setTeams((prev) => {
      const team = prev[currentTeamIndex]
      const player = availablePlayers.find((p) => p.id === playerId)
      if (!team || !player) return prev
      const next = prev.map((t, i) =>
        i === currentTeamIndex
          ? {
              ...t,
              captainId: t.captainId ?? player.id,
              players: [...t.players, player],
            }
          : t
      )
      return next
    })
    setAvailablePlayers((prev) => {
      const next = prev.filter((p) => p.id !== playerId)
      if (next.length === 0) {
        setPhase("done")
      } else {
        setCurrentTeamIndex((idx) => (idx + 1) % teams.length)
      }
      return next
    })
  }

  function movePlayer(playerId: string, fromTeamIndex: number, toTeamIndex: number) {
    if (fromTeamIndex === toTeamIndex) return
    setTeams((prev) => {
      const next = prev.map((t) => ({ ...t, players: [...t.players] }))
      const fromTeam = next[fromTeamIndex]
      const toTeam = next[toTeamIndex]
      if (!fromTeam || !toTeam) return prev
      const playerIdx = fromTeam.players.findIndex((p) => p.id === playerId)
      if (playerIdx === -1) return prev
      const [player] = fromTeam.players.splice(playerIdx, 1)
      if (player) toTeam.players.push(player)
      if (fromTeam.captainId === playerId) fromTeam.captainId = null
      return next
    })
  }

  function setCaptain(teamIndex: number, playerId: string) {
    setTeams((prev) =>
      prev.map((t, i) => (i === teamIndex ? { ...t, captainId: playerId } : t))
    )
  }

  function resetDraft() {
    const numTeams = teams.length
    setTeams((prev) => emptyTeams(prev.length || numTeams))
    setAvailablePlayers(participants)
    setCurrentTeamIndex(0)
    setPhase("setup")
  }

  async function save() {
    setSaving(true)
    setError(null)

    await supabase.from("teams").delete().eq("match_id", matchId)

    const { data: insertedTeams, error: insertTeamsError } = await supabase
      .from("teams")
      .insert(
        teams.map((t, i) => ({
          match_id: matchId,
          name: `Time ${t.number}`,
          color: t.color,
          position: i,
          captain_player_id: t.players.some((p) => p.id === t.captainId) ? t.captainId : null,
        }))
      )
      .select("id")

    if (insertTeamsError || !insertedTeams) {
      setError(insertTeamsError?.message ?? "Erro ao salvar times")
      setSaving(false)
      return { error: insertTeamsError?.message ?? "Erro ao salvar times" }
    }

    const teamPlayersRows = teams.flatMap((t, i) =>
      t.players.map((p) => ({
        team_id: insertedTeams[i]!.id,
        player_id: p.id,
        is_goalkeeper: p.position === "goleiro",
      }))
    )

    if (teamPlayersRows.length > 0) {
      const { error: insertTpError } = await supabase.from("team_players").insert(teamPlayersRows)
      if (insertTpError) {
        setError(insertTpError.message)
        setSaving(false)
        return { error: insertTpError.message }
      }
    }

    const { error: statusError } = await supabase
      .from("matches")
      .update({ status: "teams_formed" })
      .eq("id", matchId)

    setSaving(false)
    if (statusError) {
      setError(statusError.message)
      return { error: statusError.message }
    }
    await load()
    return { error: null }
  }

  return {
    teams,
    availablePlayers,
    phase,
    currentTeamIndex,
    loading,
    saving,
    error,
    setTeamColor,
    startDraft,
    pickPlayer,
    movePlayer,
    setCaptain,
    resetDraft,
    save,
    reload: load,
  }
}

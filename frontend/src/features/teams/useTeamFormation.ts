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

export function captainFirst(team: FormationTeam): Player[] {
  if (!team.captainId) return team.players
  const captain = team.players.find((p) => p.id === team.captainId)
  if (!captain) return team.players
  return [captain, ...team.players.filter((p) => p.id !== team.captainId)]
}

function emptyTeams(numTeams: number): FormationTeam[] {
  return Array.from({ length: numTeams }, (_, i) => ({
    number: i + 1,
    color: colorForIndex(i).hex,
    captainId: null,
    players: [],
  }))
}

/**
 * When the participant count doesn't divide evenly by playersPerTeam, the
 * shortfall goes entirely into the last team instead of being spread thin
 * across the last few teams (e.g. 13 players / 3 per team => four teams of
 * 3 plus one reserve team of 1, not two teams of 2).
 */
export function teamCapacity(
  teamIndex: number,
  numTeams: number,
  playersPerTeam: number,
  totalParticipants: number
): number {
  const remainder = playersPerTeam > 0 ? totalParticipants % playersPerTeam : 0
  const isReserveTeam = remainder > 0 && teamIndex === numTeams - 1
  return isReserveTeam ? remainder : playersPerTeam
}

/**
 * Only the "full" teams (the ones that fit exactly playersPerTeam players)
 * take active turns in the draft. If there's a remainder, it does not get an
 * active turn at all — it's a passive reserve team that automatically
 * receives whichever player(s) are left over once every active team is
 * full, rather than getting an early pick of its own.
 */
function splitPlan(totalParticipants: number, playersPerTeam: number) {
  if (playersPerTeam <= 0 || totalParticipants <= 0) {
    return { numActiveTeams: 0, remainder: 0 }
  }
  const fullTeams = Math.floor(totalParticipants / playersPerTeam)
  const remainder = totalParticipants % playersPerTeam
  if (fullTeams === 0) {
    // Not even enough players for one full team: draft normally into the one team there is.
    return { numActiveTeams: 1, remainder: 0 }
  }
  return { numActiveTeams: fullTeams, remainder }
}

function nextActiveTeamIndex(
  currentTeams: FormationTeam[],
  fromIndex: number,
  numActiveTeams: number,
  playersPerTeam: number
): number {
  for (let step = 1; step <= numActiveTeams; step++) {
    const idx = (fromIndex + step) % numActiveTeams
    if (currentTeams[idx].players.length < playersPerTeam) return idx
  }
  return fromIndex
}

export function useTeamFormation(matchId: string) {
  const [teams, setTeams] = useState<FormationTeam[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [participants, setParticipants] = useState<Player[]>([])
  const [playersPerTeam, setPlayersPerTeam] = useState(0)
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
    setPlayersPerTeam(match.players_per_team)

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
    let updatedTeams = teams
    setTeams((prev) => {
      const team = prev[currentTeamIndex]
      const player = availablePlayers.find((p) => p.id === playerId)
      if (!team || !player || team.players.some((p) => p.id === player.id)) {
        updatedTeams = prev
        return prev
      }
      const next = prev.map((t, i) =>
        i === currentTeamIndex
          ? {
              ...t,
              captainId: t.captainId ?? player.id,
              players: [...t.players, player],
            }
          : t
      )
      updatedTeams = next
      return next
    })
    setAvailablePlayers((prev) => {
      const remaining = prev.filter((p) => p.id !== playerId)
      const { numActiveTeams, remainder } = splitPlan(participants.length, playersPerTeam)
      const hasReserveTeam = updatedTeams.length > numActiveTeams

      if (hasReserveTeam && remainder > 0 && remaining.length === remainder) {
        // Every active team is now full. Whoever is left over goes straight
        // into the reserve team — they never get an active turn to "pick".
        setTeams((prevTeams) => {
          const reserveIndex = prevTeams.length - 1
          const reserveTeam = prevTeams[reserveIndex]
          if (!reserveTeam) return prevTeams
          const toAdd = remaining.filter(
            (p) => !reserveTeam.players.some((rp) => rp.id === p.id)
          )
          if (toAdd.length === 0) return prevTeams
          return prevTeams.map((t, i) =>
            i === reserveIndex
              ? {
                  ...t,
                  captainId: t.captainId ?? toAdd[0]!.id,
                  players: [...t.players, ...toAdd],
                }
              : t
          )
        })
        setPhase("done")
        return []
      }

      if (remaining.length === 0) {
        setPhase("done")
      } else {
        setCurrentTeamIndex(
          nextActiveTeamIndex(updatedTeams, currentTeamIndex, numActiveTeams, playersPerTeam)
        )
      }
      return remaining
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
    const numTeams =
      participants.length > 0 && playersPerTeam > 0
        ? Math.ceil(participants.length / playersPerTeam)
        : teams.length
    setTeams(emptyTeams(numTeams))
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
    playersPerTeam,
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

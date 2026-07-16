import { useCallback, useEffect, useState } from "react"
import type { Player } from "@pelafut/shared"
import { supabase } from "@/lib/supabaseClient"
import { colorForIndex } from "@/features/teams/teamColors"

export interface FormationTeam {
  name: string
  color: string
  players: Player[]
}

function buildInitialFormation(participants: Player[], playersPerTeam: number): FormationTeam[] {
  if (participants.length === 0 || playersPerTeam <= 0) return []
  const numTeams = Math.ceil(participants.length / playersPerTeam)
  const teams: FormationTeam[] = Array.from({ length: numTeams }, (_, i) => ({
    name: `Time ${colorForIndex(i).name}`,
    color: colorForIndex(i).hex,
    players: [],
  }))
  participants.forEach((player, idx) => {
    teams[idx % numTeams]!.players.push(player)
  })
  return teams
}

export function useTeamFormation(matchId: string) {
  const [teams, setTeams] = useState<FormationTeam[]>([])
  const [playersPerTeam, setPlayersPerTeam] = useState(0)
  const [alreadyFormed, setAlreadyFormed] = useState(false)
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

    const { data: existingTeams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, color, position, team_players(player_id, players(*))")
      .eq("match_id", matchId)
      .order("position")

    if (teamsError) {
      setError(teamsError.message)
      setLoading(false)
      return
    }

    if (existingTeams && existingTeams.length > 0) {
      setAlreadyFormed(true)
      setTeams(
        existingTeams.map((t) => ({
          name: t.name,
          color: t.color,
          players: (t.team_players as unknown as { players: Player }[]).map((tp) => tp.players),
        }))
      )
      setLoading(false)
      return
    }

    setAlreadyFormed(false)
    const { data: matchPlayers, error: mpError } = await supabase
      .from("match_players")
      .select("players(*)")
      .eq("match_id", matchId)
    if (mpError) {
      setError(mpError.message)
      setLoading(false)
      return
    }
    const participants = ((matchPlayers ?? []) as unknown as { players: Player }[]).map(
      (r) => r.players
    )
    setTeams(buildInitialFormation(participants, match.players_per_team))
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    load()
  }, [load])

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
      return next
    })
  }

  function regenerate(participants: Player[]) {
    setTeams(buildInitialFormation(participants, playersPerTeam))
  }

  async function save() {
    setSaving(true)
    setError(null)

    await supabase.from("teams").delete().eq("match_id", matchId)

    const { data: insertedTeams, error: insertTeamsError } = await supabase
      .from("teams")
      .insert(
        teams.map((t, i) => ({ match_id: matchId, name: t.name, color: t.color, position: i }))
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

  return { teams, loading, saving, error, alreadyFormed, movePlayer, regenerate, save, reload: load }
}

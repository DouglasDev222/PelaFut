import { useCallback, useEffect, useState } from "react"
import type { Player } from "@pelafut/shared"
import { supabase } from "@/lib/supabaseClient"
import { fetchStatsRawData, type StatsRound, type StatsTeam } from "@/features/stats/fetchRaw"
import type { GoalLite, ParticipantLite } from "@/features/stats/aggregate"

/**
 * All rounds of a pelada with their goals, for the history/edit screen.
 *
 * Only the goal's *authorship* can be changed — never the score or the result.
 * Adding or removing a goal after the fact would change who won that round,
 * and the queue order and standings were already decided by it.
 */
export function useMatchRounds(matchId: string) {
  const [rounds, setRounds] = useState<StatsRound[]>([])
  const [goals, setGoals] = useState<GoalLite[]>([])
  const [teams, setTeams] = useState<StatsTeam[]>([])
  const [participants, setParticipants] = useState<ParticipantLite[]>([])
  const [playersById, setPlayersById] = useState<Map<string, Player>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await fetchStatsRawData(matchId)
    if (fetchError || !data) {
      setError(fetchError ?? "Erro ao carregar os jogos")
      setLoading(false)
      return
    }
    setRounds(data.statsRounds)
    setGoals(data.goals)
    setTeams(data.teams)
    setParticipants(data.participants)
    setPlayersById(data.playersById)
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    load()
  }, [load])

  /** Players who were on court for `teamId` in `roundId` (roster + borrowed). */
  function squadFor(roundId: string, teamId: string): Player[] {
    return participants
      .filter((p) => p.roundId === roundId && p.teamId === teamId)
      .flatMap((p) => {
        const player = playersById.get(p.playerId)
        return player ? [player] : []
      })
  }

  async function updateGoalAuthorship(
    goalId: string,
    playerId: string | null,
    assistPlayerId: string | null
  ) {
    setError(null)
    // An own goal / unassigned goal can't carry an assist.
    const effectiveAssist = playerId ? assistPlayerId : null
    const { error: updateError } = await supabase
      .from("match_round_goals")
      .update({ player_id: playerId, assist_player_id: effectiveAssist })
      .eq("id", goalId)
    if (updateError) {
      setError(updateError.message)
      return { error: updateError.message }
    }
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, playerId, assistPlayerId: effectiveAssist } : g
      )
    )
    return { error: null }
  }

  return {
    rounds,
    goals,
    teams,
    playersById,
    squadFor,
    updateGoalAuthorship,
    loading,
    error,
    reload: load,
  }
}

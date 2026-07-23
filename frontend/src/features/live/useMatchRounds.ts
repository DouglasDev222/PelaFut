import { useCallback, useEffect, useState } from "react"
import type { Player, RoundResult } from "@pelafut/shared"
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

  /**
   * Manually finishes a round that got stuck "in progress" — e.g. a game that
   * was really played but never ended, or one left dangling. Just marks it
   * finished with the given result so it counts in the standings/stats; it does
   * NOT rotate the queue (this is a cleanup, not a live turn). `finished_at` is
   * only stamped if it's still empty, to preserve the original time when known.
   */
  async function closeRound(roundId: string, result: RoundResult) {
    setError(null)
    const { error: updateError } = await supabase
      .from("match_rounds")
      .update({
        status: "finished",
        result,
        decided_by: "regulation",
        finished_at: new Date().toISOString(),
      })
      .eq("id", roundId)
    if (updateError) {
      setError(updateError.message)
      return { error: updateError.message }
    }
    await load()
    return { error: null }
  }

  /**
   * Deletes a round entirely — for a phantom game that never happened (the fresh
   * "next game" left over when a pelada is closed). Removes its goals, borrows
   * and penalty kicks first, then the round.
   */
  async function deleteRound(roundId: string) {
    setError(null)
    await supabase.from("match_round_penalty_kicks").delete().eq("round_id", roundId)
    await supabase.from("match_round_borrowed_players").delete().eq("round_id", roundId)
    await supabase.from("match_round_goals").delete().eq("round_id", roundId)
    const { error: deleteError } = await supabase.from("match_rounds").delete().eq("id", roundId)
    if (deleteError) {
      setError(deleteError.message)
      return { error: deleteError.message }
    }
    await load()
    return { error: null }
  }

  return {
    rounds,
    goals,
    teams,
    playersById,
    squadFor,
    updateGoalAuthorship,
    closeRound,
    deleteRound,
    loading,
    error,
    reload: load,
  }
}

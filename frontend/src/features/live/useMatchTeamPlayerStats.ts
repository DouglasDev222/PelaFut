import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { computeTeamPlayerStats, type GoalLite, type ParticipantLite, type RoundLite } from "@/features/stats/aggregate"

/** Per-player goals/assists for one team, keyed by player id. */
export type TeamPlayerTotals = Record<string, { goals: number; assists: number }>

/**
 * Live goals + assists per player, grouped by team, for the current pelada.
 *
 * Feeds the small "⚽2 🅰️1" badges on the waiting cards, so the organizer sees
 * how each team's players are doing without leaving the ao vivo. Refetches when
 * `refreshKey` (the current round id) changes, so the numbers follow the games
 * as they end. Only the goals matter here — no borrowed-players query — because
 * a goal row already carries the team it was scored for.
 */
export function useMatchTeamPlayerStats(
  matchId: string,
  refreshKey?: string | null
): Record<string, TeamPlayerTotals> {
  const [byTeam, setByTeam] = useState<Record<string, TeamPlayerTotals>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: roundRows } = await supabase
        .from("match_rounds")
        .select("id, home_team_id, away_team_id, result, status")
        .eq("match_id", matchId)
        .eq("status", "finished")
      const rounds: RoundLite[] = (roundRows ?? []).map((r) => ({
        id: r.id as string,
        homeTeamId: r.home_team_id as string,
        awayTeamId: r.away_team_id as string,
        result: r.result as RoundLite["result"],
        status: r.status as RoundLite["status"],
      }))
      if (rounds.length === 0) {
        if (!cancelled) setByTeam({})
        return
      }
      const roundIds = rounds.map((r) => r.id)
      const { data: goalRows } = await supabase
        .from("match_round_goals")
        .select("id, round_id, team_id, player_id, assist_player_id, created_at")
        .in("round_id", roundIds)
      if (cancelled) return
      const goals: GoalLite[] = (goalRows ?? []).map((g) => ({
        id: g.id as string,
        roundId: g.round_id as string,
        teamId: g.team_id as string,
        playerId: g.player_id as string | null,
        assistPlayerId: g.assist_player_id as string | null,
        createdAt: (g.created_at as string) ?? "",
      }))
      // Only scorers/assisters need a line here (the badges hide zeros), so the
      // goal rows alone are enough — no roster query for empty participants.
      const participants: ParticipantLite[] = []
      const stats = computeTeamPlayerStats(rounds, goals, participants)
      const next: Record<string, TeamPlayerTotals> = {}
      for (const team of stats) {
        const totals: TeamPlayerTotals = {}
        for (const p of team.players) totals[p.playerId] = { goals: p.goals, assists: p.assists }
        next[team.teamId] = totals
      }
      setByTeam(next)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [matchId, refreshKey])

  return byTeam
}

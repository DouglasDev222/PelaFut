import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

/**
 * How many finished games each team has already played, by team id.
 *
 * Not a rule the app enforces — it's what makes "who has been waiting the
 * longest" visible, both in the waiting list and when manually editing the
 * queue. Fairness stays the organizer's call; this just stops it from being
 * guesswork.
 *
 * @param enabled skips the query entirely while false (a closed dialog).
 * @param refreshKey refetch when this changes — pass the current round id so
 *   the counts follow the rotation instead of freezing at mount.
 */
export function useGamesPlayed(
  matchId: string,
  enabled = true,
  refreshKey?: string | null
): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    async function loadCounts() {
      const { data } = await supabase
        .from("match_rounds")
        .select("home_team_id, away_team_id")
        .eq("match_id", matchId)
        .eq("status", "finished")
      if (cancelled) return
      const next: Record<string, number> = {}
      for (const row of (data ?? []) as { home_team_id: string; away_team_id: string }[]) {
        next[row.home_team_id] = (next[row.home_team_id] ?? 0) + 1
        next[row.away_team_id] = (next[row.away_team_id] ?? 0) + 1
      }
      setCounts(next)
    }
    loadCounts()
    return () => {
      cancelled = true
    }
  }, [matchId, enabled, refreshKey])

  return counts
}

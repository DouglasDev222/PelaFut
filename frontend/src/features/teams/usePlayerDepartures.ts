import { useCallback, useEffect, useState } from "react"
import type { Player } from "@pelafut/shared"
import { supabase } from "@/lib/supabaseClient"

export interface DepartureTeam {
  id: string
  number: number
  color: string
  players: Player[]
}

/**
 * Manages "who left the pelada" for the teams screen, independent of the
 * formation save() (which rewrites team_players and would rewrite past stats).
 *
 * A departure is recorded as `from_sequence = (largest round sequence so far) +
 * 1`, so it takes effect from the team's next game — the current game keeps its
 * result. Marking someone as returned simply deletes the row.
 */
export function usePlayerDepartures(matchId: string) {
  const [teams, setTeams] = useState<DepartureTeam[]>([])
  const [departedIds, setDepartedIds] = useState<Set<string>>(new Set())
  const [nextSequence, setNextSequence] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, position, color, team_players(player_id, players(*))")
      .eq("match_id", matchId)
      .order("position")
    if (teamsError) {
      setError(teamsError.message)
      setLoading(false)
      return
    }
    setTeams(
      (teamsData ?? []).map((t) => ({
        id: t.id as string,
        number: (t.position as number) + 1,
        color: t.color as string,
        players: (t.team_players as unknown as { players: Player }[]).map((tp) => tp.players),
      }))
    )

    const [{ data: roundRows }, { data: departureRows, error: departuresError }] = await Promise.all([
      supabase
        .from("match_rounds")
        .select("sequence")
        .eq("match_id", matchId)
        .order("sequence", { ascending: false })
        .limit(1),
      supabase.from("match_player_departures").select("player_id").eq("match_id", matchId),
    ])
    if (departuresError) {
      setError(departuresError.message)
      setLoading(false)
      return
    }
    setNextSequence(((roundRows?.[0]?.sequence as number | undefined) ?? 0) + 1)
    setDepartedIds(new Set((departureRows ?? []).map((d) => d.player_id as string)))
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    load()
  }, [load])

  async function markLeft(playerId: string, teamId: string) {
    setError(null)
    const { error: insertError } = await supabase.from("match_player_departures").insert({
      match_id: matchId,
      player_id: playerId,
      team_id: teamId,
      from_sequence: nextSequence,
    })
    if (insertError) {
      setError(insertError.message)
      return { error: insertError.message }
    }
    setDepartedIds((prev) => new Set(prev).add(playerId))
    return { error: null }
  }

  async function markReturned(playerId: string) {
    setError(null)
    const { error: deleteError } = await supabase
      .from("match_player_departures")
      .delete()
      .eq("match_id", matchId)
      .eq("player_id", playerId)
    if (deleteError) {
      setError(deleteError.message)
      return { error: deleteError.message }
    }
    setDepartedIds((prev) => {
      const next = new Set(prev)
      next.delete(playerId)
      return next
    })
    return { error: null }
  }

  return { teams, departedIds, loading, error, markLeft, markReturned, reload: load }
}

/**
 * Just the set of players marked as "saiu" for a match — a lightweight read for
 * screens that only need to flag them (e.g. the formation board), without the
 * full departures management. Empty unless `enabled`.
 */
export function useDepartedPlayerIds(matchId: string, enabled: boolean): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled || !matchId) {
      setIds(new Set())
      return
    }
    let cancelled = false
    supabase
      .from("match_player_departures")
      .select("player_id")
      .eq("match_id", matchId)
      .then(({ data }) => {
        if (!cancelled) setIds(new Set((data ?? []).map((d) => d.player_id as string)))
      })
    return () => {
      cancelled = true
    }
  }, [matchId, enabled])

  return ids
}

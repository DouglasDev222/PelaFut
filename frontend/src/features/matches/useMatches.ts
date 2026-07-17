import { useCallback, useEffect, useState } from "react"
import type { Match, MatchInput } from "@pelafut/shared"
import { useAuth } from "@/features/auth/AuthProvider"
import { supabase } from "@/lib/supabaseClient"

export function useMatches() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      setMatches(data as Match[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    reload()
  }, [reload])

  async function createMatch(input: MatchInput) {
    if (!user) return { error: "Não autenticado", id: null as string | null }
    const { data, error } = await supabase
      .from("matches")
      .insert({ ...input, owner_id: user.id })
      .select("id")
      .single()
    if (!error) await reload()
    return { error: error?.message ?? null, id: (data?.id as string) ?? null }
  }

  async function updateMatch(id: string, input: MatchInput) {
    const { error } = await supabase.from("matches").update(input).eq("id", id)
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  async function deleteMatch(id: string) {
    const { error } = await supabase.from("matches").delete().eq("id", id)
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  /**
   * Wipes game history (rounds, goals, assists, borrowed players, penalty
   * kicks) and resets the queue, but keeps the roster and team formation
   * intact — for "same pelada, start over".
   */
  async function clearMatchData(id: string) {
    const { data: roundRows, error: roundsError } = await supabase
      .from("match_rounds")
      .select("id")
      .eq("match_id", id)
    if (roundsError) return { error: roundsError.message }
    const roundIds = (roundRows ?? []).map((r) => r.id as string)

    if (roundIds.length > 0) {
      const [{ error: goalsError }, { error: borrowedError }, { error: penaltyError }] = await Promise.all([
        supabase.from("match_round_goals").delete().in("round_id", roundIds),
        supabase.from("match_round_borrowed_players").delete().in("round_id", roundIds),
        supabase.from("match_round_penalty_kicks").delete().in("round_id", roundIds),
      ])
      if (goalsError || borrowedError || penaltyError) {
        return { error: goalsError?.message ?? borrowedError?.message ?? penaltyError?.message ?? "Erro ao limpar dados" }
      }
    }

    const { error: deleteError } = await supabase.from("match_rounds").delete().eq("match_id", id)
    if (deleteError) return { error: deleteError.message }

    const { error: queueError } = await supabase.from("teams").update({ queue_position: null }).eq("match_id", id)
    if (queueError) return { error: queueError.message }

    const { data: matchData, error: fetchError } = await supabase
      .from("matches")
      .select("status")
      .eq("id", id)
      .single()
    if (fetchError) return { error: fetchError.message }

    if (matchData.status === "in_progress" || matchData.status === "finished") {
      const { error: statusError } = await supabase
        .from("matches")
        .update({ status: "teams_formed" })
        .eq("id", id)
      if (statusError) return { error: statusError.message }
    }

    await reload()
    return { error: null }
  }

  return { matches, loading, error, reload, createMatch, updateMatch, deleteMatch, clearMatchData }
}

export async function fetchMatch(id: string) {
  const { data, error } = await supabase.from("matches").select("*").eq("id", id).single()
  return { match: data as Match | null, error: error?.message ?? null }
}

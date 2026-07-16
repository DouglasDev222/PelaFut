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

  return { matches, loading, error, reload, createMatch, updateMatch, deleteMatch }
}

export async function fetchMatch(id: string) {
  const { data, error } = await supabase.from("matches").select("*").eq("id", id).single()
  return { match: data as Match | null, error: error?.message ?? null }
}

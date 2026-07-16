import { useCallback, useEffect, useState } from "react"
import type { Player, PlayerInput } from "@pelafut/shared"
import { useAuth } from "@/features/auth/AuthProvider"
import { supabase } from "@/lib/supabaseClient"

export function usePlayers() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("name", { ascending: true })
    if (error) {
      setError(error.message)
    } else {
      setPlayers(data as Player[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    reload()
  }, [reload])

  async function createPlayer(input: PlayerInput) {
    if (!user) return { error: "Não autenticado" }
    const { error } = await supabase
      .from("players")
      .insert({ ...input, owner_id: user.id })
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  async function updatePlayer(id: string, input: PlayerInput) {
    const { error } = await supabase.from("players").update(input).eq("id", id)
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  async function deletePlayer(id: string) {
    const { error } = await supabase.from("players").delete().eq("id", id)
    if (!error) await reload()
    return { error: error?.message ?? null }
  }

  return { players, loading, error, reload, createPlayer, updatePlayer, deletePlayer }
}

export async function fetchPlayer(id: string) {
  const { data, error } = await supabase.from("players").select("*").eq("id", id).single()
  return { player: data as Player | null, error: error?.message ?? null }
}

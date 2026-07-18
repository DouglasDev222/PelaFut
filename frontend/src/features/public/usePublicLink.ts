import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/features/auth/AuthProvider"
import { supabase } from "@/lib/supabaseClient"

/**
 * The account's public page state, for building shareable links. `enabled` is
 * false until the organizer turns the page on in /profile — the share UI uses
 * it to explain instead of silently producing a dead link.
 */
export function usePublicLink() {
  const { user } = useAuth()
  const [code, setCode] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from("profiles")
      .select("public_code, public_stats_enabled")
      .eq("id", user.id)
      .single()
    setCode((data?.public_code as string | null) ?? null)
    setEnabled(Boolean(data?.public_stats_enabled))
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const origin = typeof window === "undefined" ? "" : window.location.origin
  /** Public URL of one pelada, or null when there's no code yet. */
  const matchUrl = useCallback(
    (matchId: string) => (code ? `${origin}/pelada/${code}/jogo/${matchId}` : null),
    [code, origin]
  )
  const homeUrl = code ? `${origin}/pelada/${code}` : null

  return { code, enabled, loading, matchUrl, homeUrl, reload: load }
}

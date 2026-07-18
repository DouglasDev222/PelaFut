import { useCallback, useEffect, useMemo, useState } from "react"
import { fetchPublicStats, fetchPublicSummary } from "@/features/public/fetchPublicStats"
import type { PublicAccountSummary, PublicStatsData } from "@/features/public/publicMapping"
import { computeAccountPlayerStats, type AccountPlayerLine } from "@/features/stats/aggregate"
import type { AccountStatRow } from "@/features/stats/useAccountStats"

/** Public home: title + finished peladas. `notFound` covers both an unknown
 * code and a page that's turned off — deliberately indistinguishable. */
export function usePublicAccount(codigo: string) {
  const [summary, setSummary] = useState<PublicAccountSummary | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await fetchPublicSummary(codigo)
    if (fetchError) setError(fetchError)
    setNotFound(!fetchError && data == null)
    setSummary(data)
    setLoading(false)
  }, [codigo])

  useEffect(() => {
    load()
  }, [load])

  return { summary, notFound, loading, error, reload: load }
}

/**
 * Public stats payload. Pass `jogoId` to scope to a single pelada (the
 * shareable link), or omit it for the whole account.
 */
export function usePublicStats(codigo: string, jogoId?: string) {
  const [data, setData] = useState<PublicStatsData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: payload, error: fetchError } = await fetchPublicStats(codigo, jogoId)
    if (fetchError) setError(fetchError)
    setNotFound(!fetchError && payload == null)
    setData(payload)
    setLoading(false)
  }, [codigo, jogoId])

  useEffect(() => {
    load()
  }, [load])

  /** Career lines per player, ready for the ranking screens. */
  const rows = useMemo<AccountStatRow[]>(() => {
    if (!data) return []
    const roundToMatch = new Map(data.statsRounds.map((r) => [r.id, r.matchId]))
    const lines = computeAccountPlayerStats(
      data.rounds,
      data.goals,
      data.participants,
      roundToMatch
    )
    const byId = new Map<string, AccountPlayerLine>(lines.map((l) => [l.playerId, l]))
    // Only players present in the public payload — i.e. those who actually
    // played. Peladeiros who never played are simply not published.
    return [...data.playersById.values()].flatMap((player) => {
      const line = byId.get(player.id)
      return line ? [{ ...line, player }] : []
    })
  }, [data])

  const matchesCount = data?.matches.length ?? 0

  return { data, rows, matchesCount, notFound, loading, error, reload: load }
}

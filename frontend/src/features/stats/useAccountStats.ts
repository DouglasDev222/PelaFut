import { useCallback, useEffect, useMemo, useState } from "react"
import type { Player } from "@pelafut/shared"
import { usePlayers } from "@/features/players/usePlayers"
import { computeAccountPlayerStats, type AccountPlayerLine } from "@/features/stats/aggregate"
import { fetchStatsRawData } from "@/features/stats/fetchRaw"

export interface AccountStatRow extends AccountPlayerLine {
  player: Player
}

function emptyLine(playerId: string): AccountPlayerLine {
  return {
    playerId,
    roundsPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals: 0,
    assists: 0,
    matchesPlayed: 0,
    participations: 0,
    pointsPct: 0,
    goalsPerGame: 0,
  }
}

/**
 * Career stats for every player on the account, across all peladas.
 *
 * `fetchStatsRawData()` with no matchId pulls every pelada the owner has (RLS
 * scopes it to them). The result is merged with `usePlayers()` so peladeiros who
 * never played still show up — zeroed — instead of vanishing from the list and
 * from the search.
 */
export function useAccountStats() {
  const { players, loading: playersLoading, error: playersError } = usePlayers()
  const [lines, setLines] = useState<AccountPlayerLine[]>([])
  const [matchesCount, setMatchesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await fetchStatsRawData()
    if (fetchError || !data) {
      setError(fetchError ?? "Erro ao carregar estatísticas")
      setLoading(false)
      return
    }

    const roundToMatch = new Map(data.statsRounds.map((r) => [r.id, r.matchId]))
    setLines(computeAccountPlayerStats(data.rounds, data.goals, data.participants, roundToMatch))
    setMatchesCount(new Set(data.statsRounds.map((r) => r.matchId)).size)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo<AccountStatRow[]>(() => {
    const byId = new Map(lines.map((l) => [l.playerId, l]))
    return players.map((player) => ({ ...(byId.get(player.id) ?? emptyLine(player.id)), player }))
  }, [players, lines])

  return {
    rows,
    matchesCount,
    loading: loading || playersLoading,
    error: error ?? playersError,
    reload: load,
  }
}

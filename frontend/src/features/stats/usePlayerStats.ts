import { useCallback, useEffect, useState } from "react"
import type { Player } from "@pelafut/shared"
import { supabase } from "@/lib/supabaseClient"
import { computePlayerStats, type PlayerStatLine } from "@/features/stats/aggregate"
import { fetchStatsRawData } from "@/features/stats/fetchRaw"

export interface MatchContribution {
  matchId: string
  matchName: string
  matchDate: string
  stats: PlayerStatLine
}

function emptyLine(playerId: string): PlayerStatLine {
  return { playerId, roundsPlayed: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0 }
}

export function usePlayerStats(playerId: string) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [overall, setOverall] = useState<PlayerStatLine>(emptyLine(playerId))
  const [byMatch, setByMatch] = useState<MatchContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .single()
    if (playerError || !playerData) {
      setError(playerError?.message ?? "Peladeiro não encontrado")
      setLoading(false)
      return
    }
    setPlayer(playerData as Player)

    const { data, error: fetchError } = await fetchStatsRawData()
    if (fetchError || !data) {
      setError(fetchError ?? "Erro ao carregar estatísticas")
      setLoading(false)
      return
    }

    const allStats = computePlayerStats(data.rounds, data.goals, data.participants)
    setOverall(allStats.find((s) => s.playerId === playerId) ?? emptyLine(playerId))

    const matchIds = new Set(
      data.statsRounds
        .filter((r) => data.participants.some((p) => p.roundId === r.id && p.playerId === playerId))
        .map((r) => r.matchId)
    )
    if (matchIds.size === 0) {
      setByMatch([])
      setLoading(false)
      return
    }

    const { data: matchRows, error: matchesError } = await supabase
      .from("matches")
      .select("id, name, match_date")
      .in("id", [...matchIds])
    if (matchesError) {
      setError(matchesError.message)
      setLoading(false)
      return
    }

    const contributions: MatchContribution[] = (matchRows ?? [])
      .map((m) => {
        const matchIdValue = m.id as string
        const scopedRoundIds = new Set(
          data.statsRounds.filter((r) => r.matchId === matchIdValue).map((r) => r.id)
        )
        const scopedRounds = data.rounds.filter((r) => scopedRoundIds.has(r.id))
        const scopedGoals = data.goals.filter((g) => scopedRoundIds.has(g.roundId))
        const scopedParticipants = data.participants.filter((p) => scopedRoundIds.has(p.roundId))
        const stats =
          computePlayerStats(scopedRounds, scopedGoals, scopedParticipants).find(
            (s) => s.playerId === playerId
          ) ?? emptyLine(playerId)
        return {
          matchId: matchIdValue,
          matchName: m.name as string,
          matchDate: m.match_date as string,
          stats,
        }
      })
      .sort((a, b) => a.matchDate.localeCompare(b.matchDate))

    setByMatch(contributions)
    setLoading(false)
  }, [playerId])

  useEffect(() => {
    load()
  }, [load])

  return { player, overall, byMatch, loading, error, reload: load }
}

import { useCallback, useEffect, useState } from "react"
import type { Match, Player } from "@pelafut/shared"
import { supabase } from "@/lib/supabaseClient"
import { computePlayerStats, type GoalLite, type ParticipantLite, type PlayerStatLine } from "@/features/stats/aggregate"
import { fetchStatsRawData, type StatsRound, type StatsTeam } from "@/features/stats/fetchRaw"

export function useMatchStats(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null)
  const [teams, setTeams] = useState<StatsTeam[]>([])
  const [rounds, setRounds] = useState<StatsRound[]>([])
  const [participants, setParticipants] = useState<ParticipantLite[]>([])
  const [goals, setGoals] = useState<GoalLite[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStatLine[]>([])
  const [playersById, setPlayersById] = useState<Map<string, Player>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single()
    if (matchError || !matchData) {
      setError(matchError?.message ?? "Pelada não encontrada")
      setLoading(false)
      return
    }
    setMatch(matchData as Match)

    const { data, error: fetchError } = await fetchStatsRawData(matchId)
    if (fetchError || !data) {
      setError(fetchError ?? "Erro ao carregar estatísticas")
      setLoading(false)
      return
    }

    setTeams(data.teams)
    setRounds(data.statsRounds)
    setParticipants(data.participants)
    setGoals(data.goals)
    setPlayerStats(computePlayerStats(data.rounds, data.goals, data.participants))
    setPlayersById(data.playersById)
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    load()
  }, [load])

  return { match, teams, rounds, participants, goals, playerStats, playersById, loading, error, reload: load }
}

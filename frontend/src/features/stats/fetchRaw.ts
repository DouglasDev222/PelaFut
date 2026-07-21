import type { Player, RoundDecidedBy, RoundResult, RoundStatus } from "@pelafut/shared"
import { supabase } from "@/lib/supabaseClient"
import type { GoalLite, ParticipantLite, RoundLite } from "@/features/stats/aggregate"
import { departureKey, isPresent, type DepartureMap } from "@/features/live/departures"

export interface StatsTeam {
  id: string
  matchId: string
  number: number
  color: string
}

export interface StatsRound extends RoundLite {
  matchId: string
  sequence: number
  decidedBy: RoundDecidedBy | null
  homeScore: number
  awayScore: number
}

export interface RawStatsData {
  rounds: RoundLite[]
  statsRounds: StatsRound[]
  goals: GoalLite[]
  participants: ParticipantLite[]
  playersById: Map<string, Player>
  teams: StatsTeam[]
}

/**
 * Shared raw-data fetch for both the per-match and per-player stats screens.
 * Pass `matchId` to scope everything to one pelada; omit it to pull every
 * match the signed-in owner has (RLS already restricts this to their own
 * data) for a career-wide player profile.
 */
export async function fetchStatsRawData(
  matchId?: string
): Promise<{ data: RawStatsData | null; error: string | null }> {
  let teamsQuery = supabase
    .from("teams")
    .select("id, match_id, position, color, team_players(player_id, players(*))")
    .order("position")
  if (matchId) teamsQuery = teamsQuery.eq("match_id", matchId)
  const { data: teamsData, error: teamsError } = await teamsQuery
  if (teamsError) return { data: null, error: teamsError.message }

  const playersById = new Map<string, Player>()
  const rosterByTeam = new Map<string, string[]>()
  const teams: StatsTeam[] = []
  const teamNumberByMatch = new Map<string, number>()
  for (const t of teamsData ?? []) {
    const matchIdForTeam = t.match_id as string
    const number = (teamNumberByMatch.get(matchIdForTeam) ?? 0) + 1
    teamNumberByMatch.set(matchIdForTeam, number)
    teams.push({ id: t.id as string, matchId: matchIdForTeam, number, color: t.color as string })

    const ids: string[] = []
    for (const tp of t.team_players as unknown as { players: Player }[]) {
      playersById.set(tp.players.id, tp.players)
      ids.push(tp.players.id)
    }
    rosterByTeam.set(t.id as string, ids)
  }

  let roundsQuery = supabase.from("match_rounds").select("*").order("sequence")
  if (matchId) roundsQuery = roundsQuery.eq("match_id", matchId)
  const { data: roundRows, error: roundsError } = await roundsQuery
  if (roundsError) return { data: null, error: roundsError.message }

  const roundIds = (roundRows ?? []).map((r) => r.id as string)
  const [{ data: goalRows, error: goalsError }, { data: borrowedRows, error: borrowedError }] =
    roundIds.length > 0
      ? await Promise.all([
          supabase.from("match_round_goals").select("*").in("round_id", roundIds).order("created_at"),
          supabase.from("match_round_borrowed_players").select("*").in("round_id", roundIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }]
  if (goalsError || borrowedError) {
    return { data: null, error: goalsError?.message ?? borrowedError?.message ?? "Erro ao carregar dados" }
  }

  // Players who left partway through: absent from `from_sequence` onward, so
  // they drop out of later rounds' participants (but keep the earlier ones).
  let departuresQuery = supabase.from("match_player_departures").select("match_id, player_id, from_sequence")
  if (matchId) departuresQuery = departuresQuery.eq("match_id", matchId)
  const { data: departureRows, error: departuresError } = await departuresQuery
  if (departuresError) return { data: null, error: departuresError.message }
  const departures: DepartureMap = new Map(
    (departureRows ?? []).map((d) => [
      departureKey(d.match_id as string, d.player_id as string),
      d.from_sequence as number,
    ])
  )

  const rounds: RoundLite[] = (roundRows ?? []).map((r) => ({
    id: r.id as string,
    homeTeamId: r.home_team_id as string,
    awayTeamId: r.away_team_id as string,
    result: r.result as RoundResult | null,
    status: r.status as RoundStatus,
  }))

  const goals: GoalLite[] = (goalRows ?? []).map((g) => ({
    id: g.id as string,
    roundId: g.round_id as string,
    teamId: g.team_id as string,
    playerId: g.player_id as string | null,
    assistPlayerId: g.assist_player_id as string | null,
    createdAt: g.created_at as string,
  }))

  const participants: ParticipantLite[] = []
  for (const r of roundRows ?? []) {
    const matchIdForRound = r.match_id as string
    const sequence = r.sequence as number
    for (const teamId of [r.home_team_id, r.away_team_id] as string[]) {
      for (const playerId of rosterByTeam.get(teamId) ?? []) {
        if (!isPresent(departures, matchIdForRound, playerId, sequence)) continue
        participants.push({ roundId: r.id as string, teamId, playerId })
      }
    }
  }
  for (const b of borrowedRows ?? []) {
    participants.push({
      roundId: b.round_id as string,
      teamId: b.team_id as string,
      playerId: b.player_id as string,
    })
  }

  const statsRounds: StatsRound[] = (roundRows ?? []).map((r) => {
    const homeScore = (goalRows ?? []).filter(
      (g) => g.round_id === r.id && g.team_id === r.home_team_id
    ).length
    const awayScore = (goalRows ?? []).filter(
      (g) => g.round_id === r.id && g.team_id === r.away_team_id
    ).length
    return {
      id: r.id as string,
      matchId: r.match_id as string,
      sequence: r.sequence as number,
      homeTeamId: r.home_team_id as string,
      awayTeamId: r.away_team_id as string,
      result: r.result as RoundResult | null,
      status: r.status as RoundStatus,
      decidedBy: r.decided_by as RoundDecidedBy | null,
      homeScore,
      awayScore,
    }
  })

  return { data: { rounds, statsRounds, goals, participants, playersById, teams }, error: null }
}

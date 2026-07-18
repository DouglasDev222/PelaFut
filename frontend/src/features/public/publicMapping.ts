import type { Player, RoundDecidedBy, RoundResult, RoundStatus } from "@pelafut/shared"
import {
  computeAccountPlayerStats,
  computePlayerStats,
  type AccountPlayerLine,
  type GoalLite,
  type ParticipantLite,
  type RoundLite,
} from "@/features/stats/aggregate"
import type { RawStatsData, StatsRound, StatsTeam } from "@/features/stats/fetchRaw"
import type { MatchContribution } from "@/features/stats/usePlayerStats"

/** A finished pelada as listed on the public home. */
export interface PublicMatchSummary {
  id: string
  nome: string
  data: string
  local: string | null
  jogos: number
  gols: number
}

export interface PublicAccountSummary {
  titulo: string | null
  peladas: PublicMatchSummary[]
}

export interface PublicStatsData extends RawStatsData {
  titulo: string | null
  /** Finished peladas in the payload — used to label per-pelada breakdowns. */
  matches: { id: string; nome: string; data: string }[]
}

/** Shape returned by the `pelada_publica_dados` RPC. */
export interface PublicRawPayload {
  titulo: string | null
  peladas: { id: string; nome: string; data: string }[]
  teams: {
    id: string
    match_id: string
    position: number
    color: string
    player_ids: string[]
  }[]
  rounds: {
    id: string
    match_id: string
    sequence: number
    home_team_id: string
    away_team_id: string
    status: string
    result: string | null
    decided_by: string | null
  }[]
  goals: {
    id: string
    round_id: string
    team_id: string
    player_id: string | null
    assist_player_id: string | null
    created_at: string
  }[]
  borrowed: { round_id: string; team_id: string; player_id: string }[]
  /** Only the public-safe columns — the RPC never sends the rest. */
  players: {
    id: string
    name: string
    nickname: string | null
    photo_url: string | null
    position: string
  }[]
}

/**
 * The public payload only carries the columns that are safe to publish, but the
 * aggregation functions are typed against the full `Player`. This fills the
 * private fields with neutral values so the shared code runs unchanged —
 * nothing on the public screens reads them.
 */
function toPlayer(p: PublicRawPayload["players"][number]): Player {
  return {
    id: p.id,
    owner_id: "",
    name: p.name,
    nickname: p.nickname,
    photo_url: p.photo_url,
    active: true,
    birth_date: null,
    position: p.position as Player["position"],
    skill_level: null,
    shirt_number: null,
    notes: null,
    created_at: "",
    updated_at: "",
  }
}

/**
 * Maps the RPC payload into exactly the structures `fetchStatsRawData` produces,
 * so every aggregation (`computePlayerStats`, `computeAccountPlayerStats`,
 * `computeTeamStandings`) is reused untouched on the public side.
 */
export function mapPublicPayload(raw: PublicRawPayload): PublicStatsData {
  const playersById = new Map<string, Player>()
  for (const p of raw.players) playersById.set(p.id, toPlayer(p))

  // Team numbers restart at 1 per pelada, in `position` order — same rule as
  // fetchStatsRawData.
  const numberByMatch = new Map<string, number>()
  const orderedTeams = [...raw.teams].sort(
    (a, b) => a.match_id.localeCompare(b.match_id) || a.position - b.position
  )
  const teams: StatsTeam[] = orderedTeams.map((t) => {
    const number = (numberByMatch.get(t.match_id) ?? 0) + 1
    numberByMatch.set(t.match_id, number)
    return { id: t.id, matchId: t.match_id, number, color: t.color }
  })

  const rosterByTeam = new Map<string, string[]>(
    raw.teams.map((t) => [t.id, t.player_ids ?? []])
  )

  const rounds: RoundLite[] = raw.rounds.map((r) => ({
    id: r.id,
    homeTeamId: r.home_team_id,
    awayTeamId: r.away_team_id,
    result: r.result as RoundResult | null,
    status: r.status as RoundStatus,
  }))

  const goals: GoalLite[] = raw.goals.map((g) => ({
    id: g.id,
    roundId: g.round_id,
    teamId: g.team_id,
    playerId: g.player_id,
    assistPlayerId: g.assist_player_id,
    createdAt: g.created_at,
  }))

  const participants: ParticipantLite[] = []
  for (const r of raw.rounds) {
    for (const teamId of [r.home_team_id, r.away_team_id]) {
      for (const playerId of rosterByTeam.get(teamId) ?? []) {
        participants.push({ roundId: r.id, teamId, playerId })
      }
    }
  }
  for (const b of raw.borrowed) {
    participants.push({ roundId: b.round_id, teamId: b.team_id, playerId: b.player_id })
  }

  const scoreFor = (roundId: string, teamId: string) =>
    raw.goals.filter((g) => g.round_id === roundId && g.team_id === teamId).length

  const statsRounds: StatsRound[] = raw.rounds.map((r) => ({
    id: r.id,
    matchId: r.match_id,
    sequence: r.sequence,
    homeTeamId: r.home_team_id,
    awayTeamId: r.away_team_id,
    result: r.result as RoundResult | null,
    status: r.status as RoundStatus,
    decidedBy: r.decided_by as RoundDecidedBy | null,
    homeScore: scoreFor(r.id, r.home_team_id),
    awayScore: scoreFor(r.id, r.away_team_id),
  }))

  return {
    titulo: raw.titulo,
    matches: raw.peladas ?? [],
    rounds,
    statsRounds,
    goals,
    participants,
    playersById,
    teams,
  }
}

function emptyOverall(playerId: string): AccountPlayerLine {
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
 * Builds the public profile of one player out of an account-wide payload:
 * career totals plus the per-pelada breakdown, mirroring what `usePlayerStats`
 * produces on the private side so `PlayerProfileView` can render either.
 */
export function publicPlayerProfile(data: PublicStatsData, playerId: string) {
  const player = data.playersById.get(playerId) ?? null
  const roundToMatch = new Map(data.statsRounds.map((r) => [r.id, r.matchId]))
  const overall =
    computeAccountPlayerStats(data.rounds, data.goals, data.participants, roundToMatch).find(
      (l) => l.playerId === playerId
    ) ?? emptyOverall(playerId)

  const byMatch: MatchContribution[] = data.matches
    .flatMap((m) => {
      const roundIds = new Set(
        data.statsRounds.filter((r) => r.matchId === m.id).map((r) => r.id)
      )
      const played = data.participants.some(
        (p) => roundIds.has(p.roundId) && p.playerId === playerId
      )
      if (!played) return []
      const stats = computePlayerStats(
        data.rounds.filter((r) => roundIds.has(r.id)),
        data.goals.filter((g) => roundIds.has(g.roundId)),
        data.participants.filter((p) => roundIds.has(p.roundId))
      ).find((s) => s.playerId === playerId)
      if (!stats) return []
      return [{ matchId: m.id, matchName: m.nome, matchDate: m.data, stats }]
    })
    .sort((a, b) => a.matchDate.localeCompare(b.matchDate))

  return { player, overall, byMatch }
}

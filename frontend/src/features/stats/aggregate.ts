import type { RoundResult, RoundStatus } from "@pelafut/shared"

export interface RoundLite {
  id: string
  homeTeamId: string
  awayTeamId: string
  result: RoundResult | null
  status: RoundStatus
}

export interface GoalLite {
  id: string
  roundId: string
  teamId: string
  playerId: string | null
  assistPlayerId: string | null
  createdAt: string
}

/** A player who was on court for `teamId` in `roundId` (own roster or borrowed that round). */
export interface ParticipantLite {
  roundId: string
  teamId: string
  playerId: string
}

export interface PlayerStatLine {
  playerId: string
  roundsPlayed: number
  wins: number
  draws: number
  losses: number
  goals: number
  assists: number
}

/** A finished round plus its score, which the standings need for goal difference. */
export interface RoundScoreLite extends RoundLite {
  homeScore: number
  awayScore: number
}

export interface TeamStandingLine {
  teamId: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

const WIN_POINTS = 3
const DRAW_POINTS = 1

function outcomeFor(round: RoundLite, teamId: string): "win" | "draw" | "loss" {
  if (round.result === "tie") return "draw"
  if (round.result === "home_win") return teamId === round.homeTeamId ? "win" : "loss"
  return teamId === round.awayTeamId ? "win" : "loss"
}

/**
 * Aggregates raw rows (already flattened by the caller from Supabase queries)
 * into one stat line per player. Only finished rounds count. A player who
 * somehow appears on both sides of the same round (borrowed-player conflict,
 * flagged elsewhere as a warning) is counted for both sides — not deduped.
 */
export function computePlayerStats(
  rounds: RoundLite[],
  goals: GoalLite[],
  participants: ParticipantLite[]
): PlayerStatLine[] {
  const roundsById = new Map(rounds.map((r) => [r.id, r] as const))
  const lines = new Map<string, PlayerStatLine>()

  function lineFor(playerId: string): PlayerStatLine {
    let line = lines.get(playerId)
    if (!line) {
      line = { playerId, roundsPlayed: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0 }
      lines.set(playerId, line)
    }
    return line
  }

  for (const p of participants) {
    const round = roundsById.get(p.roundId)
    if (!round || round.status !== "finished") continue
    const line = lineFor(p.playerId)
    line.roundsPlayed += 1
    const outcome = outcomeFor(round, p.teamId)
    if (outcome === "win") line.wins += 1
    else if (outcome === "draw") line.draws += 1
    else line.losses += 1
  }

  for (const g of goals) {
    const round = roundsById.get(g.roundId)
    if (!round || round.status !== "finished") continue
    if (g.playerId) lineFor(g.playerId).goals += 1
    if (g.assistPlayerId) lineFor(g.assistPlayerId).assists += 1
  }

  return [...lines.values()]
}

/** A player's career line across every pelada, with the derived rates. */
export interface AccountPlayerLine extends PlayerStatLine {
  /** Distinct peladas the player appeared in — not the same as rounds played. */
  matchesPlayed: number
  /** Goals + assists: "took part in the goal". */
  participations: number
  /** Points won over points available, 0–100 (win 3 · draw 1). */
  pointsPct: number
  goalsPerGame: number
}

/**
 * Career stats per player across all peladas: the same per-round aggregation as
 * `computePlayerStats`, plus the rates the account-wide screen ranks by.
 *
 * `roundToMatch` maps a round to its pelada so distinct peladas can be counted
 * (a player with 10 rounds spread over 2 peladas has `matchesPlayed` 2). Only
 * finished rounds count, inherited from `computePlayerStats`.
 */
export function computeAccountPlayerStats(
  rounds: RoundLite[],
  goals: GoalLite[],
  participants: ParticipantLite[],
  roundToMatch: Map<string, string>
): AccountPlayerLine[] {
  const base = computePlayerStats(rounds, goals, participants)
  const finishedRoundIds = new Set(
    rounds.filter((r) => r.status === "finished").map((r) => r.id)
  )

  // Distinct peladas per player, counted only from finished rounds so it lines
  // up with roundsPlayed.
  const matchesByPlayer = new Map<string, Set<string>>()
  for (const p of participants) {
    if (!finishedRoundIds.has(p.roundId)) continue
    const matchId = roundToMatch.get(p.roundId)
    if (!matchId) continue
    let set = matchesByPlayer.get(p.playerId)
    if (!set) {
      set = new Set()
      matchesByPlayer.set(p.playerId, set)
    }
    set.add(matchId)
  }

  return base.map((line) => {
    const available = line.roundsPlayed * WIN_POINTS
    const earned = line.wins * WIN_POINTS + line.draws * DRAW_POINTS
    return {
      ...line,
      matchesPlayed: matchesByPlayer.get(line.playerId)?.size ?? 0,
      participations: line.goals + line.assists,
      pointsPct: available > 0 ? (earned / available) * 100 : 0,
      goalsPerGame: line.roundsPlayed > 0 ? line.goals / line.roundsPlayed : 0,
    }
  })
}

/**
 * "Best player" order within ONE pelada: most participações (gols + assist),
 * then most vitórias, then most gols. Everyone plays a similar number of games
 * in a single pelada, so raw wins are fair here. Callers add a name tiebreak.
 */
export function comparePeladaPlayers(
  a: { goals: number; assists: number; wins: number },
  b: { goals: number; assists: number; wins: number }
): number {
  return b.goals + b.assists - (a.goals + a.assists) || b.wins - a.wins || b.goals - a.goals
}

/**
 * "Best player" order ACROSS peladas: most participações, then best
 * aproveitamento (win %), then most gols. Uses the rate (not raw wins) because
 * games played varies a lot over a career. Callers add a name tiebreak.
 */
export function compareAccountPlayers(
  a: { participations: number; pointsPct: number; goals: number },
  b: { participations: number; pointsPct: number; goals: number }
): number {
  return b.participations - a.participations || b.pointsPct - a.pointsPct || b.goals - a.goals
}

/**
 * Minimum peladas a player must have to make the "official" account-wide
 * ranking — the median of how many peladas people played, floored at 2. This
 * keeps a one-night wonder (great in a single pelada) out of the podium without
 * a magic constant: the bar rises with how active the group is. Returns 0 when
 * there's no data to compute it from.
 */
export function qualifyingMinPeladas(matchesPlayed: number[]): number {
  const played = matchesPlayed.filter((n) => n > 0).sort((x, y) => x - y)
  if (played.length === 0) return 0
  const mid = Math.floor(played.length / 2)
  const median = played.length % 2 === 0 ? (played[mid - 1]! + played[mid]!) / 2 : played[mid]!
  return Math.max(2, Math.ceil(median))
}

/**
 * Standings for the teams of one pelada, from its finished rounds: games,
 * W/D/L, goals for/against and points (3 for a win, 1 for a draw).
 *
 * `result` is the source of truth for the outcome — including a round decided
 * on penalties, where the score alone would read as a draw. Only when it's
 * missing do we fall back to comparing the goals.
 *
 * Sorted like a league table: points, then goal difference, then goals scored,
 * then wins.
 */
export function computeTeamStandings(rounds: RoundScoreLite[]): TeamStandingLine[] {
  const lines = new Map<string, TeamStandingLine>()

  function lineFor(teamId: string): TeamStandingLine {
    let line = lines.get(teamId)
    if (!line) {
      line = {
        teamId,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      }
      lines.set(teamId, line)
    }
    return line
  }

  for (const round of rounds) {
    if (round.status !== "finished") continue

    for (const teamId of [round.homeTeamId, round.awayTeamId]) {
      const isHome = teamId === round.homeTeamId
      const line = lineFor(teamId)
      line.played += 1
      line.goalsFor += isHome ? round.homeScore : round.awayScore
      line.goalsAgainst += isHome ? round.awayScore : round.homeScore

      const outcome = round.result
        ? outcomeFor(round, teamId)
        : round.homeScore === round.awayScore
          ? "draw"
          : (round.homeScore > round.awayScore) === isHome
            ? "win"
            : "loss"

      if (outcome === "win") {
        line.wins += 1
        line.points += WIN_POINTS
      } else if (outcome === "draw") {
        line.draws += 1
        line.points += DRAW_POINTS
      } else {
        line.losses += 1
      }
    }
  }

  for (const line of lines.values()) {
    line.goalDiff = line.goalsFor - line.goalsAgainst
  }

  return [...lines.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      b.wins - a.wins
  )
}

export interface TeamPlayerLine {
  playerId: string
  goals: number
  assists: number
}

export interface TeamPlayersStats {
  teamId: string
  /** Everyone who played for this team, sorted by goals then assists. */
  players: TeamPlayerLine[]
  /** Goals for this team with no scorer credited ("ninguém / gol contra"). */
  noScorerGoals: number
  /** All players tied at the team's top goal count (empty if nobody scored). */
  topScorerIds: string[]
  topScorerGoals: number
  topAssisterIds: string[]
  topAssisterAssists: number
}

/** Successful penalty kicks per side of a shootout, for the "(pênaltis 4-3)" score. */
export function penaltyTally(
  kicks: { teamId: string; scored: boolean }[],
  homeTeamId: string,
  awayTeamId: string
): { home: number; away: number } {
  let home = 0
  let away = 0
  for (const k of kicks) {
    if (!k.scored) continue
    if (k.teamId === homeTeamId) home += 1
    else if (k.teamId === awayTeamId) away += 1
  }
  return { home, away }
}

/** The timing fields a finished round carries, straight from `match_rounds`. */
export interface RoundTiming {
  startedAt: string
  finishedAt: string | null
  pausedAt: string | null
  pausedSeconds: number
}

/**
 * How long a finished round actually ran, in seconds — or null when there's no
 * meaningful clock (goals-only peladas never start it, so it reads ~0). The
 * clock is derived from wall-clock fields, so at finish the reading is frozen
 * at `paused_at` (if it ended paused) or `finished_at` (if it was still
 * running), minus the time spent paused.
 */
export function roundDurationSeconds(r: RoundTiming): number | null {
  if (!r.finishedAt) return null
  const started = new Date(r.startedAt).getTime()
  const ref = r.pausedAt ? new Date(r.pausedAt).getTime() : new Date(r.finishedAt).getTime()
  const secs = Math.round((ref - started) / 1000 - (r.pausedSeconds ?? 0))
  return secs > 0 ? secs : null
}

/**
 * Per-team, per-player goals and assists — the breakdown behind "o artilheiro
 * e o garçom de cada time". A player is grouped under whichever team they
 * played for; the same person on two teams (across different peladas, or a
 * borrowed round) gets a separate line per team, on purpose.
 *
 * Goals and assists are attributed by the goal's own `teamId`, so a borrowed
 * player's goal counts for the team they scored for, matching the standings.
 * Roster membership comes from `participants`, so a player who played but
 * never scored still appears with zeros.
 */
export function computeTeamPlayerStats(
  rounds: RoundLite[],
  goals: GoalLite[],
  participants: ParticipantLite[]
): TeamPlayersStats[] {
  const roundsById = new Map(rounds.map((r) => [r.id, r] as const))
  // teamId -> playerId -> line
  const byTeam = new Map<string, Map<string, TeamPlayerLine>>()
  // teamId -> goals with no credited scorer (ninguém / gol contra)
  const noScorerByTeam = new Map<string, number>()

  function lineFor(teamId: string, playerId: string): TeamPlayerLine {
    let team = byTeam.get(teamId)
    if (!team) {
      team = new Map()
      byTeam.set(teamId, team)
    }
    let line = team.get(playerId)
    if (!line) {
      line = { playerId, goals: 0, assists: 0 }
      team.set(playerId, line)
    }
    return line
  }

  function ensureTeam(teamId: string) {
    if (!byTeam.has(teamId)) byTeam.set(teamId, new Map())
  }

  for (const p of participants) {
    const round = roundsById.get(p.roundId)
    if (!round || round.status !== "finished") continue
    lineFor(p.teamId, p.playerId) // ensure a zero line for players who played
  }

  for (const g of goals) {
    const round = roundsById.get(g.roundId)
    if (!round || round.status !== "finished") continue
    if (g.playerId) lineFor(g.teamId, g.playerId).goals += 1
    else {
      ensureTeam(g.teamId)
      noScorerByTeam.set(g.teamId, (noScorerByTeam.get(g.teamId) ?? 0) + 1)
    }
    if (g.assistPlayerId) lineFor(g.teamId, g.assistPlayerId).assists += 1
  }

  const result: TeamPlayersStats[] = []
  for (const [teamId, team] of byTeam) {
    const players = [...team.values()].sort(
      (a, b) => b.goals - a.goals || b.assists - a.assists
    )
    const topScorerGoals = players.reduce((max, p) => Math.max(max, p.goals), 0)
    const topAssisterAssists = players.reduce((max, p) => Math.max(max, p.assists), 0)
    result.push({
      teamId,
      players,
      noScorerGoals: noScorerByTeam.get(teamId) ?? 0,
      topScorerGoals,
      topScorerIds: topScorerGoals > 0 ? players.filter((p) => p.goals === topScorerGoals).map((p) => p.playerId) : [],
      topAssisterAssists,
      topAssisterIds:
        topAssisterAssists > 0 ? players.filter((p) => p.assists === topAssisterAssists).map((p) => p.playerId) : [],
    })
  }
  return result
}

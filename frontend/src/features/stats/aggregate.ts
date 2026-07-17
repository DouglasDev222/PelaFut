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

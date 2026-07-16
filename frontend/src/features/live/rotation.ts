import type { RoundResult } from "@pelafut/shared"

export interface RotationTeam {
  id: string
  /** Live queue order — NOT the team's permanent number/identity. */
  queuePosition: number
}

export interface RotationInput {
  /** Every team in the match (the two on court plus everyone waiting). */
  teams: RotationTeam[]
  homeTeamId: string
  awayTeamId: string
  result: RoundResult
  tieBothLeaveAllowed: boolean
  /**
   * On a tie where both teams leave, which of the two goes furthest to the
   * back (organizer's call — there's no winner to decide it automatically).
   * Defaults to awayTeamId when not given.
   */
  tieLastTeamId?: string
}

export type RotationOutcome =
  | { type: "replay" }
  | {
      type: "advance"
      /** Teams that just left the court, moved to the back of the queue. */
      queuePositionUpdates: { teamId: string; queuePosition: number }[]
      nextHomeTeamId: string
      nextAwayTeamId: string
    }

/**
 * Decides what happens to the queue after a round ends. Only two teams are
 * ever "in play"; everyone else waits in queue order (lowest first). This
 * never touches a team's permanent number/identity — only queuePosition.
 */
export function resolveRoundOutcome(input: RotationInput): RotationOutcome {
  const { teams, homeTeamId, awayTeamId, result, tieBothLeaveAllowed, tieLastTeamId } = input

  if (result === "tie" && !tieBothLeaveAllowed) {
    return { type: "replay" }
  }

  const maxQueuePosition = teams.reduce((max, t) => Math.max(max, t.queuePosition), -1)
  const waiting = teams
    .filter((t) => t.id !== homeTeamId && t.id !== awayTeamId)
    .sort((a, b) => a.queuePosition - b.queuePosition)

  if (result === "tie") {
    const [nextHome, nextAway] = waiting
    if (!nextHome || !nextAway) {
      throw new Error("Não há times suficientes na fila para os dois times entrarem.")
    }
    const lastTeamId = tieLastTeamId ?? awayTeamId
    const firstTeamId = lastTeamId === homeTeamId ? awayTeamId : homeTeamId
    return {
      type: "advance",
      queuePositionUpdates: [
        { teamId: firstTeamId, queuePosition: maxQueuePosition + 1 },
        { teamId: lastTeamId, queuePosition: maxQueuePosition + 2 },
      ],
      nextHomeTeamId: nextHome.id,
      nextAwayTeamId: nextAway.id,
    }
  }

  const winnerId = result === "home_win" ? homeTeamId : awayTeamId
  const loserId = result === "home_win" ? awayTeamId : homeTeamId
  const nextChallenger = waiting[0]

  if (!nextChallenger) {
    // Only two teams total: the loser comes right back to challenge again.
    return {
      type: "advance",
      queuePositionUpdates: [],
      nextHomeTeamId: winnerId,
      nextAwayTeamId: loserId,
    }
  }

  return {
    type: "advance",
    queuePositionUpdates: [{ teamId: loserId, queuePosition: maxQueuePosition + 1 }],
    nextHomeTeamId: winnerId,
    nextAwayTeamId: nextChallenger.id,
  }
}

/** How many extra players a team needs to borrow to reach a full squad. */
export function borrowShortfall(rosterCount: number, playersPerTeam: number): number {
  return Math.max(0, playersPerTeam - rosterCount)
}

/** Default suggestion for who to borrow: the first N candidates (whichever team(s) just left). */
export function suggestBorrowedPlayers<T>(candidates: T[], count: number): T[] {
  return candidates.slice(0, count)
}

/**
 * Elapsed seconds derived from wall-clock time (started_at / paused_at / paused_seconds,
 * all persisted), not a local counter — survives refresh/navigation.
 */
export function elapsedSecondsFor(round: {
  startedAt: string
  pausedAt: string | null
  pausedSeconds: number
}): number {
  const startedMs = new Date(round.startedAt).getTime()
  const nowMs = round.pausedAt ? new Date(round.pausedAt).getTime() : Date.now()
  return Math.max(0, (nowMs - startedMs) / 1000 - round.pausedSeconds)
}

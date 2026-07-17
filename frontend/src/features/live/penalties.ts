export interface PenaltyKick {
  teamId: string
  scored: boolean
}

export interface PenaltyState {
  homeScore: number
  awayScore: number
  homeTaken: number
  awayTaken: number
  decided: boolean
  winnerTeamId: string | null
  nextKickerTeamId: string
}

export const DEFAULT_REGULATION_KICKS = 5

/**
 * Small pickup teams don't need a full best-of-5 — a team of 3 shoots its
 * best of 3, a team of 4 or 5 shoots best of 4 or 5, and anything bigger
 * still caps at the traditional best of 5.
 */
export function regulationKicksFor(playersPerTeam: number): number {
  return Math.max(1, Math.min(playersPerTeam, DEFAULT_REGULATION_KICKS))
}

/** Strict alternation between the two given teams, one kick at a time. */
export function nextPenaltyKicker(
  kicks: PenaltyKick[],
  firstKickerTeamId: string,
  secondKickerTeamId: string
): string {
  return kicks.length % 2 === 0 ? firstKickerTeamId : secondKickerTeamId
}

/**
 * Shootout rule: `regulationKicks` kicks each (5 by default, fewer for small
 * pickup teams — see `regulationKicksFor`), deciding early once the trailing
 * side can no longer catch up even scoring every remaining kick. Still tied
 * after regulation, it goes to sudden death — one kick each per round,
 * decided as soon as both have taken the same number of kicks and the
 * scores differ.
 *
 * `firstKickerTeamId` (defaults to home) is the organizer's call — there's
 * no rule saying home always goes first.
 */
export function resolvePenaltyShootout(
  kicks: PenaltyKick[],
  homeTeamId: string,
  awayTeamId: string,
  firstKickerTeamId: string = homeTeamId,
  regulationKicks: number = DEFAULT_REGULATION_KICKS
): PenaltyState {
  const homeKicks = kicks.filter((k) => k.teamId === homeTeamId)
  const awayKicks = kicks.filter((k) => k.teamId === awayTeamId)
  const homeScore = homeKicks.filter((k) => k.scored).length
  const awayScore = awayKicks.filter((k) => k.scored).length
  const homeTaken = homeKicks.length
  const awayTaken = awayKicks.length
  const secondKickerTeamId = firstKickerTeamId === homeTeamId ? awayTeamId : homeTeamId
  const nextKickerTeamId = nextPenaltyKicker(kicks, firstKickerTeamId, secondKickerTeamId)

  let decided = false
  let winnerTeamId: string | null = null

  if (homeTaken < regulationKicks || awayTaken < regulationKicks) {
    const homeRemaining = Math.max(0, regulationKicks - homeTaken)
    const awayRemaining = Math.max(0, regulationKicks - awayTaken)
    if (homeScore > awayScore + awayRemaining) {
      decided = true
      winnerTeamId = homeTeamId
    } else if (awayScore > homeScore + homeRemaining) {
      decided = true
      winnerTeamId = awayTeamId
    }
  } else if (homeTaken === awayTaken && homeScore !== awayScore) {
    decided = true
    winnerTeamId = homeScore > awayScore ? homeTeamId : awayTeamId
  }

  return { homeScore, awayScore, homeTaken, awayTaken, decided, winnerTeamId, nextKickerTeamId }
}

export interface PenaltyKickStakes {
  winsIfScored: boolean
  eliminatedIfMissed: boolean
}

/**
 * Whether the next kick is a "match point" — scoring it wins immediately,
 * or missing it immediately loses — computed by simulating both outcomes
 * against the same decision rule used for the real shootout.
 */
export function penaltyKickStakes(
  kicks: PenaltyKick[],
  homeTeamId: string,
  awayTeamId: string,
  firstKickerTeamId: string = homeTeamId,
  regulationKicks: number = DEFAULT_REGULATION_KICKS
): PenaltyKickStakes {
  const current = resolvePenaltyShootout(kicks, homeTeamId, awayTeamId, firstKickerTeamId, regulationKicks)
  if (current.decided) return { winsIfScored: false, eliminatedIfMissed: false }

  const kickerId = current.nextKickerTeamId
  const ifScored = resolvePenaltyShootout(
    [...kicks, { teamId: kickerId, scored: true }],
    homeTeamId, awayTeamId, firstKickerTeamId, regulationKicks
  )
  const ifMissed = resolvePenaltyShootout(
    [...kicks, { teamId: kickerId, scored: false }],
    homeTeamId, awayTeamId, firstKickerTeamId, regulationKicks
  )
  return {
    winsIfScored: ifScored.decided && ifScored.winnerTeamId === kickerId,
    eliminatedIfMissed: ifMissed.decided && ifMissed.winnerTeamId !== null && ifMissed.winnerTeamId !== kickerId,
  }
}

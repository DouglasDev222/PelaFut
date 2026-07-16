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

const REGULATION_KICKS = 5

/** Strict alternation between the two given teams, one kick at a time. */
export function nextPenaltyKicker(
  kicks: PenaltyKick[],
  firstKickerTeamId: string,
  secondKickerTeamId: string
): string {
  return kicks.length % 2 === 0 ? firstKickerTeamId : secondKickerTeamId
}

/**
 * Standard shootout rule: 5 kicks each, deciding early once the trailing
 * side can no longer catch up even scoring every remaining kick. Tied after
 * 5-5, it goes to sudden death — one kick each per round, decided as soon as
 * both have taken the same number of kicks and the scores differ.
 *
 * `firstKickerTeamId` (defaults to home) is the organizer's call — there's
 * no rule saying home always goes first.
 */
export function resolvePenaltyShootout(
  kicks: PenaltyKick[],
  homeTeamId: string,
  awayTeamId: string,
  firstKickerTeamId: string = homeTeamId
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

  if (homeTaken < REGULATION_KICKS || awayTaken < REGULATION_KICKS) {
    const homeRemaining = Math.max(0, REGULATION_KICKS - homeTaken)
    const awayRemaining = Math.max(0, REGULATION_KICKS - awayTaken)
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

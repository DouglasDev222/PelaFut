import type { Player } from "@pelafut/shared"

/** Max stars a player can have — the scale the bar is drawn against. */
const STAR_MAX = 5
/** How far a team's average can stray from the group before it's "off". */
const BALANCE_THRESHOLD = 0.6
/** Neutral fallback when nobody in the pool has a rating at all. */
const NEUTRAL_STARS = 3

/**
 * Average rating of the rated players in a pool. Used as the fill-in value for
 * unrated players so a team isn't unfairly dragged down by someone who simply
 * hasn't been given stars yet. Falls back to a neutral mid value if no one in
 * the whole pool is rated.
 */
export function groupAverageStars(players: Player[]): number {
  const rated = players.map((p) => p.skill_level).filter((s): s is number => s != null)
  if (rated.length === 0) return NEUTRAL_STARS
  return rated.reduce((sum, s) => sum + s, 0) / rated.length
}

/**
 * A team's average stars. Unrated players count as `groupAverage` (see above),
 * so they neither help nor hurt the team's nota. Empty teams average 0, which
 * the UI reads as "no nota yet".
 */
export function teamAverageStars(players: Player[], groupAverage: number): number {
  if (players.length === 0) return 0
  const sum = players.reduce((acc, p) => acc + (p.skill_level ?? groupAverage), 0)
  return sum / players.length
}

export interface TeamBalance {
  /** Average stars of the team (0 when empty). */
  average: number
  /** 0..1 bar fill, on the absolute 0–5 star scale. */
  fillPct: number
  /** "off" when this team strays from the others by more than the threshold. */
  tone: "balanced" | "off"
}

/**
 * Per-team balance info for the whole formation. `tone` compares each team to
 * the mean of the non-empty teams' averages — so mid-draft, a team that's
 * pulling ahead lights up before you finish. Empty teams (and formations with
 * fewer than two filled teams) are always "balanced".
 */
export function formationBalance(
  teams: { players: Player[] }[],
  allParticipants: Player[]
): TeamBalance[] {
  const groupAverage = groupAverageStars(allParticipants)
  const averages = teams.map((t) => teamAverageStars(t.players, groupAverage))
  const filled = averages.filter((_, i) => teams[i]!.players.length > 0)
  const mean = filled.length > 0 ? filled.reduce((a, b) => a + b, 0) / filled.length : 0

  return teams.map((team, i) => {
    const average = averages[i]!
    const isEmpty = team.players.length === 0
    const tone: TeamBalance["tone"] =
      isEmpty || filled.length < 2
        ? "balanced"
        : Math.abs(average - mean) > BALANCE_THRESHOLD
          ? "off"
          : "balanced"
    return { average, fillPct: Math.min(average / STAR_MAX, 1), tone }
  })
}

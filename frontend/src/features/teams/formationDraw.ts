import type { Player } from "@pelafut/shared"
import { groupAverageStars } from "@/features/teams/teamStrength"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/**
 * Fills `result[t]` with player ids until each team hits its capacity, then
 * distributes any leftover round-robin. Pure list bookkeeping shared by both
 * draws.
 */
function fillByCapacity(orderedIds: string[], capacities: number[]): string[][] {
  const result: string[][] = capacities.map(() => [])
  let idx = 0
  for (let t = 0; t < capacities.length; t++) {
    for (let k = 0; k < capacities[t]! && idx < orderedIds.length; k++) {
      result[t]!.push(orderedIds[idx]!)
      idx++
    }
  }
  for (let t = 0; idx < orderedIds.length; t++, idx++) {
    result[t % capacities.length]!.push(orderedIds[idx]!)
  }
  return result
}

/**
 * Random draw: shuffle everyone and pour them into the teams up to each team's
 * capacity. `capacities[i]` is how many slots team i has (a reserve team has
 * fewer). Returns player ids per team index.
 */
export function drawRandom(participants: Player[], capacities: number[]): string[][] {
  return fillByCapacity(shuffle(participants).map((p) => p.id), capacities)
}

/**
 * Balanced draw: distribute players so the teams' star totals stay close (the
 * classic longest-processing-time partition). Players are shuffled (to vary
 * ties) then sorted strongest-first, and each is dropped into the open team
 * with the lowest running total — so a strong player and a weak one tend to
 * land on the same team, evening the totals out. With equal team sizes, equal
 * totals means equal averages. Unrated players count as the group average,
 * matching `teamAverageStars`.
 */
export function drawBalanced(participants: Player[], capacities: number[]): string[][] {
  const groupAverage = groupAverageStars(participants)
  const rating = (p: Player) => p.skill_level ?? groupAverage
  const pool = shuffle(participants).sort((a, b) => rating(b) - rating(a))

  const teams = capacities.map((cap) => ({ ids: [] as string[], sum: 0, cap }))
  for (const player of pool) {
    let best = -1
    let bestSum = Infinity
    for (let t = 0; t < teams.length; t++) {
      const team = teams[t]!
      if (team.ids.length >= team.cap) continue
      if (team.sum < bestSum) {
        best = t
        bestSum = team.sum
      }
    }
    if (best === -1) break
    teams[best]!.ids.push(player.id)
    teams[best]!.sum += rating(player)
  }
  return teams.map((t) => t.ids)
}

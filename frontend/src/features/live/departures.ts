import type { Player } from "@pelafut/shared"

/**
 * Records that players left a pelada partway through. A departure means "absent
 * from round `from_sequence` onward" — the player still counts for every earlier
 * round they actually played, so nothing they did before leaving is lost.
 *
 * Keyed by `matchId:playerId` because the career-wide stats screens span many
 * peladas, and the same person can have different departures in each.
 */
export type DepartureMap = Map<string, number>

function key(matchId: string, playerId: string): string {
  return `${matchId}:${playerId}`
}

export function departureKey(matchId: string, playerId: string): string {
  return key(matchId, playerId)
}

/**
 * True when the player counts as present in a round of that sequence: no
 * departure at all, or one that only takes effect in a later round.
 */
export function isPresent(
  map: DepartureMap,
  matchId: string,
  playerId: string,
  sequence: number
): boolean {
  const from = map.get(key(matchId, playerId))
  return from === undefined || sequence < from
}

export type BorrowCandidateTag = "own" | "opponent" | "departed" | "waiting"

export interface AnyBorrowCandidate {
  player: Player
  /** The player's real team — where a loan is "borrowed from" and returns to. */
  fromTeamId: string
  tag: BorrowCandidateTag
}

interface TeamLike {
  id: string
  players: Player[]
}

/**
 * Every player in the pelada as a borrow option, tagged so the picker can show
 * who's already on the borrowing team, who's the opponent (allowed but flagged —
 * it double-books them for the round), who already left, and who's free in the
 * queue. The two on-court teams are `borrowingTeamId` (asking) and
 * `opponentTeamId` (facing it this round).
 */
export function buildBorrowAnyCandidates({
  teams,
  borrowingTeamId,
  opponentTeamId,
  departedIds,
}: {
  teams: TeamLike[]
  borrowingTeamId: string
  opponentTeamId: string | null
  departedIds: Set<string>
}): AnyBorrowCandidate[] {
  const candidates: AnyBorrowCandidate[] = []
  for (const team of teams) {
    for (const player of team.players) {
      let tag: BorrowCandidateTag
      if (departedIds.has(player.id)) tag = "departed"
      else if (team.id === borrowingTeamId) tag = "own"
      else if (team.id === opponentTeamId) tag = "opponent"
      else tag = "waiting"
      candidates.push({ player, fromTeamId: team.id, tag })
    }
  }
  return candidates
}

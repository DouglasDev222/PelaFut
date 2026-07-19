/**
 * Manual editing of the rodízio queue.
 *
 * The automatic rotation lives in `rotation.ts`; this module is the manual
 * override the organizer reaches for when real life doesn't follow it (a team
 * gives its turn away, someone has to leave early, two teams swap).
 *
 * THE INVARIANT: every edit rewrites the queue as a complete permutation —
 * the two teams on court take 0 and 1, everyone waiting takes 2..n-1 in the
 * chosen order. No team is ever edited in isolation. That makes "a team fell
 * out of the queue", "two teams share a position" and "there's a hole in the
 * order" unrepresentable: a team can be pushed back, never lost.
 *
 * `resolveRoundOutcome` stays correct on top of this because it only reads the
 * relative order of the waiting teams and pushes the loser to `max + 1`.
 */

/** Who is on court and who is waiting, in queue order (front of the line first). */
export interface QueueState {
  homeTeamId: string
  awayTeamId: string
  waitingIds: string[]
}

export interface QueueEditPlan {
  /** Non-null only when the pair on court changed. */
  roundTeams: { homeTeamId: string; awayTeamId: string } | null
  /** Teams that just left the court — their data for the current round no longer applies. */
  teamsLeavingCourt: string[]
  teamsEnteringCourt: string[]
  /** The full normalized permutation (the invariant). */
  queuePositions: { teamId: string; queuePosition: number }[]
  /**
   * True when applying this edit throws away what was already played in the
   * current game. Only a change on court can do that — reordering the waiting
   * line touches nothing that has happened.
   */
  resetsCurrentRound: boolean
  changed: boolean
}

/** Every team in the state, on-court first. Order matters: it defines the positions. */
function allTeamIds(state: QueueState): string[] {
  return [state.homeTeamId, state.awayTeamId, ...state.waitingIds]
}

/**
 * Moves a waiting team to another spot in the line (insertion, not swap): the
 * team is pulled out and re-inserted at `toIndex`, and everyone in between
 * shifts by one. Who is on court is untouched.
 */
export function reorderWaiting(state: QueueState, fromIndex: number, toIndex: number): QueueState {
  const { waitingIds } = state
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= waitingIds.length ||
    toIndex >= waitingIds.length
  ) {
    return state
  }
  const next = [...waitingIds]
  const [moved] = next.splice(fromIndex, 1)
  if (!moved) return state
  next.splice(toIndex, 0, moved)
  return { ...state, waitingIds: next }
}

/**
 * Swaps a team on court with one from the queue. The waiting team takes the
 * court slot, and the team coming off takes **the exact spot the other one
 * held** — which is the "Time 2 gave its turn to Time 3, so Time 2 now sits
 * where Time 3 was" case. Anything else would silently send Time 2 to the back
 * of the line, which isn't what giving up one turn means.
 *
 * Returns the state unchanged if the ids don't line up (nothing to swap).
 */
export function swapOnCourt(
  state: QueueState,
  courtTeamId: string,
  waitingTeamId: string
): QueueState {
  const waitingIndex = state.waitingIds.indexOf(waitingTeamId)
  if (waitingIndex === -1) return state
  const isHome = state.homeTeamId === courtTeamId
  const isAway = state.awayTeamId === courtTeamId
  if (!isHome && !isAway) return state

  const waitingIds = [...state.waitingIds]
  waitingIds[waitingIndex] = courtTeamId

  return {
    homeTeamId: isHome ? waitingTeamId : state.homeTeamId,
    awayTeamId: isAway ? waitingTeamId : state.awayTeamId,
    waitingIds,
  }
}

/**
 * The invariant made concrete: on-court teams get 0 and 1, the waiting line
 * gets 2..n-1. Always a full permutation, never a partial update.
 */
export function normalizePositions(state: QueueState): { teamId: string; queuePosition: number }[] {
  return allTeamIds(state).map((teamId, index) => ({ teamId, queuePosition: index }))
}

/**
 * Turns "here's where I want the queue" into the list of changes to apply.
 *
 * Throws if `draft` isn't a permutation of `current` — that would mean a team
 * was dropped or duplicated somewhere upstream, and writing it would be exactly
 * the unfairness this module exists to prevent. Failing loudly beats persisting
 * a queue where someone never plays again.
 */
export function planQueueEdit(current: QueueState, draft: QueueState): QueueEditPlan {
  const before = allTeamIds(current)
  const after = allTeamIds(draft)
  const beforeSet = new Set(before)
  const afterSet = new Set(after)
  const samePool =
    before.length === after.length &&
    beforeSet.size === before.length &&
    afterSet.size === after.length &&
    before.every((id) => afterSet.has(id))
  if (!samePool) {
    throw new Error("A fila editada não contém exatamente os mesmos times da fila atual.")
  }

  const courtChanged =
    current.homeTeamId !== draft.homeTeamId || current.awayTeamId !== draft.awayTeamId
  const beforeCourt = new Set([current.homeTeamId, current.awayTeamId])
  const afterCourt = new Set([draft.homeTeamId, draft.awayTeamId])
  const teamsLeavingCourt = [...beforeCourt].filter((id) => !afterCourt.has(id))
  const teamsEnteringCourt = [...afterCourt].filter((id) => !beforeCourt.has(id))

  const queuePositions = normalizePositions(draft)
  const orderChanged = before.some((id, i) => id !== after[i])

  return {
    roundTeams: courtChanged
      ? { homeTeamId: draft.homeTeamId, awayTeamId: draft.awayTeamId }
      : null,
    teamsLeavingCourt,
    teamsEnteringCourt,
    queuePositions,
    // Swapping home and away between themselves keeps both on court, so
    // nothing that was played is invalidated.
    resetsCurrentRound: teamsLeavingCourt.length > 0,
    changed: orderChanged,
  }
}

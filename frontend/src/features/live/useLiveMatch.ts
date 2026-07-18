import { useCallback, useEffect, useRef, useState } from "react"
import type { Match, Player, RoundDecidedBy, RoundResult } from "@pelafut/shared"
import { supabase } from "@/lib/supabaseClient"
import {
  borrowShortfall,
  elapsedSecondsFor,
  resolveRoundOutcome,
  suggestBorrowedPlayers,
  type RotationTeam,
} from "@/features/live/rotation"
import { regulationKicksFor, resolvePenaltyShootout, type PenaltyKick, type PenaltyState } from "@/features/live/penalties"

export interface LiveTeam {
  id: string
  /** Permanent identity assigned during formation (Time 1, 2, 3...) — never changes. */
  number: number
  color: string
  captainId: string | null
  players: Player[]
  /** Live queue order. Starts equal to `number - 1` once the match begins, then rotates independently. */
  queuePosition: number
}

interface RoundGoal {
  id: string
  teamId: string
  /** Null for a goal counted with no specific scorer ("gol sem autor"). */
  playerId: string | null
  assistPlayerId: string | null
}

interface CurrentRound {
  id: string
  sequence: number
  homeTeamId: string
  awayTeamId: string
  goals: RoundGoal[]
  /** Players borrowed from another team to fill out a short-handed roster this round. */
  borrowedPlayers: { teamId: string; player: Player; fromTeamId: string }[]
  startedAt: string
  /** Null when the timer is currently running. */
  pausedAt: string | null
  /** Total seconds accumulated across past pauses (not counting an in-progress pause). */
  pausedSeconds: number
}

export interface BorrowCandidate {
  player: Player
  fromTeamId: string
}

export interface PendingBorrowNeed {
  teamId: string
  count: number
  candidates: BorrowCandidate[]
}

/**
 * A team on court right now is missing some of its OWN players because
 * they're currently on loan to the team it's facing. The app doesn't try to
 * resolve this automatically (recalling loans could cascade into further
 * shortages) — it just surfaces it so the organizer can sort it out.
 */
export interface BorrowConflictWarning {
  teamId: string
  lentToTeamId: string
  players: Player[]
}

export type LivePhase = "not_started" | "live" | "pending_borrow" | "finished"

export interface PendingTieOrder {
  homeTeamId: string
  awayTeamId: string
}

export type TieResolutionMode = "both_leave" | "penalties" | "direct"

export interface PenaltyShootoutState {
  roundId: string
  homeTeamId: string
  awayTeamId: string
  firstKickerTeamId: string
  regulationKicks: number
  kicks: (PenaltyKick & { id: string })[]
}

/** Teams leaving court and teams entering it at a round rotation, shown in a blocking pop-up before the new round appears. */
export interface TransitionInfo {
  leaving: LiveTeam[]
  entering: LiveTeam[]
}

/** Enough to undo the single most recent round finalization — a safety net for "I ended the wrong game." */
interface UndoSnapshot {
  finishedRoundId: string
  newRoundId: string
  previousQueuePositions: { teamId: string; queuePosition: number }[]
}

/** A brand-new round always starts paused-at-zero, so the organizer starts the clock at the exact right moment. */
function freshRoundTimestamps() {
  const now = new Date().toISOString()
  return { started_at: now, paused_at: now }
}

export function useLiveMatch(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null)
  const [teams, setTeams] = useState<LiveTeam[]>([])
  const [currentRound, setCurrentRound] = useState<CurrentRound | null>(null)
  const [pendingBorrows, setPendingBorrows] = useState<PendingBorrowNeed[]>([])
  const [conflictWarnings, setConflictWarnings] = useState<BorrowConflictWarning[]>([])
  const [pendingTieOrder, setPendingTieOrder] = useState<PendingTieOrder | null>(null)
  const [pendingTieDecision, setPendingTieDecision] = useState<PendingTieOrder | null>(null)
  const [pendingDirectWinner, setPendingDirectWinner] = useState<PendingTieOrder | null>(null)
  const [pendingPenaltyFirstKicker, setPendingPenaltyFirstKicker] = useState<PendingTieOrder | null>(null)
  const [penaltyShootout, setPenaltyShootout] = useState<PenaltyShootoutState | null>(null)
  const [pendingTransition, setPendingTransition] = useState<TransitionInfo | null>(null)
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null)
  const [phase, setPhase] = useState<LivePhase>("not_started")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  const load = useCallback(async () => {
    // Only the very first load blanks the screen — later refetches (after ending a
    // round, confirming a borrow, etc.) update the visible cards in place instead
    // of flashing the whole page back to a loading state.
    if (!hasLoadedRef.current) setLoading(true)
    hasLoadedRef.current = true
    setError(null)
    setPendingTieOrder(null)
    setPendingTieDecision(null)
    setPendingDirectWinner(null)
    setPendingPenaltyFirstKicker(null)
    setPendingTransition(null)

    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single()
    if (matchError || !matchData) {
      setError(matchError?.message ?? "Pelada não encontrada")
      setLoading(false)
      return
    }
    setMatch(matchData as Match)

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, position, queue_position, color, captain_player_id, team_players(player_id, players(*))")
      .eq("match_id", matchId)
      .order("position")
    if (teamsError) {
      setError(teamsError.message)
      setLoading(false)
      return
    }
    const loadedTeams: LiveTeam[] = (teamsData ?? []).map((t) => ({
      id: t.id as string,
      number: (t.position as number) + 1,
      color: t.color as string,
      captainId: t.captain_player_id as string | null,
      players: (t.team_players as unknown as { players: Player }[]).map((tp) => tp.players),
      queuePosition: (t.queue_position as number | null) ?? (t.position as number),
    }))
    setTeams(loadedTeams)

    if (matchData.status === "teams_formed") {
      setPhase("not_started")
      setCurrentRound(null)
      setPendingBorrows([])
      setConflictWarnings([])
      setLoading(false)
      return
    }

    if (matchData.status === "finished") {
      setPhase("finished")
      setCurrentRound(null)
      setPendingBorrows([])
      setConflictWarnings([])
      setLoading(false)
      return
    }

    const { data: roundRows, error: roundError } = await supabase
      .from("match_rounds")
      .select("*")
      .eq("match_id", matchId)
      .order("sequence", { ascending: false })
      .limit(1)
    if (roundError) {
      setError(roundError.message)
      setLoading(false)
      return
    }
    const latestRound = roundRows?.[0]
    if (!latestRound || latestRound.status !== "in_progress") {
      setError("Partida em andamento sem rodada ativa. Tente reiniciar a partida ao vivo.")
      setCurrentRound(null)
      setPendingBorrows([])
      setConflictWarnings([])
      setLoading(false)
      return
    }

    const [
      { data: goalRows, error: goalsError },
      { data: borrowedRows, error: borrowedError },
      { data: penaltyKickRows, error: penaltyError },
    ] = await Promise.all([
      supabase.from("match_round_goals").select("*").eq("round_id", latestRound.id),
      supabase
        .from("match_round_borrowed_players")
        .select("team_id, player_id, borrowed_from_team_id")
        .eq("round_id", latestRound.id),
      supabase
        .from("match_round_penalty_kicks")
        .select("id, team_id, scored")
        .eq("round_id", latestRound.id)
        .order("sequence"),
    ])
    if (goalsError || borrowedError || penaltyError) {
      setError(goalsError?.message ?? borrowedError?.message ?? penaltyError?.message ?? "Erro ao carregar a rodada")
      setLoading(false)
      return
    }

    // A shootout in progress leaves kicks recorded but the round still
    // in_progress — reconstruct it so a refresh mid-shootout doesn't lose it.
    if (penaltyKickRows && penaltyKickRows.length > 0) {
      setPenaltyShootout({
        roundId: latestRound.id as string,
        homeTeamId: latestRound.home_team_id as string,
        awayTeamId: latestRound.away_team_id as string,
        // The first kick recorded reveals who was chosen to go first.
        firstKickerTeamId: penaltyKickRows[0]!.team_id as string,
        // The organizer's best-of-N override isn't persisted — a reload
        // mid-shootout falls back to the player-count default.
        regulationKicks: regulationKicksFor(matchData.players_per_team as number),
        kicks: penaltyKickRows.map((k) => ({
          id: k.id as string,
          teamId: k.team_id as string,
          scored: k.scored as boolean,
        })),
      })
    } else {
      setPenaltyShootout(null)
    }

    const allPlayersById = new Map(
      loadedTeams.flatMap((t) => t.players).map((p) => [p.id, p] as const)
    )
    setCurrentRound({
      id: latestRound.id as string,
      sequence: latestRound.sequence as number,
      homeTeamId: latestRound.home_team_id as string,
      awayTeamId: latestRound.away_team_id as string,
      goals: (goalRows ?? []).map((g) => ({
        id: g.id as string,
        teamId: g.team_id as string,
        playerId: g.player_id as string | null,
        assistPlayerId: g.assist_player_id as string | null,
      })),
      startedAt: latestRound.started_at as string,
      pausedAt: (latestRound.paused_at as string | null) ?? null,
      pausedSeconds: (latestRound.paused_seconds as number | null) ?? 0,
      borrowedPlayers: (borrowedRows ?? []).flatMap((b) => {
        const player = allPlayersById.get(b.player_id as string)
        return player
          ? [{ teamId: b.team_id as string, player, fromTeamId: b.borrowed_from_team_id as string }]
          : []
      }),
    })

    // Detect (but don't try to auto-resolve) the case where a team on court
    // is missing some of its OWN players because they're currently on loan
    // to the team it's facing this round.
    const homeId = latestRound.home_team_id as string
    const awayId = latestRound.away_team_id as string
    const conflicts: BorrowConflictWarning[] = []
    for (const [teamId, otherId] of [
      [homeId, awayId],
      [awayId, homeId],
    ] as const) {
      const lentOut = (borrowedRows ?? []).filter(
        (b) => b.team_id === otherId && b.borrowed_from_team_id === teamId
      )
      if (lentOut.length > 0) {
        const players = lentOut.flatMap((b) => {
          const p = allPlayersById.get(b.player_id as string)
          return p ? [p] : []
        })
        conflicts.push({ teamId, lentToTeamId: otherId, players })
      }
    }
    setConflictWarnings(conflicts)

    const alreadyBorrowedTeamIds = new Set((borrowedRows ?? []).map((b) => b.team_id as string))
    const incomingTeamIds = [latestRound.home_team_id, latestRound.away_team_id] as string[]
    const needs: PendingBorrowNeed[] = []
    if (matchData.players_per_team > 0) {
      let leavingCandidates: BorrowCandidate[] = []
      if (latestRound.sequence > 1) {
        const { data: prevRoundRows } = await supabase
          .from("match_rounds")
          .select("home_team_id, away_team_id")
          .eq("match_id", matchId)
          .eq("sequence", (latestRound.sequence as number) - 1)
          .limit(1)
        const prevRound = prevRoundRows?.[0]
        if (prevRound) {
          const leavingTeamIds = [prevRound.home_team_id, prevRound.away_team_id].filter(
            (id) => !incomingTeamIds.includes(id as string)
          )
          leavingCandidates = loadedTeams
            .filter((t) => leavingTeamIds.includes(t.id))
            .flatMap((t) => t.players.map((player) => ({ player, fromTeamId: t.id })))
        }
      }
      for (const teamId of incomingTeamIds) {
        if (alreadyBorrowedTeamIds.has(teamId)) continue
        const team = loadedTeams.find((t) => t.id === teamId)
        if (!team) continue
        const shortfall = borrowShortfall(team.players.length, matchData.players_per_team)
        if (shortfall > 0 && leavingCandidates.length > 0) {
          needs.push({ teamId, count: shortfall, candidates: leavingCandidates })
        }
      }
    }
    setPendingBorrows(needs)
    setPhase(needs.length > 0 ? "pending_borrow" : "live")
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    load()
  }, [load])

  async function startLiveMatch() {
    if (!match || teams.length < 2) return { error: "É preciso de pelo menos 2 times" }
    setError(null)
    const ordered = [...teams].sort((a, b) => a.queuePosition - b.queuePosition)
    for (const t of ordered) {
      const { error: queueError } = await supabase
        .from("teams")
        .update({ queue_position: t.queuePosition })
        .eq("id", t.id)
      if (queueError) {
        setError(queueError.message)
        return { error: queueError.message }
      }
    }
    const [first, second] = ordered
    const { error: insertError } = await supabase.from("match_rounds").insert({
      match_id: matchId,
      sequence: 1,
      home_team_id: first!.id,
      away_team_id: second!.id,
      status: "in_progress",
      ...freshRoundTimestamps(),
    })
    if (insertError) {
      setError(insertError.message)
      return { error: insertError.message }
    }
    const { error: statusError } = await supabase
      .from("matches")
      .update({ status: "in_progress" })
      .eq("id", matchId)
    if (statusError) {
      setError(statusError.message)
      return { error: statusError.message }
    }
    await load()
    return { error: null }
  }

  async function recordGoal(
    teamId: string,
    playerId: string | null,
    assistPlayerId: string | null = null
  ) {
    if (!currentRound) return
    const effectiveAssist = playerId ? assistPlayerId : null
    const { data, error: insertError } = await supabase
      .from("match_round_goals")
      .insert({
        round_id: currentRound.id,
        team_id: teamId,
        player_id: playerId,
        assist_player_id: effectiveAssist,
      })
      .select("id")
      .single()
    if (insertError || !data) {
      setError(insertError?.message ?? "Erro ao registrar gol")
      return
    }
    setCurrentRound((prev) =>
      prev
        ? {
            ...prev,
            goals: [
              ...prev.goals,
              { id: data.id as string, teamId, playerId, assistPlayerId: effectiveAssist },
            ],
          }
        : prev
    )
  }

  async function removeGoal(goalId: string) {
    if (!currentRound) return
    const { error: deleteError } = await supabase
      .from("match_round_goals")
      .delete()
      .eq("id", goalId)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setCurrentRound((prev) =>
      prev ? { ...prev, goals: prev.goals.filter((g) => g.id !== goalId) } : prev
    )
  }

  function suggestedBorrowFor(need: PendingBorrowNeed): BorrowCandidate[] {
    return suggestBorrowedPlayers(need.candidates, need.count)
  }

  async function confirmBorrow(teamId: string, selections: BorrowCandidate[]) {
    if (!currentRound) return { error: "Nenhuma rodada ativa" }
    const { error: insertError } = await supabase.from("match_round_borrowed_players").insert(
      selections.map((s) => ({
        round_id: currentRound.id,
        team_id: teamId,
        player_id: s.player.id,
        borrowed_from_team_id: s.fromTeamId,
      }))
    )
    if (insertError) {
      setError(insertError.message)
      return { error: insertError.message }
    }
    await load()
    return { error: null }
  }

  async function endRound() {
    if (!currentRound || !match) return { error: "Nenhuma rodada ativa" }
    const homeScore = currentRound.goals.filter((g) => g.teamId === currentRound.homeTeamId).length
    const awayScore = currentRound.goals.filter((g) => g.teamId === currentRound.awayTeamId).length
    const result: RoundResult = homeScore === awayScore ? "tie" : homeScore > awayScore ? "home_win" : "away_win"

    if (result === "tie") {
      // There's no winner to decide anything automatically — always ask the
      // organizer how to resolve it, instead of silently picking a behavior.
      setPendingTieDecision({ homeTeamId: currentRound.homeTeamId, awayTeamId: currentRound.awayTeamId })
      return { error: null, needsTieDecision: true }
    }

    return finalizeRound(result)
  }

  /**
   * Backs out of the whole tie-resolution flow — nothing in it writes to the
   * DB until `finalizeRound` actually runs, so clearing this local state is
   * always safe and simply returns the organizer to the still-in-progress round.
   */
  function cancelTieFlow() {
    setPendingTieDecision(null)
    setPendingTieOrder(null)
    setPendingDirectWinner(null)
    setPendingPenaltyFirstKicker(null)
  }

  function chooseTieResolution(mode: TieResolutionMode) {
    if (!pendingTieDecision) return
    const { homeTeamId, awayTeamId } = pendingTieDecision
    if (mode === "both_leave") {
      setPendingTieOrder({ homeTeamId, awayTeamId })
    } else if (mode === "direct") {
      setPendingDirectWinner({ homeTeamId, awayTeamId })
    } else {
      // Ask who kicks first before starting the shootout — no rule says home goes first.
      setPendingPenaltyFirstKicker({ homeTeamId, awayTeamId })
    }
    setPendingTieDecision(null)
  }

  function startPenaltyShootout(firstKickerTeamId: string, regulationKicks: number) {
    if (!pendingPenaltyFirstKicker || !currentRound) return
    const { homeTeamId, awayTeamId } = pendingPenaltyFirstKicker
    setPenaltyShootout({ roundId: currentRound.id, homeTeamId, awayTeamId, firstKickerTeamId, regulationKicks, kicks: [] })
    setPendingPenaltyFirstKicker(null)
  }

  async function confirmTieOrder(lastTeamId: string) {
    const result = await finalizeRound("tie", lastTeamId)
    setPendingTieOrder(null)
    return result
  }

  async function declareDirectWinner(winnerTeamId: string) {
    if (!pendingDirectWinner) return { error: "Nenhuma decisão pendente" }
    const result: RoundResult = winnerTeamId === pendingDirectWinner.homeTeamId ? "home_win" : "away_win"
    const outcome = await finalizeRound(result, undefined, "direct")
    setPendingDirectWinner(null)
    return outcome
  }

  // Small pickup teams default to a shorter shootout (best of 3/4) instead
  // of always best of 5 — see `regulationKicksFor`. The organizer can still
  // override it (best of 3/4/5) when choosing who kicks first.
  const defaultPenaltyBestOf = regulationKicksFor(match?.players_per_team ?? 5)

  function penaltyState(): PenaltyState | null {
    if (!penaltyShootout) return null
    return resolvePenaltyShootout(
      penaltyShootout.kicks,
      penaltyShootout.homeTeamId,
      penaltyShootout.awayTeamId,
      penaltyShootout.firstKickerTeamId,
      penaltyShootout.regulationKicks
    )
  }

  async function recordPenaltyKick(teamId: string, scored: boolean) {
    if (!penaltyShootout) return
    const sequence = penaltyShootout.kicks.length
    const { data, error: insertError } = await supabase
      .from("match_round_penalty_kicks")
      .insert({ round_id: penaltyShootout.roundId, team_id: teamId, sequence, scored })
      .select("id")
      .single()
    if (insertError || !data) {
      setError(insertError?.message ?? "Erro ao registrar cobrança")
      return
    }
    setPenaltyShootout((prev) =>
      prev ? { ...prev, kicks: [...prev.kicks, { id: data.id as string, teamId, scored }] } : prev
    )
  }

  async function undoLastPenaltyKick() {
    if (!penaltyShootout || penaltyShootout.kicks.length === 0) return
    const last = penaltyShootout.kicks[penaltyShootout.kicks.length - 1]!
    const { error: deleteError } = await supabase
      .from("match_round_penalty_kicks")
      .delete()
      .eq("id", last.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setPenaltyShootout((prev) => (prev ? { ...prev, kicks: prev.kicks.slice(0, -1) } : prev))
  }

  async function confirmPenaltyWinner() {
    if (!penaltyShootout) return { error: "Nenhuma cobrança em andamento" }
    const state = penaltyState()
    if (!state?.decided || !state.winnerTeamId) return { error: "A cobrança ainda não foi decidida" }
    const result: RoundResult = state.winnerTeamId === penaltyShootout.homeTeamId ? "home_win" : "away_win"
    const outcome = await finalizeRound(result, undefined, "penalties")
    setPenaltyShootout(null)
    return outcome
  }

  async function finalizeRound(
    result: RoundResult,
    tieLastTeamId?: string,
    decidedBy: RoundDecidedBy = "regulation"
  ) {
    if (!currentRound || !match) return { error: "Nenhuma rodada ativa" }

    const finishedRoundId = currentRound.id
    const previousQueuePositions = teams.map((t) => ({ teamId: t.id, queuePosition: t.queuePosition }))

    const { error: finishError } = await supabase
      .from("match_rounds")
      .update({ status: "finished", result, decided_by: decidedBy, finished_at: new Date().toISOString() })
      .eq("id", currentRound.id)
    if (finishError) {
      setError(finishError.message)
      return { error: finishError.message }
    }

    const rotationTeams: RotationTeam[] = teams.map((t) => ({ id: t.id, queuePosition: t.queuePosition }))
    const outcome = resolveRoundOutcome({
      teams: rotationTeams,
      homeTeamId: currentRound.homeTeamId,
      awayTeamId: currentRound.awayTeamId,
      result,
      tieBothLeaveAllowed: match.tie_both_leave_allowed,
      tieLastTeamId,
    })

    async function carryOverBorrowedPlayers(newRoundId: string, continuingTeamIds: string[]) {
      const rows = currentRound!.borrowedPlayers
        .filter((b) => continuingTeamIds.includes(b.teamId))
        .map((b) => ({
          round_id: newRoundId,
          team_id: b.teamId,
          player_id: b.player.id,
          borrowed_from_team_id: b.fromTeamId,
        }))
      if (rows.length === 0) return null
      const { error: carryOverError } = await supabase.from("match_round_borrowed_players").insert(rows)
      return carryOverError?.message ?? null
    }

    if (outcome.type === "replay") {
      const { data: newRound, error: insertError } = await supabase
        .from("match_rounds")
        .insert({
          match_id: matchId,
          sequence: currentRound.sequence + 1,
          home_team_id: currentRound.homeTeamId,
          away_team_id: currentRound.awayTeamId,
          status: "in_progress",
          ...freshRoundTimestamps(),
        })
        .select("id")
        .single()
      if (insertError || !newRound) {
        setError(insertError?.message ?? "Erro ao criar a próxima rodada")
        return { error: insertError?.message ?? "Erro ao criar a próxima rodada" }
      }
      // Same two teams keep playing — any borrowed players stay put, no need to re-pick.
      const carryOverError = await carryOverBorrowedPlayers(newRound.id as string, [
        currentRound.homeTeamId,
        currentRound.awayTeamId,
      ])
      if (carryOverError) {
        setError(carryOverError)
        return { error: carryOverError }
      }
      setUndoSnapshot({ finishedRoundId, newRoundId: newRound.id as string, previousQueuePositions })
      await load()
      return { error: null, result }
    }

    for (const update of outcome.queuePositionUpdates) {
      const { error: posError } = await supabase
        .from("teams")
        .update({ queue_position: update.queuePosition })
        .eq("id", update.teamId)
      if (posError) {
        setError(posError.message)
        return { error: posError.message }
      }
    }

    const { data: newRound, error: insertError } = await supabase
      .from("match_rounds")
      .insert({
        match_id: matchId,
        sequence: currentRound.sequence + 1,
        home_team_id: outcome.nextHomeTeamId,
        away_team_id: outcome.nextAwayTeamId,
        status: "in_progress",
        ...freshRoundTimestamps(),
      })
      .select("id")
      .single()
    if (insertError || !newRound) {
      setError(insertError?.message ?? "Erro ao criar a próxima rodada")
      return { error: insertError?.message ?? "Erro ao criar a próxima rodada" }
    }

    // Whoever STAYED on court (didn't just enter from the queue) keeps their
    // borrowed players — only a fresh entrant needs the borrow prompt.
    const stayingTeamIds = [outcome.nextHomeTeamId, outcome.nextAwayTeamId].filter(
      (id) => id === currentRound!.homeTeamId || id === currentRound!.awayTeamId
    )
    const carryOverError = await carryOverBorrowedPlayers(newRound.id as string, stayingTeamIds)
    if (carryOverError) {
      setError(carryOverError)
      return { error: carryOverError }
    }

    setUndoSnapshot({ finishedRoundId, newRoundId: newRound.id as string, previousQueuePositions })

    const beforeIds = new Set([currentRound.homeTeamId, currentRound.awayTeamId])
    const afterIds = new Set([outcome.nextHomeTeamId, outcome.nextAwayTeamId])
    const leaving = teams.filter((t) => beforeIds.has(t.id) && !afterIds.has(t.id))
    const entering = teams.filter((t) => afterIds.has(t.id) && !beforeIds.has(t.id))
    if (leaving.length > 0 || entering.length > 0) {
      setPendingTransition({ leaving, entering })
      return { error: null, result }
    }

    await load()
    return { error: null, result }
  }

  async function confirmTransition() {
    setPendingTransition(null)
    await load()
  }

  /**
   * Safety net for "I ended the wrong game": deletes the round that was just
   * created, reopens the one that was just finished (clearing its result),
   * and puts every team's queue position back to what it was before the
   * rotation — undoing exactly one `finalizeRound` call, not a full history.
   */
  async function undoLastRound() {
    if (!undoSnapshot) return { error: "Nada para desfazer" }
    const { finishedRoundId, newRoundId, previousQueuePositions } = undoSnapshot

    // Delete anything hanging off the round being discarded before the round itself.
    await supabase.from("match_round_penalty_kicks").delete().eq("round_id", newRoundId)
    await supabase.from("match_round_borrowed_players").delete().eq("round_id", newRoundId)
    await supabase.from("match_round_goals").delete().eq("round_id", newRoundId)
    const { error: deleteRoundError } = await supabase.from("match_rounds").delete().eq("id", newRoundId)
    if (deleteRoundError) {
      setError(deleteRoundError.message)
      return { error: deleteRoundError.message }
    }

    const { error: revertError } = await supabase
      .from("match_rounds")
      .update({ status: "in_progress", result: null, decided_by: null, finished_at: null })
      .eq("id", finishedRoundId)
    if (revertError) {
      setError(revertError.message)
      return { error: revertError.message }
    }

    for (const { teamId, queuePosition } of previousQueuePositions) {
      const { error: posError } = await supabase
        .from("teams")
        .update({ queue_position: queuePosition })
        .eq("id", teamId)
      if (posError) {
        setError(posError.message)
        return { error: posError.message }
      }
    }

    setUndoSnapshot(null)
    await load()
    return { error: null }
  }

  async function finishMatch() {
    const { error: statusError } = await supabase
      .from("matches")
      .update({ status: "finished" })
      .eq("id", matchId)
    if (statusError) {
      setError(statusError.message)
      return { error: statusError.message }
    }
    await load()
    return { error: null }
  }

  async function pauseTimer() {
    if (!currentRound || currentRound.pausedAt) return
    const pausedAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from("match_rounds")
      .update({ paused_at: pausedAt })
      .eq("id", currentRound.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setCurrentRound((prev) => (prev ? { ...prev, pausedAt } : prev))
  }

  async function resumeTimer() {
    if (!currentRound || !currentRound.pausedAt) return
    const pausedSeconds =
      currentRound.pausedSeconds + Math.round((Date.now() - new Date(currentRound.pausedAt).getTime()) / 1000)
    const { error: updateError } = await supabase
      .from("match_rounds")
      .update({ paused_at: null, paused_seconds: pausedSeconds })
      .eq("id", currentRound.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setCurrentRound((prev) => (prev ? { ...prev, pausedAt: null, pausedSeconds } : prev))
  }

  /**
   * Zeroes the clock back to 00:00 while staying paused — "consumes" all
   * elapsed time as pause time instead of touching `started_at`, so the
   * organizer can restart from a clean zero at the exact right moment
   * without it being confused with a brand-new round.
   */
  async function restartTimer() {
    if (!currentRound || !currentRound.pausedAt) return
    // paused_seconds is an integer column — elapsedSecondsFor returns a float
    // (ms/1000), so round it before persisting.
    const pausedSeconds = currentRound.pausedSeconds + Math.round(elapsedSecondsFor(currentRound))
    const { error: updateError } = await supabase
      .from("match_rounds")
      .update({ paused_seconds: pausedSeconds })
      .eq("id", currentRound.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setCurrentRound((prev) => (prev ? { ...prev, pausedSeconds } : prev))
  }

  async function reopenMatch() {
    const { data: roundRows, error: roundError } = await supabase
      .from("match_rounds")
      .select("*")
      .eq("match_id", matchId)
      .order("sequence", { ascending: false })
      .limit(1)
    if (roundError) {
      setError(roundError.message)
      return { error: roundError.message }
    }
    const latestRound = roundRows?.[0]

    if (!latestRound || latestRound.status === "finished") {
      if (teams.length < 2) return { error: "É preciso pelo menos 2 times" }
      const [first, second] = [...teams].sort((a, b) => a.queuePosition - b.queuePosition)
      const { error: insertError } = await supabase.from("match_rounds").insert({
        match_id: matchId,
        sequence: (latestRound?.sequence ?? 0) + 1,
        home_team_id: first!.id,
        away_team_id: second!.id,
        status: "in_progress",
        ...freshRoundTimestamps(),
      })
      if (insertError) {
        setError(insertError.message)
        return { error: insertError.message }
      }
    }

    const { error: statusError } = await supabase
      .from("matches")
      .update({ status: "in_progress" })
      .eq("id", matchId)
    if (statusError) {
      setError(statusError.message)
      return { error: statusError.message }
    }
    await load()
    return { error: null }
  }

  return {
    match,
    teams,
    currentRound,
    pendingBorrows,
    conflictWarnings,
    pendingTieOrder,
    pendingTieDecision,
    pendingDirectWinner,
    pendingPenaltyFirstKicker,
    penaltyShootout,
    penaltyState: penaltyState(),
    defaultPenaltyBestOf,
    pendingTransition,
    canUndoLastRound: !!undoSnapshot,
    phase,
    loading,
    error,
    startLiveMatch,
    recordGoal,
    removeGoal,
    suggestedBorrowFor,
    confirmBorrow,
    endRound,
    cancelTieFlow,
    chooseTieResolution,
    confirmTieOrder,
    declareDirectWinner,
    startPenaltyShootout,
    recordPenaltyKick,
    undoLastPenaltyKick,
    confirmPenaltyWinner,
    confirmTransition,
    undoLastRound,
    finishMatch,
    reopenMatch,
    pauseTimer,
    resumeTimer,
    restartTimer,
    reload: load,
  }
}

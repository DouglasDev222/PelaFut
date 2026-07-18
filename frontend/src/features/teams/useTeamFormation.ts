import { useCallback, useEffect, useState } from "react"
import type { Player } from "@pelafut/shared"
import { supabase } from "@/lib/supabaseClient"
import { colorForIndex } from "@/features/teams/teamColors"

export interface FormationTeam {
  number: number
  color: string
  captainId: string | null
  players: Player[]
}

export type FormationPhase = "setup" | "draft" | "done"

/** A full snapshot of the draft state taken before a pick, so it can be undone. */
interface DraftSnapshot {
  teams: FormationTeam[]
  availablePlayers: Player[]
  currentTeamIndex: number
  phase: FormationPhase
}

export function captainFirst(team: FormationTeam): Player[] {
  if (!team.captainId) return team.players
  const captain = team.players.find((p) => p.id === team.captainId)
  if (!captain) return team.players
  return [captain, ...team.players.filter((p) => p.id !== team.captainId)]
}

function emptyTeams(numTeams: number): FormationTeam[] {
  return Array.from({ length: numTeams }, (_, i) => ({
    number: i + 1,
    color: colorForIndex(i).hex,
    captainId: null,
    players: [],
  }))
}

/**
 * When the participant count doesn't divide evenly by playersPerTeam, the
 * shortfall goes entirely into the last team instead of being spread thin
 * across the last few teams (e.g. 13 players / 3 per team => four teams of
 * 3 plus one reserve team of 1, not two teams of 2).
 */
export function teamCapacity(
  teamIndex: number,
  numTeams: number,
  playersPerTeam: number,
  totalParticipants: number
): number {
  const remainder = playersPerTeam > 0 ? totalParticipants % playersPerTeam : 0
  const isReserveTeam = remainder > 0 && teamIndex === numTeams - 1
  return isReserveTeam ? remainder : playersPerTeam
}

/**
 * Only the "full" teams (the ones that fit exactly playersPerTeam players)
 * take active turns in the draft. If there's a remainder, it does not get an
 * active turn at all — it's a passive reserve team that automatically
 * receives whichever player(s) are left over once every active team is
 * full, rather than getting an early pick of its own.
 */
function splitPlan(totalParticipants: number, playersPerTeam: number) {
  if (playersPerTeam <= 0 || totalParticipants <= 0) {
    return { numActiveTeams: 0, remainder: 0 }
  }
  const fullTeams = Math.floor(totalParticipants / playersPerTeam)
  const remainder = totalParticipants % playersPerTeam
  if (fullTeams === 0) {
    // Not even enough players for one full team: draft normally into the one team there is.
    return { numActiveTeams: 1, remainder: 0 }
  }
  return { numActiveTeams: fullTeams, remainder }
}

/**
 * How many players each team drafts during the active turn rotation. Full
 * teams always draft up to `playersPerTeam`. A reserve team (the last team,
 * short of a full squad) drafts up to its `remainder` capacity only when
 * `reserveDrafts` is on — otherwise it drafts 0: it takes no active turn and
 * is filled automatically with whoever is left over.
 */
function draftCapacityFor(
  teamIndex: number,
  numTeams: number,
  numActiveTeams: number,
  playersPerTeam: number,
  remainder: number,
  reserveDrafts: boolean
): number {
  const isReserveTeam = numTeams > numActiveTeams && teamIndex === numTeams - 1
  if (isReserveTeam) return reserveDrafts ? remainder : 0
  return playersPerTeam
}

function nextTeamIndex(
  currentTeams: FormationTeam[],
  fromIndex: number,
  capacityFor: (teamIndex: number) => number
): number {
  const n = currentTeams.length
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n
    if (currentTeams[idx].players.length < capacityFor(idx)) return idx
  }
  return fromIndex
}

export function useTeamFormation(matchId: string) {
  const [teams, setTeams] = useState<FormationTeam[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [participants, setParticipants] = useState<Player[]>([])
  const [playersPerTeam, setPlayersPerTeam] = useState(0)
  const [phase, setPhase] = useState<FormationPhase>("setup")
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Once true, stays true for this hook's lifetime — lets the caller tell a
  // genuine first-time setup apart from a "redo" that has a saved board to
  // cancel back to (see resetDraft/"Refazer times").
  const [hasSavedTeams, setHasSavedTeams] = useState(false)
  const [matchStatus, setMatchStatus] = useState<string | null>(null)
  // When on, a reserve team drafts its own players (and captain) in turn
  // order instead of being auto-filled with leftovers. Set on the setup card.
  const [reserveDraftsActively, setReserveDraftsActively] = useState(false)
  // Undo stack for the draft: one snapshot per pick, letting the organizer
  // step back and correct a mistaken choice.
  const [draftHistory, setDraftHistory] = useState<DraftSnapshot[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("players_per_team, status")
      .eq("id", matchId)
      .single()
    if (matchError || !match) {
      setError(matchError?.message ?? "Pelada não encontrada")
      setLoading(false)
      return
    }
    setPlayersPerTeam(match.players_per_team)
    setMatchStatus(match.status as string)

    const { data: matchPlayers, error: mpError } = await supabase
      .from("match_players")
      .select("players(*)")
      .eq("match_id", matchId)
    if (mpError) {
      setError(mpError.message)
      setLoading(false)
      return
    }
    const loadedParticipants = ((matchPlayers ?? []) as unknown as { players: Player }[]).map(
      (r) => r.players
    )
    setParticipants(loadedParticipants)

    const { data: existingTeams, error: teamsError } = await supabase
      .from("teams")
      .select("id, color, position, captain_player_id, team_players(player_id, players(*))")
      .eq("match_id", matchId)
      .order("position")
    if (teamsError) {
      setError(teamsError.message)
      setLoading(false)
      return
    }

    if (existingTeams && existingTeams.length > 0) {
      setTeams(
        existingTeams.map((t, i) => ({
          number: i + 1,
          color: t.color,
          captainId: t.captain_player_id,
          players: (t.team_players as unknown as { players: Player }[]).map((tp) => tp.players),
        }))
      )
      setAvailablePlayers([])
      setPhase("done")
      setHasSavedTeams(true)
      setLoading(false)
      return
    }

    const numTeams =
      loadedParticipants.length > 0 && match.players_per_team > 0
        ? Math.ceil(loadedParticipants.length / match.players_per_team)
        : 0
    setTeams(emptyTeams(numTeams))
    setAvailablePlayers(loadedParticipants)
    setCurrentTeamIndex(0)
    setDraftHistory([])
    setPhase("setup")
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    load()
  }, [load])

  function setTeamColor(teamIndex: number, color: string) {
    setTeams((prev) => prev.map((t, i) => (i === teamIndex ? { ...t, color } : t)))
  }

  function startDraft() {
    setCurrentTeamIndex(0)
    setDraftHistory([])
    setPhase("draft")
  }

  function pickPlayer(playerId: string) {
    // Reject invalid picks up front so we don't push a no-op undo snapshot.
    const pickingTeam = teams[currentTeamIndex]
    const pickedPlayer = availablePlayers.find((p) => p.id === playerId)
    if (!pickingTeam || !pickedPlayer || pickingTeam.players.some((p) => p.id === pickedPlayer.id)) {
      return
    }
    setDraftHistory((h) => [...h, { teams, availablePlayers, currentTeamIndex, phase }])

    let updatedTeams = teams
    setTeams((prev) => {
      const team = prev[currentTeamIndex]
      const player = availablePlayers.find((p) => p.id === playerId)
      if (!team || !player || team.players.some((p) => p.id === player.id)) {
        updatedTeams = prev
        return prev
      }
      const next = prev.map((t, i) =>
        i === currentTeamIndex
          ? {
              ...t,
              captainId: t.captainId ?? player.id,
              players: [...t.players, player],
            }
          : t
      )
      updatedTeams = next
      return next
    })
    setAvailablePlayers((prev) => {
      const remaining = prev.filter((p) => p.id !== playerId)
      const { numActiveTeams, remainder } = splitPlan(participants.length, playersPerTeam)
      const hasReserveTeam = updatedTeams.length > numActiveTeams
      const capacityFor = (i: number) =>
        draftCapacityFor(i, updatedTeams.length, numActiveTeams, playersPerTeam, remainder, reserveDraftsActively)

      if (hasReserveTeam && !reserveDraftsActively && remainder > 0 && remaining.length === remainder) {
        // Passive reserve: once every active team is full, whoever is left
        // over goes straight into it — no active turn to "pick".
        setTeams((prevTeams) => {
          const reserveIndex = prevTeams.length - 1
          const reserveTeam = prevTeams[reserveIndex]
          if (!reserveTeam) return prevTeams
          const toAdd = remaining.filter(
            (p) => !reserveTeam.players.some((rp) => rp.id === p.id)
          )
          if (toAdd.length === 0) return prevTeams
          return prevTeams.map((t, i) =>
            i === reserveIndex
              ? {
                  ...t,
                  captainId: t.captainId ?? toAdd[0]!.id,
                  players: [...t.players, ...toAdd],
                }
              : t
          )
        })
        // Draft complete — don't auto-advance; the organizer reviews and confirms.
        return []
      }

      if (remaining.length > 0) {
        setCurrentTeamIndex(nextTeamIndex(updatedTeams, currentTeamIndex, capacityFor))
      }
      // When remaining is empty the draft is done, but we stay on the draft
      // screen so the organizer can double-check before confirming.
      return remaining
    })
  }

  /** Moves from the (completed) draft to the board once the organizer confirms. */
  function finishDraft() {
    setPhase("done")
  }

  /** Reverses the most recent pick, restoring the exact state before it. */
  function undoLastPick() {
    if (draftHistory.length === 0) return
    const snapshot = draftHistory[draftHistory.length - 1]!
    setTeams(snapshot.teams)
    setAvailablePlayers(snapshot.availablePlayers)
    setCurrentTeamIndex(snapshot.currentTeamIndex)
    setPhase(snapshot.phase)
    setDraftHistory((h) => h.slice(0, -1))
  }

  function movePlayer(playerId: string, fromTeamIndex: number, toTeamIndex: number) {
    if (fromTeamIndex === toTeamIndex) return
    setTeams((prev) => {
      const next = prev.map((t) => ({ ...t, players: [...t.players] }))
      const fromTeam = next[fromTeamIndex]
      const toTeam = next[toTeamIndex]
      if (!fromTeam || !toTeam) return prev
      const playerIdx = fromTeam.players.findIndex((p) => p.id === playerId)
      if (playerIdx === -1) return prev
      const [player] = fromTeam.players.splice(playerIdx, 1)
      if (player) {
        toTeam.players.push(player)
        // An empty / captain-less destination makes the arriving player its captain.
        toTeam.captainId = toTeam.captainId ?? player.id
      }
      // Moving the captain out promotes the next player in the list (or none if empty).
      if (fromTeam.captainId === playerId) {
        fromTeam.captainId = fromTeam.players[0]?.id ?? null
      }
      return next
    })
  }

  function setCaptain(teamIndex: number, playerId: string) {
    setTeams((prev) =>
      prev.map((t, i) => (i === teamIndex ? { ...t, captainId: playerId } : t))
    )
  }

  /**
   * Steps back from the draft to the setup screen — unlike `resetDraft`
   * ("Refazer times", an explicit full restart), this keeps each team's
   * chosen color and only clears the in-progress picks, since it's meant
   * for "let me reconsider before picking further", not a do-over.
   *
   * Memoized: a caller (TeamFormationPage) depends on this in a `useEffect`
   * dependency array — a plain function re-created every render would make
   * that effect re-fire every render, an infinite update loop.
   */
  const backToSetup = useCallback(() => {
    setTeams((prev) => prev.map((t) => ({ ...t, players: [], captainId: null })))
    setAvailablePlayers(participants)
    setCurrentTeamIndex(0)
    setDraftHistory([])
    setPhase("setup")
  }, [participants])

  function resetDraft() {
    const numTeams =
      participants.length > 0 && playersPerTeam > 0
        ? Math.ceil(participants.length / playersPerTeam)
        : teams.length
    setTeams(emptyTeams(numTeams))
    setAvailablePlayers(participants)
    setCurrentTeamIndex(0)
    setReserveDraftsActively(false)
    setDraftHistory([])
    setPhase("setup")
  }

  /**
   * Changes the players-per-team setting mid-flow and re-forms from a fresh
   * setup with the recomputed team count. Only offered in the setup phase, so
   * there are never drafted picks to lose here.
   */
  async function changePlayersPerTeam(n: number): Promise<{ error: string | null }> {
    const { error: updateError } = await supabase
      .from("matches")
      .update({ players_per_team: n })
      .eq("id", matchId)
    if (updateError) {
      setError(updateError.message)
      return { error: updateError.message }
    }
    setPlayersPerTeam(n)
    const numTeams = participants.length > 0 && n > 0 ? Math.ceil(participants.length / n) : 0
    setTeams(emptyTeams(numTeams))
    setAvailablePlayers(participants)
    setCurrentTeamIndex(0)
    setReserveDraftsActively(false)
    setDraftHistory([])
    setPhase("setup")
    return { error: null }
  }

  async function save() {
    setSaving(true)
    setError(null)

    // Update the existing teams in place instead of delete+recreate. Deleting
    // teams would change their ids (and cascade-delete match_rounds/goals), wipe
    // the queue (queue_position), and force the status back — which breaks a
    // pelada that's already in progress when you just want to tweak the rosters.
    const { data: existing, error: fetchError } = await supabase
      .from("teams")
      .select("id, position, queue_position")
      .eq("match_id", matchId)
      .order("position")
    if (fetchError) {
      setError(fetchError.message)
      setSaving(false)
      return { error: fetchError.message }
    }
    const existingByPos = new Map<number, string>(
      (existing ?? []).map((t) => [t.position as number, t.id as string])
    )

    const savedTeamIds: string[] = []
    for (let i = 0; i < teams.length; i++) {
      const t = teams[i]!
      const captainId = t.players.some((p) => p.id === t.captainId) ? t.captainId : null
      const prevId = existingByPos.get(i)
      if (prevId) {
        // Keeps the team's id and queue_position untouched.
        const { error: updError } = await supabase
          .from("teams")
          .update({ name: `Time ${t.number}`, color: t.color, captain_player_id: captainId })
          .eq("id", prevId)
        if (updError) {
          setError(updError.message)
          setSaving(false)
          return { error: updError.message }
        }
        // Replace the roster — team_players doesn't cascade to rounds/history.
        const { error: delTpError } = await supabase.from("team_players").delete().eq("team_id", prevId)
        if (delTpError) {
          setError(delTpError.message)
          setSaving(false)
          return { error: delTpError.message }
        }
        savedTeamIds.push(prevId)
      } else {
        const { data: ins, error: insError } = await supabase
          .from("teams")
          .insert({
            match_id: matchId,
            name: `Time ${t.number}`,
            color: t.color,
            position: i,
            captain_player_id: captainId,
          })
          .select("id")
          .single()
        if (insError || !ins) {
          setError(insError?.message ?? "Erro ao salvar times")
          setSaving(false)
          return { error: insError?.message ?? "Erro ao salvar times" }
        }
        savedTeamIds.push(ins.id as string)
      }
    }

    // Remove teams that no longer exist (fewer teams than before).
    for (const [pos, id] of existingByPos) {
      if (pos >= teams.length) {
        const { error: delError } = await supabase.from("teams").delete().eq("id", id)
        if (delError) {
          setError(delError.message)
          setSaving(false)
          return { error: delError.message }
        }
      }
    }

    const teamPlayersRows = teams.flatMap((t, i) =>
      t.players.map((p) => ({
        team_id: savedTeamIds[i]!,
        player_id: p.id,
        is_goalkeeper: p.position === "goleiro",
      }))
    )
    if (teamPlayersRows.length > 0) {
      const { error: insertTpError } = await supabase.from("team_players").insert(teamPlayersRows)
      if (insertTpError) {
        setError(insertTpError.message)
        setSaving(false)
        return { error: insertTpError.message }
      }
    }

    // Only move a draft forward to "teams_formed". Never downgrade a pelada
    // that's already in progress or finished — editing rosters mid-match keeps
    // it running, with the queue intact.
    if (matchStatus !== "in_progress" && matchStatus !== "finished") {
      const { error: statusError } = await supabase
        .from("matches")
        .update({ status: "teams_formed" })
        .eq("id", matchId)
      if (statusError) {
        setError(statusError.message)
        setSaving(false)
        return { error: statusError.message }
      }
    }

    setSaving(false)
    await load()
    return { error: null }
  }

  /**
   * Deletes the formed teams and drops the match back to "draft". Only meant
   * for matches still in the formation stage (guarded by the caller) — for a
   * match that's been played, the game data lives on `match_rounds`, which
   * cascades off `teams`, so this must never run there.
   */
  async function resetToDraft(): Promise<{ error: string | null }> {
    const { error: deleteError } = await supabase.from("teams").delete().eq("match_id", matchId)
    if (deleteError) {
      setError(deleteError.message)
      return { error: deleteError.message }
    }
    const { error: statusError } = await supabase
      .from("matches")
      .update({ status: "draft" })
      .eq("id", matchId)
    if (statusError) {
      setError(statusError.message)
      return { error: statusError.message }
    }
    return { error: null }
  }

  return {
    teams,
    availablePlayers,
    playersPerTeam,
    phase,
    currentTeamIndex,
    loading,
    saving,
    error,
    hasSavedTeams,
    matchStatus,
    reserveDraftsActively,
    setReserveDraftsActively,
    changePlayersPerTeam,
    resetToDraft,
    canUndoLastPick: draftHistory.length > 0,
    setTeamColor,
    startDraft,
    pickPlayer,
    finishDraft,
    undoLastPick,
    movePlayer,
    setCaptain,
    backToSetup,
    resetDraft,
    save,
    reload: load,
  }
}

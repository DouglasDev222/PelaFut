import type { Uuid } from "./common.js"

export type RoundStatus = "in_progress" | "finished"
export type RoundResult = "home_win" | "away_win" | "tie"

export interface MatchRound {
  id: Uuid
  match_id: Uuid
  sequence: number
  home_team_id: Uuid
  away_team_id: Uuid
  status: RoundStatus
  result: RoundResult | null
  started_at: string
  finished_at: string | null
  paused_at: string | null
  paused_seconds: number
}

export interface MatchRoundGoal {
  id: Uuid
  round_id: Uuid
  team_id: Uuid
  player_id: Uuid
  created_at: string
}

export interface BorrowedPlayer {
  id: Uuid
  round_id: Uuid
  team_id: Uuid
  player_id: Uuid
  borrowed_from_team_id: Uuid
}

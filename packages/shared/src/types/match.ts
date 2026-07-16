import type { Uuid } from "./common.js"

export type EndCondition = "time" | "goals" | "both"
export type MatchStatus = "draft" | "teams_formed" | "in_progress" | "finished"

export interface Match {
  id: Uuid
  owner_id: Uuid
  name: string
  location: string | null
  match_date: string
  start_time: string | null
  max_players: number
  players_per_team: number
  end_condition: EndCondition
  match_duration_minutes: number | null
  goals_to_win: number | null
  tie_both_leave_allowed: boolean
  max_time_per_team_minutes: number | null
  status: MatchStatus
  created_at: string
  updated_at: string
}

export type MatchInput = Pick<
  Match,
  | "name"
  | "location"
  | "match_date"
  | "start_time"
  | "max_players"
  | "players_per_team"
  | "end_condition"
  | "match_duration_minutes"
  | "goals_to_win"
  | "tie_both_leave_allowed"
  | "max_time_per_team_minutes"
>

export interface MatchPlayer {
  id: Uuid
  match_id: Uuid
  player_id: Uuid
  created_at: string
}

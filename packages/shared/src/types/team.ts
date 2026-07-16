import type { Uuid } from "./common.js"

export interface Team {
  id: Uuid
  match_id: Uuid
  name: string
  color: string
  position: number
  created_at: string
}

export interface TeamPlayer {
  id: Uuid
  team_id: Uuid
  player_id: Uuid
  is_goalkeeper: boolean
}

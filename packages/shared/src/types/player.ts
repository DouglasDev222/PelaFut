import type { Uuid } from "./common.js"

export type PlayerPosition = "jogador" | "goleiro"

export interface Player {
  id: Uuid
  owner_id: Uuid
  name: string
  nickname: string | null
  photo_url: string | null
  active: boolean
  birth_date: string | null
  position: PlayerPosition
  skill_level: number | null
  shirt_number: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type PlayerInput = Pick<
  Player,
  | "name"
  | "nickname"
  | "photo_url"
  | "active"
  | "birth_date"
  | "position"
  | "skill_level"
  | "shirt_number"
  | "notes"
>

/** Case/accent-insensitive-ish normalization for the player search boxes. */
export function normalize(s: string) {
  return s.trim().toLowerCase()
}

/** Matches a player by name or nickname. An empty query matches everyone. */
export function matchesSearch(
  player: { name: string; nickname?: string | null },
  query: string
) {
  const q = normalize(query)
  if (!q) return true
  return normalize(player.name).includes(q) || normalize(player.nickname ?? "").includes(q)
}

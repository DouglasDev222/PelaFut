import type { Player } from "@pelafut/shared"
import type { PlayerStatLine } from "@/features/stats/aggregate"
import { Card, CardContent } from "@/components/ui/card"
import { PlayerAvatar } from "@/components/PlayerAvatar"

/** Everyone tied at the top for a metric, or an empty list when nobody scored. */
function leadersFor(
  playerStats: PlayerStatLine[],
  playersById: Map<string, Player>,
  key: "goals" | "assists"
) {
  const max = playerStats.reduce((best, s) => Math.max(best, s[key]), 0)
  if (max <= 0) return { players: [] as Player[], value: 0 }
  const players = playerStats
    .filter((s) => s[key] === max)
    .flatMap((s) => {
      const p = playersById.get(s.playerId)
      return p ? [p] : []
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  return { players, value: max }
}

function HighlightCard({
  icon,
  singular,
  plural,
  players,
  value,
  unit,
}: {
  icon: string
  singular: string
  plural: string
  players: Player[]
  value: number
  unit: (n: number) => string
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-3">
        <span className="text-xl leading-none">{icon}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            {/* Plural only for an actual tie — with nobody yet, "Artilheiros —"
                would read oddly, so the empty state keeps the singular. */}
            <span className="text-xs text-muted-foreground">
              {players.length > 1 ? plural : singular}
            </span>
            {value > 0 && (
              <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                {value} {unit(value)}
              </span>
            )}
          </div>

          {players.length === 0 ? (
            <span className="text-sm text-muted-foreground">—</span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {players.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <PlayerAvatar
                    photoUrl={p.photo_url}
                    name={p.name}
                    size="size-8"
                    iconSize="size-4"
                  />
                  <span className="truncate text-sm font-medium uppercase">
                    {p.name}
                    {p.nickname ? ` (${p.nickname})` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Top scorer(s) and top assister(s) with their photos. Ties list every player
 * involved — with the label switching to the plural so it reads as a tie.
 */
export function TopPlayersHighlight({
  playerStats,
  playersById,
}: {
  playerStats: PlayerStatLine[]
  playersById: Map<string, Player>
}) {
  const artilheiros = leadersFor(playerStats, playersById, "goals")
  const garcons = leadersFor(playerStats, playersById, "assists")

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <HighlightCard
        icon="⚽"
        singular="Artilheiro"
        plural="Artilheiros"
        players={artilheiros.players}
        value={artilheiros.value}
        unit={(n) => (n === 1 ? "gol" : "gols")}
      />
      <HighlightCard
        icon="🎯"
        singular="Garçom"
        plural="Garçons"
        players={garcons.players}
        value={garcons.value}
        unit={(n) => (n === 1 ? "assistência" : "assistências")}
      />
    </div>
  )
}

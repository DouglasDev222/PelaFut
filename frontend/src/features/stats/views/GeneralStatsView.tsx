import { useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { BarChart3, Search } from "lucide-react"
import type { AccountStatRow } from "@/features/stats/useAccountStats"
import { Legend, Th } from "@/features/stats/StatTable"
import { matchesSearch } from "@/features/players/searchPlayer"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

/** Numeric columns the table can be sorted by. */
export type SortKey =
  | "roundsPlayed"
  | "matchesPlayed"
  | "goals"
  | "assists"
  | "participations"
  | "wins"
  | "draws"
  | "losses"
  | "pointsPct"
  | "goalsPerGame"

const COLUMNS: { key: SortKey; abbr: string; label: string }[] = [
  { key: "roundsPlayed", abbr: "J", label: "Jogos (rodadas)" },
  { key: "matchesPlayed", abbr: "PJ", label: "Peladas jogadas" },
  { key: "goals", abbr: "G", label: "Gols" },
  { key: "assists", abbr: "A", label: "Assistências" },
  { key: "participations", abbr: "G+A", label: "Participações em gols" },
  { key: "wins", abbr: "V", label: "Vitórias" },
  { key: "draws", abbr: "E", label: "Empates" },
  { key: "losses", abbr: "D", label: "Derrotas" },
  { key: "pointsPct", abbr: "%", label: "Aproveitamento" },
  { key: "goalsPerGame", abbr: "G/J", label: "Média de gols por jogo" },
]

const MEDALS = ["🥇", "🥈", "🥉"]

function playerLabel(row: AccountStatRow) {
  const { name, nickname } = row.player
  return (nickname ? `${name} (${nickname})` : name).toUpperCase()
}

/** Top 8 for a metric, biggest first, dropping anyone with nothing to show. */
function topFor(rows: AccountStatRow[], key: SortKey) {
  return [...rows]
    .filter((r) => r[key] > 0)
    .sort((a, b) => b[key] - a[key] || playerLabel(a).localeCompare(playerLabel(b)))
    .slice(0, 8)
}

/** Leaderboard with a magnitude bar scaled to the leader. */
function Leaderboard({
  rows,
  metric,
  color,
  emptyLabel,
}: {
  rows: AccountStatRow[]
  metric: SortKey
  color: string
  emptyLabel: string
}) {
  const top = topFor(rows, metric)
  if (top.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">{emptyLabel}</p>
  }
  const max = top[0]![metric]
  return (
    <div className="flex flex-col gap-2.5">
      {top.map((row, i) => (
        <div key={row.player.id} className="flex items-center gap-2">
          <span className="w-6 shrink-0 text-center text-xs font-semibold text-muted-foreground">
            {MEDALS[i] ?? `${i + 1}º`}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm">{playerLabel(row)}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{row[metric]}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${max > 0 ? (row[metric] / max) * 100 : 0}%`, backgroundColor: color }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The account-wide player rankings. Presentational: the caller supplies the
 * already-aggregated rows and decides where a player row links to, so the
 * private app and the public page share this exact UI.
 */
export function GeneralStatsView({
  rows,
  matchesCount,
  hrefForPlayer,
  emptyState,
}: {
  rows: AccountStatRow[]
  matchesCount: number
  hrefForPlayer: (playerId: string) => string
  emptyState?: ReactNode
}) {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "goals",
    dir: "desc",
  })

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }
    )
  }

  const played = rows.filter((r) => r.roundsPlayed > 0)
  if (played.length === 0) {
    return (
      emptyState ?? (
        <EmptyState
          icon={BarChart3}
          title="Nenhum jogo finalizado ainda"
          description="As estatísticas aparecem assim que a primeira pelada tiver jogos encerrados."
        />
      )
    )
  }

  const filtered = rows.filter((r) => matchesSearch(r.player, search))
  const sorted = [...filtered].sort((a, b) => {
    const diff = sort.dir === "desc" ? b[sort.key] - a[sort.key] : a[sort.key] - b[sort.key]
    return diff || playerLabel(a).localeCompare(playerLabel(b))
  })

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {played.length} peladeiro{played.length === 1 ? "" : "s"} em {matchesCount} pelada
        {matchesCount === 1 ? "" : "s"}.
      </p>

      <Card>
        <CardContent className="pt-4">
          <Tabs defaultValue="gols">
            <TabsList>
              <TabsTab value="gols">⚽ Artilheiros</TabsTab>
              <TabsTab value="assistencias">🎯 Garçons</TabsTab>
              <TabsTab value="vitorias">🏅 Vitórias</TabsTab>
            </TabsList>
            <TabsPanel value="gols">
              <Leaderboard
                rows={rows}
                metric="goals"
                color="var(--chart-series-1)"
                emptyLabel="Nenhum gol marcado ainda."
              />
            </TabsPanel>
            <TabsPanel value="assistencias">
              <Leaderboard
                rows={rows}
                metric="assists"
                color="var(--chart-series-2)"
                emptyLabel="Nenhuma assistência registrada ainda."
              />
            </TabsPanel>
            <TabsPanel value="vitorias">
              <Leaderboard
                rows={rows}
                metric="wins"
                color="var(--chart-series-1)"
                emptyLabel="Nenhuma vitória ainda."
              />
            </TabsPanel>
          </Tabs>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar peladeiro..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum peladeiro encontrado"
          description={`Nada encontrado para "${search}".`}
        />
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    {/* Sticky so the name stays visible while scrolling the
                        numbers sideways on a phone. */}
                    <th
                      scope="col"
                      className="sticky left-0 z-10 bg-card py-1 pr-2 text-left font-medium"
                    >
                      Jogador
                    </th>
                    {COLUMNS.map((c) => (
                      <Th
                        key={c.key}
                        abbr={c.abbr}
                        label={c.label}
                        active={sort.key === c.key}
                        onClick={() => toggleSort(c.key)}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <tr
                      key={row.player.id}
                      onClick={() => navigate(hrefForPlayer(row.player.id))}
                      className="cursor-pointer border-t hover:bg-muted/40"
                    >
                      <td className="sticky left-0 z-10 max-w-[9rem] truncate bg-card py-1.5 pr-2 text-left">
                        {playerLabel(row)}
                      </td>
                      {COLUMNS.map((c) => (
                        <td
                          key={c.key}
                          className={cn(
                            "px-1 text-right tabular-nums",
                            sort.key === c.key && "font-semibold text-foreground"
                          )}
                        >
                          {c.key === "pointsPct"
                            ? `${Math.round(row.pointsPct)}%`
                            : c.key === "goalsPerGame"
                              ? row.goalsPerGame.toFixed(1)
                              : row[c.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Legend
              items={[
                ["J", "jogos (rodadas)"],
                ["PJ", "peladas jogadas"],
                ["G", "gols"],
                ["A", "assistências"],
                ["G+A", "participações em gols"],
                ["V", "vitórias"],
                ["E", "empates"],
                ["D", "derrotas"],
                ["%", "aproveitamento (vitória 3 · empate 1)"],
                ["G/J", "média de gols por jogo"],
              ]}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Toque num cabeçalho para ordenar · toque num peladeiro para ver o perfil.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  )
}

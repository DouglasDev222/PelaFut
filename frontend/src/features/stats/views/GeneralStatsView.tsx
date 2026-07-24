import { useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { BarChart3, Search, Trophy } from "lucide-react"
import type { AccountStatRow } from "@/features/stats/useAccountStats"
import { compareAccountPlayers, qualifyingMinPeladas } from "@/features/stats/aggregate"
import { PlayerName, usePlayerProfilePopup } from "@/features/stats/PlayerProfilePopup"
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
  hrefForPlayer,
}: {
  rows: AccountStatRow[]
  metric: SortKey
  color: string
  emptyLabel: string
  hrefForPlayer?: (playerId: string) => string
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
              <span className="truncate text-sm">
                <PlayerName playerId={row.player.id} href={hrefForPlayer?.(row.player.id)}>
                  {playerLabel(row)}
                </PlayerName>
              </span>
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
  const popup = usePlayerProfilePopup()
  const openPlayer = (playerId: string) =>
    popup ? popup.open(playerId) : navigate(hrefForPlayer(playerId))
  const [search, setSearch] = useState("")
  // Default view is the "best player" ranking (composite order + qualification).
  // Tapping a column header switches to plain exploration of that metric; the
  // "Jogador" header brings the ranking back.
  const [rankingMode, setRankingMode] = useState(true)
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "participations",
    dir: "desc",
  })

  function toggleSort(key: SortKey) {
    setRankingMode(false)
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

  const byRank = (a: AccountStatRow, b: AccountStatRow) =>
    compareAccountPlayers(a, b) || playerLabel(a).localeCompare(playerLabel(b))
  // The bar is computed over the whole account, not the search result, so
  // filtering never moves the qualification line.
  const minPeladas = qualifyingMinPeladas(rows.map((r) => r.matchesPlayed))
  const isQualified = (r: AccountStatRow) => minPeladas > 0 && r.matchesPlayed >= minPeladas
  const qualified = filtered.filter(isQualified).sort(byRank)
  const fewGames = filtered.filter((r) => !isQualified(r)).sort(byRank)
  // Only split when it actually separates people (a brand-new group where
  // nobody clears the bar just shows one plain ranking).
  const splitRanking = qualified.length > 0 && fewGames.length > 0
  const rankedAll = splitRanking ? qualified : [...filtered].sort(byRank)

  const columnSorted = [...filtered].sort((a, b) => {
    const diff = sort.dir === "desc" ? b[sort.key] - a[sort.key] : a[sort.key] - b[sort.key]
    return diff || playerLabel(a).localeCompare(playerLabel(b))
  })

  const colCount = COLUMNS.length + 1

  function renderRow(row: AccountStatRow, medalIndex: number | null, muted: boolean) {
    return (
      <tr
        key={row.player.id}
        onClick={() => openPlayer(row.player.id)}
        className={cn("cursor-pointer border-t hover:bg-muted/40", muted && "text-muted-foreground")}
      >
        <td className="sticky left-0 z-10 max-w-[9rem] truncate bg-card py-1.5 pr-2 text-left">
          {medalIndex != null && medalIndex < 3 && <span className="mr-1">{MEDALS[medalIndex]}</span>}
          {playerLabel(row)}
        </td>
        {COLUMNS.map((c) => (
          <td
            key={c.key}
            className={cn(
              "px-1 text-right tabular-nums",
              !rankingMode && sort.key === c.key && "font-semibold text-foreground"
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
    )
  }

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
                hrefForPlayer={hrefForPlayer}
              />
            </TabsPanel>
            <TabsPanel value="assistencias">
              <Leaderboard
                rows={rows}
                metric="assists"
                color="var(--chart-series-2)"
                emptyLabel="Nenhuma assistência registrada ainda."
                hrefForPlayer={hrefForPlayer}
              />
            </TabsPanel>
            <TabsPanel value="vitorias">
              <Leaderboard
                rows={rows}
                metric="wins"
                color="var(--chart-series-1)"
                emptyLabel="Nenhuma vitória ainda."
                hrefForPlayer={hrefForPlayer}
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

      {filtered.length === 0 ? (
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
                      {/* Doubles as the "back to ranking" control. */}
                      <button
                        type="button"
                        onClick={() => setRankingMode(true)}
                        className={cn(
                          "flex items-center gap-1",
                          rankingMode ? "text-foreground" : "hover:text-foreground"
                        )}
                      >
                        {rankingMode && <Trophy className="size-3.5 text-amber-500" />}
                        Jogador
                      </button>
                    </th>
                    {COLUMNS.map((c) => (
                      <Th
                        key={c.key}
                        abbr={c.abbr}
                        label={c.label}
                        active={!rankingMode && sort.key === c.key}
                        onClick={() => toggleSort(c.key)}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankingMode ? (
                    <>
                      {rankedAll.map((row, i) => renderRow(row, i, false))}
                      {splitRanking && (
                        <>
                          <tr className="border-t">
                            <td
                              colSpan={colCount}
                              className="bg-muted/30 py-1.5 text-left text-xs font-medium text-muted-foreground"
                            >
                              Poucos jogos · menos de {minPeladas} pelada{minPeladas === 1 ? "" : "s"}
                            </td>
                          </tr>
                          {fewGames.map((row) => renderRow(row, null, true))}
                        </>
                      )}
                    </>
                  ) : (
                    columnSorted.map((row) => renderRow(row, null, false))
                  )}
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
              {rankingMode
                ? `Ranking por participações (G+A), depois aproveitamento e gols${
                    splitRanking ? ` · precisa de ${minPeladas}+ peladas pra entrar no topo` : ""
                  }. Toque numa coluna pra ordenar por ela.`
                : "Toque em “Jogador” pra voltar ao ranking · toque numa coluna pra reordenar."}{" "}
              · toque num peladeiro pra ver o perfil.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  )
}

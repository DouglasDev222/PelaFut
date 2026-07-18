import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import type { Player } from "@pelafut/shared"
import {
  computeTeamStandings,
  type GoalLite,
  type ParticipantLite,
  type PlayerStatLine,
} from "@/features/stats/aggregate"
import type { StatsRound, StatsTeam } from "@/features/stats/fetchRaw"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { Legend, Th } from "@/features/stats/StatTable"
import { cn } from "@/lib/utils"

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

const MEDALS = ["🥇", "🥈", "🥉"]

/** How the team ranking is ordered. Points is the league-table default;
 * "wins" answers the simpler "quem mais ganhou?". */
type StandingsSort = "points" | "wins"

function SortToggle({
  value,
  onChange,
}: {
  value: StandingsSort
  onChange: (value: StandingsSort) => void
}) {
  const options: [StandingsSort, string][] = [
    ["points", "Pontos"],
    ["wins", "Vitórias"],
  ]
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** A player leaderboard with a magnitude bar scaled to the leader. Used for
 * both the goals and the assists tab, so they stay visually identical. */
function RankingList({
  rows,
  max,
  playersById,
  color,
  emptyLabel,
}: {
  rows: { playerId: string; value: number }[]
  max: number
  playersById: Map<string, Player>
  color: string
  emptyLabel: string
}) {
  if (rows.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">{emptyLabel}</p>
  }
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row, i) => (
        <div key={row.playerId} className="flex items-center gap-2">
          <span className="w-6 shrink-0 text-center text-xs font-semibold text-muted-foreground">
            {MEDALS[i] ?? `${i + 1}º`}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm">{playerName(playersById, row.playerId)}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{row.value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${max > 0 ? (row.value / max) * 100 : 0}%`, backgroundColor: color }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const DECIDED_BY_LABEL: Record<string, string> = {
  regulation: "tempo normal",
  penalties: "pênaltis",
  direct: "vencedor direto",
}

function playerName(playersById: Map<string, { name: string; nickname: string | null }>, id: string) {
  const p = playersById.get(id)
  if (!p) return "?"
  const label = p.nickname ? `${p.name} (${p.nickname})` : p.name
  return label.toUpperCase()
}

function TeamLabel({ team }: { team: StatsTeam | undefined }) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium">
      <span className="inline-block size-2.5 shrink-0 rounded-full border" style={{ backgroundColor: team?.color }} />
      Time {team?.number ?? "?"}
    </span>
  )
}

function RoundHistoryCard({
  round,
  homeTeam,
  awayTeam,
  goals,
  playersById,
  rosterFor,
  hrefForPlayer,
}: {
  round: StatsRound
  homeTeam: StatsTeam | undefined
  awayTeam: StatsTeam | undefined
  goals: GoalLite[]
  playersById: Map<string, Player>
  rosterFor: (teamId: string) => Player[]
  hrefForPlayer?: (playerId: string) => string
}) {
  const [showRoster, setShowRoster] = useState(false)

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Jogo {round.sequence}</span>
          {round.decidedBy && <span>{DECIDED_BY_LABEL[round.decidedBy] ?? round.decidedBy}</span>}
        </div>

        <div className="flex items-center justify-center gap-4">
          <TeamLabel team={homeTeam} />
          <span className="text-3xl font-extrabold tabular-nums">
            {round.homeScore} <span className="text-lg font-medium text-muted-foreground">x</span> {round.awayScore}
          </span>
          <TeamLabel team={awayTeam} />
        </div>

        {goals.length > 0 && (
          <div className="flex flex-col gap-1 border-t pt-2 text-xs">
            {goals.map((g) => {
              const team = g.teamId === homeTeam?.id ? homeTeam : awayTeam
              const scorerName = g.playerId ? playerName(playersById, g.playerId) : "Ninguém/contra"
              const assistName = g.assistPlayerId ? playerName(playersById, g.assistPlayerId) : null
              return (
                <p key={g.id} className="flex items-center gap-1 text-muted-foreground">
                  <span>⚽</span>
                  <span className="font-medium text-foreground">{scorerName}</span>
                  {assistName && <span>· assist. {assistName}</span>}
                  <span>— Time {team?.number ?? "?"}</span>
                </p>
              )
            })}
          </div>
        )}

        <button
          type="button"
          className="flex items-center justify-center gap-1 self-center text-xs text-muted-foreground"
          onClick={() => setShowRoster((v) => !v)}
        >
          Ver jogadores
          <ChevronDown className={cn("size-3.5 transition-transform", showRoster && "rotate-180")} />
        </button>

        {showRoster && (
          <div className="grid grid-cols-2 gap-3 border-t pt-2 text-xs">
            {[homeTeam, awayTeam].map((team) => (
              <div key={team?.id ?? "?"} className="flex flex-col gap-0.5">
                <TeamLabel team={team} />
                {team &&
                  rosterFor(team.id).map((p) =>
                    hrefForPlayer ? (
                      <Link
                        key={p.id}
                        to={hrefForPlayer(p.id)}
                        className="text-muted-foreground uppercase underline"
                      >
                        {p.name}
                      </Link>
                    ) : (
                      <p key={p.id} className="text-muted-foreground uppercase">
                        {p.name}
                      </p>
                    )
                  )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * One pelada's statistics. Presentational: the caller supplies the already
 * loaded data, so the private app and the public page share this exact UI.
 */
export function MatchStatsView({
  matchName,
  teams,
  rounds,
  participants,
  goals,
  playerStats,
  playersById,
  hrefForPlayer,
}: {
  matchName: string
  teams: StatsTeam[]
  rounds: StatsRound[]
  participants: ParticipantLite[]
  goals: GoalLite[]
  playerStats: PlayerStatLine[]
  playersById: Map<string, Player>
  /** When given, player names become links to their profile. */
  hrefForPlayer?: (playerId: string) => string
}) {
  const [standingsSort, setStandingsSort] = useState<StandingsSort>("points")

  const finishedRounds = rounds.filter((r) => r.status === "finished")
  const totalGoals = finishedRounds.reduce((sum, r) => sum + r.homeScore + r.awayScore, 0)

  const topScorers = [...playerStats].filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals)
  const maxGoals = topScorers[0]?.goals ?? 0
  const artilheiros = topScorers.filter((s) => s.goals === maxGoals)

  const topAssisters = [...playerStats].filter((s) => s.assists > 0).sort((a, b) => b.assists - a.assists)
  const maxAssists = topAssisters[0]?.assists ?? 0
  const garcons = topAssisters.filter((s) => s.assists === maxAssists)

  const scorerRows = topScorers.slice(0, 8).map((s) => ({ playerId: s.playerId, value: s.goals }))
  const assistRows = topAssisters.slice(0, 8).map((s) => ({ playerId: s.playerId, value: s.assists }))

  // computeTeamStandings already returns the league-table order (points first),
  // so only the "wins" view needs re-sorting.
  const standings = computeTeamStandings(rounds)
  const sortedStandings =
    standingsSort === "wins"
      ? [...standings].sort(
          (a, b) =>
            b.wins - a.wins || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || b.points - a.points
        )
      : standings
  const teamsById = new Map(teams.map((t) => [t.id, t]))
  const goalsPerGame =
    finishedRounds.length > 0 ? (totalGoals / finishedRounds.length).toFixed(1) : "0.0"

  function rosterFor(roundId: string, teamId: string) {
    return participants
      .filter((p) => p.roundId === roundId && p.teamId === teamId)
      .flatMap((p) => {
        const player = playersById.get(p.playerId)
        return player ? [player] : []
      })
  }

  return (
    <>
      <p className="text-lg font-semibold">{matchName}</p>

      <Card>
        <CardContent className="grid grid-cols-3 divide-x divide-border py-4">
          <StatTile value={finishedRounds.length} label={finishedRounds.length === 1 ? "jogo" : "jogos"} />
          <StatTile value={totalGoals} label={totalGoals === 1 ? "gol" : "gols"} />
          <StatTile value={goalsPerGame} label="gols/jogo" />
        </CardContent>
      </Card>

      {finishedRounds.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum jogo finalizado ainda nessa pelada.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-start gap-3 py-3">
                <span className="text-xl leading-none">⚽</span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-xs text-muted-foreground">
                    Artilheiro{artilheiros.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-sm font-medium">
                    {artilheiros.length > 0
                      ? artilheiros.map((s) => playerName(playersById, s.playerId)).join(", ")
                      : "—"}
                  </span>
                  {maxGoals > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {maxGoals} {maxGoals === 1 ? "gol" : "gols"}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 py-3">
                <span className="text-xl leading-none">🎯</span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-xs text-muted-foreground">
                    Garçom{garcons.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-sm font-medium">
                    {garcons.length > 0
                      ? garcons.map((s) => playerName(playersById, s.playerId)).join(", ")
                      : "—"}
                  </span>
                  {maxAssists > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {maxAssists} {maxAssists === 1 ? "assistência" : "assistências"}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Ranking dos times</CardTitle>
              <SortToggle value={standingsSort} onChange={setStandingsSort} />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th scope="col" className="w-8 py-1 text-left font-medium">
                        #
                      </th>
                      <th scope="col" className="py-1 text-left font-medium">
                        Time
                      </th>
                      <Th abbr="J" label="Jogos" />
                      <Th abbr="V" label="Vitórias" />
                      <Th abbr="E" label="Empates" />
                      <Th abbr="D" label="Derrotas" />
                      <Th abbr="SG" label="Saldo de gols" />
                      <Th abbr="Pts" label="Pontos" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStandings.map((s, i) => (
                      <tr key={s.teamId} className={cn("border-t", i === 0 && "bg-muted/40")}>
                        <td className="py-1.5 text-left tabular-nums">
                          {i === 0 ? "🏆" : `${i + 1}º`}
                        </td>
                        <td className="py-1.5">
                          <TeamLabel team={teamsById.get(s.teamId)} />
                        </td>
                        <td className="px-1 text-right tabular-nums">{s.played}</td>
                        <td
                          className={cn(
                            "px-1 text-right tabular-nums",
                            standingsSort === "wins" && "font-semibold text-foreground"
                          )}
                        >
                          {s.wins}
                        </td>
                        <td className="px-1 text-right tabular-nums">{s.draws}</td>
                        <td className="px-1 text-right tabular-nums">{s.losses}</td>
                        <td className="px-1 text-right tabular-nums">
                          {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                        </td>
                        <td
                          className={cn(
                            "px-1 text-right tabular-nums",
                            standingsSort === "points" && "font-semibold text-foreground"
                          )}
                        >
                          {s.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Legend
                items={[
                  ["J", "jogos"],
                  ["V", "vitórias"],
                  ["E", "empates"],
                  ["D", "derrotas"],
                  ["SG", "saldo de gols"],
                  ["Pts", "pontos (vitória 3 · empate 1)"],
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <Tabs defaultValue="gols">
                <TabsList>
                  <TabsTab value="gols">⚽ Artilheiros</TabsTab>
                  <TabsTab value="assistencias">🎯 Assistências</TabsTab>
                </TabsList>
                <TabsPanel value="gols">
                  <RankingList
                    rows={scorerRows}
                    max={maxGoals}
                    playersById={playersById}
                    color="var(--chart-series-1)"
                    emptyLabel="Nenhum gol marcado ainda."
                  />
                </TabsPanel>
                <TabsPanel value="assistencias">
                  <RankingList
                    rows={assistRows}
                    max={maxAssists}
                    playersById={playersById}
                    color="var(--chart-series-2)"
                    emptyLabel="Nenhuma assistência registrada ainda."
                  />
                </TabsPanel>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por jogador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th scope="col" className="py-1 pr-2 text-left font-medium">
                        Jogador
                      </th>
                      <Th abbr="J" label="Jogos" />
                      <Th abbr="G" label="Gols" />
                      <Th abbr="A" label="Assistências" />
                      <Th abbr="V" label="Vitórias" />
                      <Th abbr="E" label="Empates" />
                      <Th abbr="D" label="Derrotas" />
                    </tr>
                  </thead>
                  <tbody>
                    {[...playerStats]
                      .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
                      .map((s) => (
                        <tr key={s.playerId} className="border-t">
                          <td className="py-1.5 pr-2">
                            {hrefForPlayer ? (
                              <Link to={hrefForPlayer(s.playerId)} className="underline">
                                {playerName(playersById, s.playerId)}
                              </Link>
                            ) : (
                              playerName(playersById, s.playerId)
                            )}
                          </td>
                          <td className="px-1 text-right tabular-nums">{s.roundsPlayed}</td>
                          <td className="px-1 text-right font-medium tabular-nums">{s.goals}</td>
                          <td className="px-1 text-right tabular-nums">{s.assists}</td>
                          <td className="px-1 text-right tabular-nums">{s.wins}</td>
                          <td className="px-1 text-right tabular-nums">{s.draws}</td>
                          <td className="px-1 text-right tabular-nums">{s.losses}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <Legend
                items={[
                  ["J", "jogos"],
                  ["G", "gols"],
                  ["A", "assistências"],
                  ["V", "vitórias"],
                  ["E", "empates"],
                  ["D", "derrotas"],
                ]}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-muted-foreground">Histórico de jogos</p>
            {finishedRounds.map((r) => (
              <RoundHistoryCard
                key={r.id}
                round={r}
                homeTeam={teams.find((t) => t.id === r.homeTeamId)}
                awayTeam={teams.find((t) => t.id === r.awayTeamId)}
                goals={goals.filter((g) => g.roundId === r.id)}
                playersById={playersById}
                rosterFor={(teamId) => rosterFor(r.id, teamId)}
                hrefForPlayer={hrefForPlayer}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}

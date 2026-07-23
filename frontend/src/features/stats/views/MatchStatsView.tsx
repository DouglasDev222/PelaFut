import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import type { Player } from "@pelafut/shared"
import {
  computeTeamPlayerStats,
  computeTeamStandings,
  roundDurationSeconds,
  type GoalLite,
  type ParticipantLite,
  type PlayerStatLine,
  type TeamStandingLine,
} from "@/features/stats/aggregate"
import type { StatsRound, StatsTeam } from "@/features/stats/fetchRaw"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { Legend, Th } from "@/features/stats/StatTable"
import { cn } from "@/lib/utils"

/** Compact m:ss for a round's playing time (e.g. 7:05). */
function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

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

/**
 * How a round ended, for the history header. Beyond "tempo normal", it names
 * the special outcomes the user asked to see: penalties, a direct win (and to
 * whom), and a tie where both teams left the court.
 */
function outcomeLabel(
  round: StatsRound,
  homeNumber: number | undefined,
  awayNumber: number | undefined,
  tieBothLeaveAllowed: boolean
): string {
  if (round.decidedBy === "penalties") return "pênaltis"
  if (round.decidedBy === "direct") {
    const winner = round.result === "home_win" ? homeNumber : awayNumber
    return `vitória direta · Time ${winner ?? "?"}`
  }
  if (round.result === "tie") return tieBothLeaveAllowed ? "ambos saíram" : "empate"
  return "tempo normal"
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
  tieBothLeaveAllowed,
  hrefForPlayer,
}: {
  round: StatsRound
  homeTeam: StatsTeam | undefined
  awayTeam: StatsTeam | undefined
  goals: GoalLite[]
  playersById: Map<string, Player>
  rosterFor: (teamId: string) => Player[]
  tieBothLeaveAllowed: boolean
  hrefForPlayer?: (playerId: string) => string
}) {
  const [showRoster, setShowRoster] = useState(false)
  const duration = roundDurationSeconds(round)
  const hasPenalties = round.decidedBy === "penalties" || round.homePenalties + round.awayPenalties > 0
  const label = outcomeLabel(round, homeTeam?.number, awayTeam?.number, tieBothLeaveAllowed)

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Jogo {round.sequence}</span>
          <span className="flex items-center gap-1.5">
            {duration != null && <span className="tabular-nums">⏱ {formatDuration(duration)}</span>}
            <span>· {label}</span>
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center justify-center gap-4">
            <TeamLabel team={homeTeam} />
            <span className="text-3xl font-extrabold tabular-nums">
              {round.homeScore} <span className="text-lg font-medium text-muted-foreground">x</span> {round.awayScore}
            </span>
            <TeamLabel team={awayTeam} />
          </div>
          {hasPenalties && (
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              pênaltis {round.homePenalties} - {round.awayPenalties}
            </span>
          )}
        </div>

        {goals.length > 0 && (
          // One goal per row, in the order they were scored (top = first), each
          // hugging its own team's side with the other side left blank. So you
          // read the sequence downward AND see which team scored at a glance.
          <div className="flex flex-col gap-1.5 border-t pt-2 text-xs">
            {goals.map((g) => {
              const isHome = g.teamId === homeTeam?.id
              const scorerName = g.playerId ? playerName(playersById, g.playerId) : "Ninguém/contra"
              const assistName = g.assistPlayerId ? playerName(playersById, g.assistPlayerId) : null
              return (
                <div key={g.id} className="grid grid-cols-2 gap-x-4">
                  <div
                    className={cn(
                      "flex min-w-0 flex-col",
                      isHome ? "text-left" : "col-start-2 items-end text-right"
                    )}
                  >
                    <span className="truncate font-medium text-foreground">⚽ {scorerName}</span>
                    {assistName && (
                      <span className="truncate text-muted-foreground">assist. {assistName}</span>
                    )}
                  </div>
                </div>
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

/** One team's goals/assists breakdown: who its artilheiro and garçom are, and
 * how many goals each player of the team scored. Shared by private and public. */
function TeamBreakdownCard({
  team,
  players,
  noScorerGoals,
  standing,
  topScorerIds,
  topScorerGoals,
  topAssisterIds,
  topAssisterAssists,
  playersById,
  hrefForPlayer,
}: {
  team: StatsTeam | undefined
  players: { playerId: string; goals: number; assists: number }[]
  noScorerGoals: number
  standing: TeamStandingLine | undefined
  topScorerIds: string[]
  topScorerGoals: number
  topAssisterIds: string[]
  topAssisterAssists: number
  playersById: Map<string, Player>
  hrefForPlayer?: (playerId: string) => string
}) {
  const scored = players.filter((p) => p.goals > 0 || p.assists > 0)
  function names(ids: string[]) {
    return ids.map((id) => playerName(playersById, id)).join(", ")
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <TeamLabel team={team} />
        {standing && (
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <span className="tabular-nums">
              ⚽ <strong className="text-foreground">{standing.goalsFor}</strong>
            </span>
            <span className="tabular-nums">
              V<strong className="text-foreground">{standing.wins}</strong>
            </span>
            <span className="tabular-nums">
              E<strong className="text-foreground">{standing.draws}</strong>
            </span>
            <span className="tabular-nums">
              D<strong className="text-foreground">{standing.losses}</strong>
            </span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col">
          <span className="text-muted-foreground">
            ⚽ Artilheiro{topScorerIds.length === 1 ? "" : "s"}
          </span>
          <span className="font-medium">{topScorerIds.length > 0 ? names(topScorerIds) : "—"}</span>
          {topScorerGoals > 0 && (
            <span className="text-muted-foreground tabular-nums">
              {topScorerGoals} {topScorerGoals === 1 ? "gol" : "gols"}
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">
            🎯 Garçom{topAssisterIds.length === 1 ? "" : "s"}
          </span>
          <span className="font-medium">{topAssisterIds.length > 0 ? names(topAssisterIds) : "—"}</span>
          {topAssisterAssists > 0 && (
            <span className="text-muted-foreground tabular-nums">
              {topAssisterAssists} {topAssisterAssists === 1 ? "assistência" : "assistências"}
            </span>
          )}
        </div>
      </div>

      {(scored.length > 0 || noScorerGoals > 0) && (
        <div className="flex flex-col gap-0.5 border-t pt-2 text-sm">
          {scored.map((p) => (
            <div key={p.playerId} className="flex items-center justify-between gap-2">
              <span className="truncate">
                {hrefForPlayer ? (
                  <Link to={hrefForPlayer(p.playerId)} className="underline">
                    {playerName(playersById, p.playerId)}
                  </Link>
                ) : (
                  playerName(playersById, p.playerId)
                )}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {p.goals > 0 && `⚽ ${p.goals}`}
                {p.goals > 0 && p.assists > 0 && " · "}
                {p.assists > 0 && `🎯 ${p.assists}`}
              </span>
            </div>
          ))}
          {noScorerGoals > 0 && (
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <span className="italic">Ninguém / gol contra</span>
              <span className="shrink-0 text-xs tabular-nums">⚽ {noScorerGoals}</span>
            </div>
          )}
        </div>
      )}
    </div>
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
  regulationSeconds,
  tieBothLeaveAllowed = false,
  hrefForPlayer,
}: {
  matchName: string
  teams: StatsTeam[]
  rounds: StatsRound[]
  participants: ParticipantLite[]
  goals: GoalLite[]
  playerStats: PlayerStatLine[]
  playersById: Map<string, Player>
  /** Regulation length in seconds — caps each game's time in the average, so
   * a game that ran into stoppage doesn't inflate it. Omit when goals-only. */
  regulationSeconds?: number
  /** Whether a tie sends both teams off — drives the "ambos saíram" label. */
  tieBothLeaveAllowed?: boolean
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
  const standingsById = new Map(standings.map((s) => [s.teamId, s]))
  const goalsPerGame =
    finishedRounds.length > 0 ? (totalGoals / finishedRounds.length).toFixed(1) : "0.0"

  // Average playing time — only over rounds that actually ran a clock, so a
  // goals-only pelada (no clock) simply doesn't get the tile. Each game is
  // capped at the regulation length: a game that ran into stoppage counts only
  // up to the configured time (e.g. 7:00), so the average reflects the format.
  const durations = finishedRounds
    .map((r) => roundDurationSeconds(r))
    .filter((d): d is number => d != null)
    .map((d) => (regulationSeconds != null ? Math.min(d, regulationSeconds) : d))
  const avgDurationSecs =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null

  // Per-team breakdown, kept in the teams' own order (Time 1, 2, 3…) so it
  // lines up with how they're named everywhere else, not by rank.
  const teamPlayerStats = computeTeamPlayerStats(rounds, goals, participants)
  const teamStatsById = new Map(teamPlayerStats.map((t) => [t.teamId, t]))

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
        <CardContent
          className={cn(
            "grid gap-y-4 py-4",
            avgDurationSecs != null
              ? "grid-cols-2 sm:grid-cols-4 sm:divide-x sm:divide-border"
              : "grid-cols-3 divide-x divide-border"
          )}
        >
          <StatTile value={finishedRounds.length} label={finishedRounds.length === 1 ? "jogo" : "jogos"} />
          <StatTile value={totalGoals} label={totalGoals === 1 ? "gol" : "gols"} />
          <StatTile value={goalsPerGame} label="gols/jogo" />
          {avgDurationSecs != null && (
            <StatTile value={formatDuration(avgDurationSecs)} label="média/jogo" />
          )}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por time</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {teams.map((team) => {
                const ts = teamStatsById.get(team.id)
                return (
                  <TeamBreakdownCard
                    key={team.id}
                    team={team}
                    players={ts?.players ?? []}
                    noScorerGoals={ts?.noScorerGoals ?? 0}
                    standing={standingsById.get(team.id)}
                    topScorerIds={ts?.topScorerIds ?? []}
                    topScorerGoals={ts?.topScorerGoals ?? 0}
                    topAssisterIds={ts?.topAssisterIds ?? []}
                    topAssisterAssists={ts?.topAssisterAssists ?? 0}
                    playersById={playersById}
                    hrefForPlayer={hrefForPlayer}
                  />
                )
              })}
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
                tieBothLeaveAllowed={tieBothLeaveAllowed}
                hrefForPlayer={hrefForPlayer}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}

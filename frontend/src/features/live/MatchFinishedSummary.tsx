import { Link } from "react-router-dom"
import { BarChart3, Trophy } from "lucide-react"
import type { Player } from "@pelafut/shared"
import { useMatchStats } from "@/features/stats/useMatchStats"
import { computeTeamStandings } from "@/features/stats/aggregate"
import { TopPlayersHighlight } from "@/features/stats/TopPlayersHighlight"
import { ShareButton } from "@/features/public/ShareButton"
import { Legend, Th } from "@/features/stats/StatTable"
import { TeamRosterCard } from "@/components/TeamRosterCard"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** The team shape the live screen already has (with rosters and colours). */
export interface FinishedTeam {
  id: string
  number: number
  color: string
  captainId: string | null
  players: Player[]
}

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function TeamDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full border"
      style={{ backgroundColor: color }}
    />
  )
}

/**
 * End-of-pelada summary. The live hook only carries the current round, so the
 * numbers come from `useMatchStats` (which loads the whole match) while the
 * rosters and colours come from the teams the live screen already has.
 */
export function MatchFinishedSummary({
  matchId,
  teams,
  busy,
  onReopen,
}: {
  matchId: string
  teams: FinishedTeam[]
  busy: boolean
  onReopen: () => void
}) {
  const { rounds, playerStats, playersById, loading } = useMatchStats(matchId)

  const teamsById = new Map(teams.map((t) => [t.id, t]))
  const finishedRounds = rounds.filter((r) => r.status === "finished")
  const totalGoals = finishedRounds.reduce((sum, r) => sum + r.homeScore + r.awayScore, 0)
  const goalsPerGame =
    finishedRounds.length > 0 ? (totalGoals / finishedRounds.length).toFixed(1) : "0.0"
  const standings = computeTeamStandings(rounds)
  const champion = standings[0] ? teamsById.get(standings[0].teamId) : undefined

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-6 text-center">
        <Trophy className="size-8 text-amber-500" />
        <p className="font-medium">Pelada encerrada</p>
        {champion ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Campeão: <TeamDot color={champion.color} />
            <span className="font-medium text-foreground">Time {champion.number}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum jogo finalizado.</p>
        )}
      </div>

      {/* The stats load after the screen paints; everything below just waits. */}
      {!loading && finishedRounds.length > 0 && (
        <>
          <Card>
            <CardContent className="grid grid-cols-3 divide-x divide-border py-4">
              <StatTile
                value={finishedRounds.length}
                label={finishedRounds.length === 1 ? "jogo" : "jogos"}
              />
              <StatTile value={totalGoals} label={totalGoals === 1 ? "gol" : "gols"} />
              <StatTile value={goalsPerGame} label="gols/jogo" />
            </CardContent>
          </Card>

          <TopPlayersHighlight playerStats={playerStats} playersById={playersById} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classificação</CardTitle>
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
                      <Th abbr="GP" label="Gols pró" />
                      <Th abbr="SG" label="Saldo de gols" />
                      <Th abbr="Pts" label="Pontos" />
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => {
                      const team = teamsById.get(s.teamId)
                      return (
                        <tr key={s.teamId} className={cn("border-t", i === 0 && "bg-muted/40")}>
                          <td className="py-1.5 text-left tabular-nums">
                            {i === 0 ? "🏆" : `${i + 1}º`}
                          </td>
                          <td className="py-1.5">
                            <span className="flex items-center gap-1.5 text-sm font-medium">
                              <TeamDot color={team?.color ?? "transparent"} />
                              Time {team?.number ?? "?"}
                            </span>
                          </td>
                          <td className="px-1 text-right tabular-nums">{s.played}</td>
                          <td className="px-1 text-right font-semibold tabular-nums">{s.wins}</td>
                          <td className="px-1 text-right tabular-nums">{s.draws}</td>
                          <td className="px-1 text-right tabular-nums">{s.losses}</td>
                          <td className="px-1 text-right tabular-nums">{s.goalsFor}</td>
                          <td className="px-1 text-right tabular-nums">
                            {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                          </td>
                          <td className="px-1 text-right font-semibold tabular-nums">{s.points}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Legend
                items={[
                  ["J", "jogos"],
                  ["V", "vitórias"],
                  ["E", "empates"],
                  ["D", "derrotas"],
                  ["GP", "gols pró"],
                  ["SG", "saldo de gols"],
                  ["Pts", "pontos (vitória 3 · empate 1)"],
                ]}
              />
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">Times</p>
        {standings.length > 0
          ? standings.map((s, i) => {
              const team = teamsById.get(s.teamId)
              if (!team) return null
              return (
                <TeamRosterCard
                  key={team.id}
                  variant="collapsible"
                  color={team.color}
                  number={team.number}
                  captainId={team.captainId}
                  players={team.players}
                  headerRight={<span className="text-xs text-muted-foreground">{i + 1}º</span>}
                />
              )
            })
          : teams.map((team) => (
              <TeamRosterCard
                key={team.id}
                variant="collapsible"
                color={team.color}
                number={team.number}
                captainId={team.captainId}
                players={team.players}
              />
            ))}
      </div>

      <ShareButton matchId={matchId} label="Compartilhar estatísticas" className="w-full" />

      <Link
        to={`/matches/${matchId}/stats`}
        className={cn(buttonVariants({ variant: "outline", size: "touch" }), "w-full")}
      >
        <BarChart3 className="size-4" /> Ver estatísticas completas
      </Link>

      <Button size="touch" variant="outline" className="w-full" disabled={busy} onClick={onReopen}>
        Reabrir partida
      </Button>
    </div>
  )
}

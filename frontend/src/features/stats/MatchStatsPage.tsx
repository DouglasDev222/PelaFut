import { useState } from "react"
import { useParams } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import type { Player } from "@pelafut/shared"
import { useMatchStats } from "@/features/stats/useMatchStats"
import type { GoalLite } from "@/features/stats/aggregate"
import type { StatsRound, StatsTeam } from "@/features/stats/fetchRaw"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

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
}: {
  round: StatsRound
  homeTeam: StatsTeam | undefined
  awayTeam: StatsTeam | undefined
  goals: GoalLite[]
  playersById: Map<string, Player>
  rosterFor: (teamId: string) => Player[]
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
                  rosterFor(team.id).map((p) => (
                    <p key={p.id} className="text-muted-foreground uppercase">
                      {p.name}
                    </p>
                  ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function MatchStatsPage() {
  const { id } = useParams<{ id: string }>()
  const { match, teams, rounds, participants, goals, playerStats, playersById, loading, error } = useMatchStats(id!)

  if (loading) return null

  if (!match) {
    return <p className="text-sm text-destructive">{error ?? "Pelada não encontrada"}</p>
  }

  const finishedRounds = rounds.filter((r) => r.status === "finished")
  const totalGoals = finishedRounds.reduce((sum, r) => sum + r.homeScore + r.awayScore, 0)

  const topScorers = [...playerStats].filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals)
  const maxGoals = topScorers[0]?.goals ?? 0
  const artilheiros = topScorers.filter((s) => s.goals === maxGoals)

  const topAssisters = [...playerStats].filter((s) => s.assists > 0).sort((a, b) => b.assists - a.assists)
  const maxAssists = topAssisters[0]?.assists ?? 0
  const garcons = topAssisters.filter((s) => s.assists === maxAssists)

  const ranking = topScorers.slice(0, 8)

  function rosterFor(roundId: string, teamId: string) {
    return participants
      .filter((p) => p.roundId === roundId && p.teamId === teamId)
      .flatMap((p) => {
        const player = playersById.get(p.playerId)
        return player ? [player] : []
      })
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-lg font-semibold">{match.name}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="flex justify-around py-4 text-center">
          <div>
            <p className="text-2xl font-semibold">{finishedRounds.length}</p>
            <p className="text-xs text-muted-foreground">jogos</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{totalGoals}</p>
            <p className="text-xs text-muted-foreground">gols</p>
          </div>
        </CardContent>
      </Card>

      {finishedRounds.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum jogo finalizado ainda nessa pelada.</p>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-1 py-4 text-sm">
              <p>
                ⚽ Artilheiro{artilheiros.length === 1 ? "" : "s"}:{" "}
                {artilheiros.map((s) => playerName(playersById, s.playerId)).join(", ")} ({maxGoals}{" "}
                {maxGoals === 1 ? "gol" : "gols"})
              </p>
              {garcons.length > 0 && (
                <p>
                  🎯 Garçom{garcons.length === 1 ? "" : "s"}:{" "}
                  {garcons.map((s) => playerName(playersById, s.playerId)).join(", ")} ({maxAssists}{" "}
                  {maxAssists === 1 ? "assistência" : "assistências"})
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking de artilheiros</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-0.5">
              {ranking.map((s, i) => (
                <div
                  key={s.playerId}
                  className={cn("flex items-center justify-between rounded-md px-2 py-1.5 text-sm", i % 2 === 1 && "bg-muted/40")}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-right text-xs font-semibold text-muted-foreground">{i + 1}º</span>
                    {playerName(playersById, s.playerId)}
                  </span>
                  <span className="font-semibold tabular-nums">{s.goals} ⚽</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por jogador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-1 pr-2">Jogador</th>
                      <th className="px-2 text-right">Gols</th>
                      <th className="px-2 text-right">Assist.</th>
                      <th className="px-2 text-right">Jogos</th>
                      <th className="px-2 text-right">V-E-D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...playerStats]
                      .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
                      .map((s) => (
                        <tr key={s.playerId} className="border-t">
                          <td className="py-1 pr-2">{playerName(playersById, s.playerId)}</td>
                          <td className="px-2 text-right">{s.goals}</td>
                          <td className="px-2 text-right">{s.assists}</td>
                          <td className="px-2 text-right">{s.roundsPlayed}</td>
                          <td className="px-2 text-right">
                            {s.wins}-{s.draws}-{s.losses}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2 sm:hidden">
                {[...playerStats]
                  .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
                  .map((s) => (
                    <div key={s.playerId} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <span className="font-medium">{playerName(playersById, s.playerId)}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.goals}⚽ {s.assists}🎯 · {s.roundsPlayed}j · {s.wins}-{s.draws}-{s.losses}
                      </span>
                    </div>
                  ))}
              </div>
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
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

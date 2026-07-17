import { Link, useParams } from "react-router-dom"
import { usePlayerStats } from "@/features/stats/usePlayerStats"
import { GoalsBarChart } from "@/features/stats/GoalsBarChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerAvatar } from "@/components/PlayerAvatar"

export function PlayerStatsPage() {
  const { id } = useParams<{ id: string }>()
  const { player, overall, byMatch, loading, error } = usePlayerStats(id!)

  if (loading) return null

  if (!player) {
    return <p className="text-sm text-destructive">{error ?? "Peladeiro não encontrado"}</p>
  }

  const chartData = byMatch
    .filter((m) => m.stats.goals > 0)
    .map((m) => ({ label: m.matchName, value: m.stats.goals }))

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <PlayerAvatar photoUrl={player.photo_url} name={player.name} />
        <p className="text-lg font-semibold uppercase">
          {player.name}
          {player.nickname ? ` (${player.nickname})` : ""}
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="grid grid-cols-4 gap-2 py-4 text-center">
          <div>
            <p className="text-2xl font-semibold">{overall.goals}</p>
            <p className="text-xs text-muted-foreground">gols</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{overall.assists}</p>
            <p className="text-xs text-muted-foreground">assist.</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{overall.roundsPlayed}</p>
            <p className="text-xs text-muted-foreground">jogos</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">
              {overall.wins}-{overall.draws}-{overall.losses}
            </p>
            <p className="text-xs text-muted-foreground">V-E-D</p>
          </div>
        </CardContent>
      </Card>

      {byMatch.length === 0 ? (
        <p className="text-sm text-muted-foreground">Esse peladeiro ainda não jogou nenhuma rodada.</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gols por pelada</CardTitle>
            </CardHeader>
            <CardContent>
              <GoalsBarChart data={chartData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Peladas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-1 pr-2">Pelada</th>
                      <th className="px-2 text-right">Gols</th>
                      <th className="px-2 text-right">Assist.</th>
                      <th className="px-2 text-right">Jogos</th>
                      <th className="px-2 text-right">V-E-D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMatch.map((m) => (
                      <tr key={m.matchId} className="border-t">
                        <td className="py-1 pr-2">
                          <Link to={`/matches/${m.matchId}/stats`} className="underline">
                            {m.matchName}
                          </Link>
                          <span className="text-xs text-muted-foreground"> · {m.matchDate}</span>
                        </td>
                        <td className="px-2 text-right">{m.stats.goals}</td>
                        <td className="px-2 text-right">{m.stats.assists}</td>
                        <td className="px-2 text-right">{m.stats.roundsPlayed}</td>
                        <td className="px-2 text-right">
                          {m.stats.wins}-{m.stats.draws}-{m.stats.losses}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2 sm:hidden">
                {byMatch.map((m) => (
                  <Link
                    key={m.matchId}
                    to={`/matches/${m.matchId}/stats`}
                    className="flex flex-col gap-0.5 rounded-md border p-2 text-sm"
                  >
                    <span className="font-medium">{m.matchName}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.matchDate} · {m.stats.goals}⚽ {m.stats.assists}🎯 · {m.stats.roundsPlayed}j ·{" "}
                      {m.stats.wins}-{m.stats.draws}-{m.stats.losses}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

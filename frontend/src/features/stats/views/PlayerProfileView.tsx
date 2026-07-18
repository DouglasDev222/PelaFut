import { Link } from "react-router-dom"
import type { Player } from "@pelafut/shared"
import { GoalsBarChart } from "@/features/stats/GoalsBarChart"
import type { AccountPlayerLine } from "@/features/stats/aggregate"
import type { MatchContribution } from "@/features/stats/usePlayerStats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { PlayerAvatar } from "@/components/PlayerAvatar"

const STAR = "★"

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

/**
 * A player's profile and career numbers. Presentational, so the private app and
 * the public page share it. Fields the public payload doesn't carry (shirt
 * number, stars) are simply null there and drop out on their own.
 */
export function PlayerProfileView({
  player,
  overall,
  byMatch,
  hrefForMatch,
}: {
  player: Player
  overall: AccountPlayerLine
  byMatch: MatchContribution[]
  hrefForMatch: (matchId: string) => string
}) {
  const chartData = byMatch
    .filter((m) => m.stats.goals > 0)
    .map((m) => ({ label: m.matchName, value: m.stats.goals }))

  return (
    <>
      <div className="flex items-center gap-3">
        <PlayerAvatar photoUrl={player.photo_url} name={player.name} />
        <div className="flex min-w-0 flex-col">
          <p className="flex items-center gap-2 text-lg font-semibold uppercase">
            {player.name}
            {player.nickname ? ` (${player.nickname})` : ""}
            {!player.active && (
              <StatusBadge label="Inativo" tone="neutral" className="normal-case" />
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {player.position === "goleiro" ? "Goleiro" : "Jogador"}
            {player.shirt_number != null ? ` · #${player.shirt_number}` : ""}
            {player.skill_level ? ` · ${STAR.repeat(player.skill_level)}` : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-4 gap-y-3 py-4 text-center">
          <Tile value={overall.goals} label="gols" />
          <Tile value={overall.assists} label="assist." />
          <Tile value={overall.participations} label="G+A" />
          <Tile value={overall.roundsPlayed} label="jogos" />
          <Tile value={overall.matchesPlayed} label="peladas" />
          <Tile value={`${overall.wins}-${overall.draws}-${overall.losses}`} label="V-E-D" />
          <Tile value={`${Math.round(overall.pointsPct)}%`} label="aproveit." />
          <Tile value={overall.goalsPerGame.toFixed(1)} label="gols/jogo" />
        </CardContent>
      </Card>

      {byMatch.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Esse peladeiro ainda não jogou nenhuma rodada.
        </p>
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
                          <Link to={hrefForMatch(m.matchId)} className="underline">
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
                    to={hrefForMatch(m.matchId)}
                    className="flex flex-col gap-0.5 rounded-md border p-2 text-sm"
                  >
                    <span className="font-medium">{m.matchName}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.matchDate} · {m.stats.goals}⚽ {m.stats.assists}🎯 ·{" "}
                      {m.stats.roundsPlayed}j · {m.stats.wins}-{m.stats.draws}-{m.stats.losses}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}

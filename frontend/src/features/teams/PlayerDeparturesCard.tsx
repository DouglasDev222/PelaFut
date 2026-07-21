import { usePlayerDepartures } from "@/features/teams/usePlayerDepartures"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * "Quem saiu da pelada" — lets the organizer mark a player who left partway
 * through. It doesn't touch the roster (that would rewrite past stats): it
 * records an absence from the team's next game on, so the team enters the
 * borrow flow. Lives on its own screen, reached from the teams page.
 */
export function PlayerDeparturesCard({ matchId }: { matchId: string }) {
  const { teams, departedIds, loading, error, markLeft, markReturned } = usePlayerDepartures(matchId)

  if (loading || teams.length === 0) return null

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <p className="text-sm text-muted-foreground">
          Marque quem foi embora. A partir do próximo jogo do time dele, o time entra desfalcado e
          você poderá pegar um jogador emprestado. Os jogos que ele já jogou continuam contando.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col gap-3">
          {teams.map((team) => (
            <div key={team.id} className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <span
                  className="inline-block size-2.5 rounded-full border border-white/10"
                  style={{ backgroundColor: team.color }}
                />
                Time {team.number}
              </span>
              {team.players.map((player) => {
                const departed = departedIds.has(player.id)
                return (
                  <div
                    key={player.id}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-2 rounded-md border p-2 text-sm",
                      departed && "opacity-60"
                    )}
                  >
                    <span className="flex-1 uppercase">
                      {player.name}
                      {player.nickname ? ` (${player.nickname})` : ""}
                      {departed && (
                        <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground normal-case">
                          saiu
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => (departed ? markReturned(player.id) : markLeft(player.id, team.id))}
                      className={cn(
                        "shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium",
                        departed
                          ? "hover:bg-muted"
                          : "border-destructive/40 text-destructive hover:bg-destructive/10"
                      )}
                    >
                      {departed ? "Voltou" : "Saiu"}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

import { useParams } from "react-router-dom"
import { captainFirst, teamCapacity, useTeamFormation } from "@/features/teams/useTeamFormation"
import { TeamsBoard } from "@/features/teams/TeamsBoard"
import { TEAM_COLORS } from "@/features/teams/teamColors"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function TeamFormationPage() {
  const { id } = useParams<{ id: string }>()
  const {
    teams,
    availablePlayers,
    playersPerTeam,
    phase,
    currentTeamIndex,
    loading,
    saving,
    error,
    setTeamColor,
    startDraft,
    pickPlayer,
    movePlayer,
    setCaptain,
    resetDraft,
    save,
  } = useTeamFormation(id!)

  if (loading) return null

  if (teams.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum participante selecionado ainda. Volte para a pelada e selecione os participantes
        primeiro.
      </p>
    )
  }

  const totalParticipants =
    availablePlayers.length + teams.reduce((sum, t) => sum + t.players.length, 0)
  const capacities = teams.map((_, i) =>
    teamCapacity(i, teams.length, playersPerTeam, totalParticipants)
  )
  const reserveTeamIndex = capacities.findIndex((c) => c < playersPerTeam)

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold">Formação dos times</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {phase === "setup" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Escolha a cor de cada time. Depois o Time 1 escolhe primeiro (o primeiro jogador
            escolhido vira o capitão), seguido pelo Time 2, e assim por diante até completar.
          </p>
          {reserveTeamIndex !== -1 && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Time {teams[reserveTeamIndex]!.number} vai ficar como reserva, com só{" "}
              {capacities[reserveTeamIndex]} jogador
              {capacities[reserveTeamIndex] === 1 ? "" : "es"}. Na hora de jogar, ele vai precisar
              pegar {playersPerTeam - capacities[reserveTeamIndex]!} jogador
              {playersPerTeam - capacities[reserveTeamIndex]! === 1 ? "" : "es"} emprestado
              {playersPerTeam - capacities[reserveTeamIndex]! === 1 ? "" : "s"} do time que perder.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {teams.map((team, i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between gap-4 py-3">
                  <span className="font-medium">
                    Time {team.number}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({capacities[i]} jogador{capacities[i] === 1 ? "" : "es"}
                      {i === reserveTeamIndex ? " · reserva" : ""})
                    </span>
                  </span>
                  <div className="flex gap-1.5">
                    {TEAM_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        aria-label={c.name}
                        onClick={() => setTeamColor(i, c.hex)}
                        className={cn(
                          "size-6 rounded-full border-2",
                          team.color === c.hex ? "border-foreground" : "border-transparent"
                        )}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button onClick={startDraft}>Iniciar escolha de jogadores</Button>
        </div>
      )}

      {phase === "draft" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span
                  className="inline-block size-3 rounded-full border"
                  style={{ backgroundColor: teams[currentTeamIndex]?.color }}
                />
                Vez do Time {teams[currentTeamIndex]?.number} escolher
                {teams[currentTeamIndex]?.players.length === 0 ? " (capitão)" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {availablePlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => pickPlayer(player.id)}
                  className="rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {player.name}
                  {player.nickname ? ` (${player.nickname})` : ""}
                  {player.position === "goleiro" ? " 🧤" : ""}
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {teams.map((team, i) => (
              <Card key={i} className={cn(i === currentTeamIndex && "ring-2 ring-primary")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block size-3 rounded-full border"
                      style={{ backgroundColor: team.color }}
                    />
                    Time {team.number}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({team.players.length}/{capacities[i]})
                      {i === reserveTeamIndex ? " · reserva" : ""}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm">
                  {team.players.length === 0 && (
                    <p className="text-muted-foreground">Aguardando capitão...</p>
                  )}
                  {captainFirst(team).map((p) => (
                    <p key={p.id}>
                      {p.id === team.captainId ? "⭐ " : ""}
                      {p.name}
                    </p>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Ajuste manualmente arrastando jogadores, ou clique na estrela para trocar o capitão.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetDraft}>
                Refazer sorteio
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Salvando..." : "Confirmar times"}
              </Button>
            </div>
          </div>
          <TeamsBoard
            teams={teams}
            playersPerTeam={playersPerTeam}
            onMovePlayer={movePlayer}
            onSetCaptain={setCaptain}
          />
        </div>
      )}
    </div>
  )
}

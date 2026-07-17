import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Settings2, Undo2 } from "lucide-react"
import { teamCapacity, useTeamFormation } from "@/features/teams/useTeamFormation"
import { TeamsBoard } from "@/features/teams/TeamsBoard"
import { TEAM_COLORS } from "@/features/teams/teamColors"
import { MatchQuickSettingsDialog } from "@/features/matches/MatchQuickSettingsDialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { TeamRosterCard } from "@/components/TeamRosterCard"

export interface TeamFormationBackContext {
  /** True when "back" is a step within this page's own wizard (cancel a
   * redraft back to the saved board, or step from draft back to setup)
   * instead of leaving the page entirely. */
  hasInFlowBack: boolean
  goBack: () => void
}

export function TeamFormationPage({
  onBackContextChange,
}: {
  onBackContextChange?: (context: TeamFormationBackContext) => void
}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    teams,
    availablePlayers,
    playersPerTeam,
    phase,
    currentTeamIndex,
    loading,
    saving,
    error,
    hasSavedTeams,
    reserveDraftsActively,
    setReserveDraftsActively,
    canUndoLastPick,
    matchStatus,
    setTeamColor,
    startDraft,
    pickPlayer,
    undoLastPick,
    movePlayer,
    setCaptain,
    backToSetup,
    resetDraft,
    save,
    reload,
    changePlayersPerTeam,
    resetToDraft,
  } = useTeamFormation(id!)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  async function handleResetToDraft() {
    setResetConfirmOpen(false)
    const { error } = await resetToDraft()
    if (!error) navigate("/matches")
  }

  useEffect(() => {
    if (phase === "draft") {
      onBackContextChange?.({ hasInFlowBack: true, goBack: backToSetup })
    } else if (phase === "setup" && hasSavedTeams) {
      onBackContextChange?.({ hasInFlowBack: true, goBack: reload })
    } else {
      onBackContextChange?.({ hasInFlowBack: false, goBack: () => {} })
    }
  }, [phase, hasSavedTeams, backToSetup, reload, onBackContextChange])

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
    <div className="flex w-full flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {phase === "setup" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Escolha a cor de cada time. Depois o Time 1 escolhe primeiro (o primeiro jogador
            escolhido vira o capitão), seguido pelo Time 2, e assim por diante até completar.
          </p>
          <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <span className="text-sm">
              Jogadores por time: <strong>{playersPerTeam}</strong>
            </span>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="size-4" /> Ajustar
            </Button>
          </div>
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
                <CardContent className="flex flex-col gap-3 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium">
                      Time {team.number}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({capacities[i]} jogador{capacities[i] === 1 ? "" : "es"}
                        {i === reserveTeamIndex ? " · reserva" : ""})
                      </span>
                    </span>
                    <Select value={team.color} onValueChange={(hex) => setTeamColor(i, hex as string)}>
                      <SelectTrigger className="w-36 shrink-0">
                        <SelectValue>
                          {(hex: string) => {
                            const selected = TEAM_COLORS.find((c) => c.hex === hex)
                            return (
                              <>
                                <span
                                  className="inline-block size-4 shrink-0 rounded-full border"
                                  style={{ backgroundColor: hex }}
                                />
                                {selected?.name ?? "Cor"}
                              </>
                            )
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {TEAM_COLORS.map((c) => (
                          <SelectItem key={c.hex} value={c.hex}>
                            <span
                              className="inline-block size-4 shrink-0 rounded-full border"
                              style={{ backgroundColor: c.hex }}
                            />
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {i === reserveTeamIndex && (
                    <div className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 p-2.5">
                      <div className="flex flex-col gap-0.5">
                        <Label htmlFor="reserve-drafts" className="text-sm">
                          Escolher capitão e jogadores no sorteio
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {reserveDraftsActively
                            ? "Esse time também terá vez de escolher — o primeiro escolhido vira capitão."
                            : "Sem isso, esse time recebe automaticamente quem sobrar."}
                        </span>
                      </div>
                      <Switch
                        id="reserve-drafts"
                        checked={reserveDraftsActively}
                        onCheckedChange={setReserveDraftsActively}
                        className="mt-0.5 shrink-0"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <Button size="touch" className="w-full" onClick={startDraft}>
            Iniciar escolha de jogadores
          </Button>
        </div>
      )}

      {phase === "draft" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span
                  className="inline-block size-3 rounded-full border"
                  style={{ backgroundColor: teams[currentTeamIndex]?.color }}
                />
                Vez do Time {teams[currentTeamIndex]?.number} escolher
                {teams[currentTeamIndex]?.players.length === 0 ? " (capitão)" : ""}
              </CardTitle>
              {canUndoLastPick && (
                <Button variant="outline" size="sm" className="shrink-0" onClick={undoLastPick}>
                  <Undo2 className="size-4" /> Corrigir
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {availablePlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => pickPlayer(player.id)}
                  className="min-h-11 rounded-md border px-3 py-2 text-left text-base uppercase hover:bg-muted"
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
              <TeamRosterCard
                key={i}
                color={team.color}
                number={team.number}
                players={team.players}
                captainId={team.captainId}
                highlighted={i === currentTeamIndex}
                subtitle={
                  <p className="text-xs text-muted-foreground">
                    {team.players.length}/{capacities[i]} vagas preenchidas
                    {i === reserveTeamIndex ? " · reserva" : ""}
                  </p>
                }
              />
            ))}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Toque em um jogador e depois no time de destino para mover, ou arraste pela alça.
              Toque na estrela para trocar o capitão.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="touch" className="flex-1" onClick={resetDraft}>
                Refazer times
              </Button>
              <Button
                size="touch"
                className="flex-1"
                disabled={saving}
                onClick={async () => {
                  const { error } = await save()
                  if (!error) navigate(`/matches/${id}/live`, { replace: true })
                }}
              >
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

      {matchStatus === "teams_formed" && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            className="text-xs text-destructive underline"
            onClick={() => setResetConfirmOpen(true)}
          >
            Excluir times e voltar para rascunho
          </button>
        </div>
      )}

      <MatchQuickSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        showPlayersPerTeam
        maxPlayers={0}
        playersPerTeam={playersPerTeam}
        note="Mudar isso recalcula quantos times serão formados."
        onSave={({ playersPerTeam: n }) => changePlayersPerTeam(n)}
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Voltar a pelada para rascunho?"
        description="Isso apaga os times formados e volta a pelada para rascunho. Os participantes continuam selecionados."
        confirmLabel="Excluir times"
        confirmVariant="destructive"
        onOpenChange={setResetConfirmOpen}
        onConfirm={handleResetToDraft}
      />
    </div>
  )
}

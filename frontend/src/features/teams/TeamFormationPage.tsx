import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowUpDown, Check, RefreshCw, Repeat, Settings2, Undo2, UserMinus } from "lucide-react"
import { teamCapacity, useTeamFormation, type FormationMethod } from "@/features/teams/useTeamFormation"
import { TeamsBoard } from "@/features/teams/TeamsBoard"
import { TeamOrderEditor } from "@/features/teams/TeamOrderEditor"
import { useDepartedPlayerIds } from "@/features/teams/usePlayerDepartures"
import { TeamColorSelect } from "@/features/teams/TeamColorSelect"
import { TeamBalanceBar } from "@/features/teams/TeamBalanceBar"
import { formationBalance } from "@/features/teams/teamStrength"
import { MatchQuickSettingsDialog } from "@/features/matches/MatchQuickSettingsDialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { TeamRosterCard } from "@/components/TeamRosterCard"
import { StarsDisplay } from "@/features/players/StarsDisplay"
import { cn } from "@/lib/utils"

const METHODS: { key: FormationMethod; title: string; desc: string }[] = [
  {
    key: "alternado",
    title: "Alternado",
    desc: "Os capitães revezam a escolha, um jogador por vez. Divisão justa e disputada.",
  },
  {
    key: "livre",
    title: "Livre",
    desc: "Você escolhe um time e monta ele inteiro, depois passa para o próximo. Controle total.",
  },
  {
    key: "sorteio",
    title: "Sorteio",
    desc: "O app monta os times automaticamente. Rápido e imparcial, com opção de equilibrar pelas estrelas.",
  },
]

const SETUP_INTRO: Record<FormationMethod, string> = {
  alternado:
    "Escolha a cor de cada time. Depois os capitães revezam a escolha (o primeiro jogador escolhido de cada time vira o capitão).",
  livre:
    "Escolha a cor de cada time. Depois selecione um time e vá adicionando os jogadores dele, na ordem que quiser.",
  sorteio:
    "Escolha a cor de cada time. Depois é só sortear — você ainda pode ajustar tudo no quadro antes de salvar.",
}

const START_LABEL: Record<FormationMethod, string> = {
  alternado: "Iniciar escolha de jogadores",
  livre: "Iniciar montagem",
  sorteio: "Sortear times",
}

const METHOD_TITLE: Record<FormationMethod, string> = {
  alternado: "Alternado",
  livre: "Livre",
  sorteio: "Sorteio",
}

const METHOD_SHORT: Record<FormationMethod, string> = {
  alternado: "Capitães revezam a escolha",
  livre: "Um time por vez",
  sorteio: "Distribuição automática",
}

/** Compact read-only rating shown next to a player in the pick list. Uses the
 * shared display so half stars (3.5) render properly instead of being
 * truncated by a whole-star loop. */
function PlayerRating({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="shrink-0 text-xs text-muted-foreground normal-case">sem nota</span>
  }
  return <StarsDisplay value={value} size="size-3.5" className="shrink-0" />
}

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
    formationMethod,
    setFormationMethod,
    balanceByStars,
    setBalanceByStars,
    formedInSession,
    reserveDraftsActively,
    setReserveDraftsActively,
    canUndoLastPick,
    matchStatus,
    setTeamColor,
    proceedToSetup,
    backToMethod,
    backToDraft,
    startDraft,
    runSorteio,
    selectTeam,
    pickPlayer,
    finishDraft,
    undoLastPick,
    movePlayer,
    moveTeam,
    canReorderTeams,
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
  // Reordering swaps the board out for a compact sortable list, so "hold to
  // drag" always means one thing at a time (a team, not a player).
  const [reordering, setReordering] = useState(false)
  // Players who left the pelada — flagged on the board while it's in progress.
  const departedIds = useDepartedPlayerIds(id ?? "", matchStatus === "in_progress")

  async function handleResetToDraft() {
    setResetConfirmOpen(false)
    const { error } = await resetToDraft()
    if (!error) navigate("/matches")
  }

  useEffect(() => {
    if (phase === "draft") {
      onBackContextChange?.({ hasInFlowBack: true, goBack: backToSetup })
    } else if (phase === "setup") {
      onBackContextChange?.({ hasInFlowBack: true, goBack: backToMethod })
    } else if (phase === "method" && hasSavedTeams) {
      onBackContextChange?.({ hasInFlowBack: true, goBack: reload })
    } else if (phase === "done" && formedInSession) {
      // Teams formed in this session: "back" steps into the flow, not out of
      // the page. Sorteio skips the pick screen, so it returns to setup.
      onBackContextChange?.({
        hasInFlowBack: true,
        goBack: formationMethod === "sorteio" ? backToSetup : backToDraft,
      })
    } else {
      onBackContextChange?.({ hasInFlowBack: false, goBack: () => {} })
    }
  }, [
    phase,
    hasSavedTeams,
    formedInSession,
    formationMethod,
    backToSetup,
    backToMethod,
    backToDraft,
    reload,
    onBackContextChange,
  ])

  function startFormation() {
    if (formationMethod === "sorteio") runSorteio()
    else startDraft()
  }

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
  // The full participant pool works in both phases: during the draft it's the
  // unpicked players plus everyone already on a team; on the board it's just
  // the teams. Feeds the per-team nota (avg stars) shown across the formation.
  const allPlayers = [...availablePlayers, ...teams.flatMap((t) => t.players)]
  const balances = formationBalance(teams, allPlayers)

  return (
    <div className="flex w-full flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {phase === "method" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Como você quer formar os times?</p>
          <div className="flex flex-col gap-2">
            {METHODS.map((method) => {
              const selected = formationMethod === method.key
              return (
                <Card
                  key={method.key}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selected ? "ring-2 ring-primary" : "hover:bg-muted/40"
                  )}
                  onClick={() => setFormationMethod(method.key)}
                >
                  <CardContent className="flex items-start gap-3 py-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                      )}
                    >
                      {selected && <Check className="size-3.5" />}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{method.title}</span>
                      <span className="text-sm text-muted-foreground">{method.desc}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {formationMethod === "sorteio" && (
            <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="balance-stars" className="text-sm">
                  Equilibrar pelas estrelas
                </Label>
                <span className="text-xs text-muted-foreground">
                  {balanceByStars
                    ? "Distribui os jogadores para deixar as notas dos times o mais parelhas possível."
                    : "Sorteio totalmente aleatório, sem olhar as estrelas."}
                </span>
              </div>
              <Switch
                id="balance-stars"
                checked={balanceByStars}
                onCheckedChange={setBalanceByStars}
                className="mt-0.5 shrink-0"
              />
            </div>
          )}

          <Button size="touch" className="w-full" onClick={proceedToSetup}>
            Continuar
          </Button>
        </div>
      )}

      {phase === "setup" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{SETUP_INTRO[formationMethod]}</p>
          <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <div className="flex flex-col">
              <span className="text-sm">
                Método: <strong>{METHOD_TITLE[formationMethod]}</strong>
              </span>
              <span className="text-xs text-muted-foreground">
                {formationMethod === "sorteio"
                  ? balanceByStars
                    ? "Equilibrado pelas estrelas"
                    : "Sorteio aleatório"
                  : METHOD_SHORT[formationMethod]}
              </span>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={backToMethod}>
              <Repeat className="size-4" /> Alterar método
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <div className="flex flex-col">
              <span className="text-sm">
                Jogadores na pelada: <strong>{totalParticipants}</strong>
              </span>
              <span className="text-sm">
                Jogadores por time: <strong>{playersPerTeam}</strong>
              </span>
            </div>
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
                    <TeamColorSelect
                      value={team.color}
                      onChange={(hex) => setTeamColor(i, hex)}
                      className="w-36 shrink-0"
                    />
                  </div>

                  {i === reserveTeamIndex && formationMethod === "alternado" && (
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
          <Button size="touch" className="w-full" onClick={startFormation}>
            {START_LABEL[formationMethod]}
          </Button>
        </div>
      )}

      {phase === "draft" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-col gap-2">
              <div className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {availablePlayers.length === 0 ? (
                    "Todos os jogadores foram escolhidos"
                  ) : formationMethod === "livre" ? (
                    <>
                      <span
                        className="inline-block size-3 rounded-full border"
                        style={{ backgroundColor: teams[currentTeamIndex]?.color }}
                      />
                      Montando o Time {teams[currentTeamIndex]?.number}
                    </>
                  ) : (
                    <>
                      <span
                        className="inline-block size-3 rounded-full border"
                        style={{ backgroundColor: teams[currentTeamIndex]?.color }}
                      />
                      Vez do Time {teams[currentTeamIndex]?.number} escolher
                      {teams[currentTeamIndex]?.players.length === 0 ? " (capitão)" : ""}
                    </>
                  )}
                </CardTitle>
                {canUndoLastPick && (
                  <Button variant="outline" size="sm" className="shrink-0" onClick={undoLastPick}>
                    <Undo2 className="size-4" /> Corrigir
                  </Button>
                )}
              </div>
              {formationMethod === "livre" && availablePlayers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {teams.map((team, i) => {
                    const full = team.players.length >= capacities[i]!
                    const active = i === currentTeamIndex
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectTeam(i)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                          active ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted",
                          full && !active && "opacity-50"
                        )}
                      >
                        <span
                          className="inline-block size-2.5 rounded-full border"
                          style={{ backgroundColor: team.color }}
                        />
                        Time {team.number} ({team.players.length}/{capacities[i]})
                      </button>
                    )
                  })}
                </div>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {availablePlayers.length > 0 ? (
                availablePlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => pickPlayer(player.id)}
                    className="flex min-h-11 items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-base uppercase hover:bg-muted"
                  >
                    <span className="flex-1">
                      {player.name}
                      {player.nickname ? ` (${player.nickname})` : ""}
                      {player.position === "goleiro" ? " 🧤" : ""}
                    </span>
                    <PlayerRating value={player.skill_level} />
                  </button>
                ))
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Confira os times abaixo e avance para ajustar (mover jogadores, trocar capitão) e salvar.
                  </p>
                  <Button size="touch" className="w-full" onClick={finishDraft}>
                    Avançar
                  </Button>
                </>
              )}
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
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-muted-foreground">
                      {team.players.length}/{capacities[i]} vagas preenchidas
                      {i === reserveTeamIndex ? " · reserva" : ""}
                    </p>
                    <TeamBalanceBar balance={balances[i]!} />
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}

      {phase === "done" && reordering && (
        <div className="flex flex-col gap-4">
          <TeamOrderEditor teams={teams} onMoveTeam={moveTeam} />
          <Button size="touch" className="w-full" onClick={() => setReordering(false)}>
            <Check className="size-4" /> Concluir ordem
          </Button>
        </div>
      )}

      {phase === "done" && !reordering && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Toque em um jogador e depois no time de destino para mover, ou segure o jogador
              (0,5s) e arraste. Toque na estrela para trocar o capitão.
            </p>
            {formationMethod === "sorteio" && (
              <Button variant="secondary" size="touch" className="w-full" onClick={runSorteio}>
                <RefreshCw className="size-4" /> Sortear de novo
              </Button>
            )}
            {canReorderTeams && teams.length > 1 && (
              <Button
                variant="outline"
                size="touch"
                className="w-full"
                onClick={() => setReordering(true)}
              >
                <ArrowUpDown className="size-4" /> Reordenar times
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="touch"
                className="flex-1"
                onClick={() => {
                  setReordering(false)
                  resetDraft()
                }}
              >
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
                {saving ? "Salvando..." : "Salvar times"}
              </Button>
            </div>
          </div>
          <TeamsBoard
            teams={teams}
            playersPerTeam={playersPerTeam}
            balances={balances}
            departedIds={departedIds}
            onMovePlayer={movePlayer}
            onSetCaptain={setCaptain}
            onSetColor={setTeamColor}
          />
          {matchStatus === "in_progress" && id && (
            <button
              type="button"
              onClick={() => navigate(`/matches/${id}/saidas`)}
              className="flex items-center justify-center gap-1.5 self-center pt-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <UserMinus className="size-3.5" /> Quem saiu da pelada
            </button>
          )}
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

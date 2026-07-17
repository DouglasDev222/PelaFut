import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import type { EndCondition, Match, MatchInput } from "@pelafut/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toastManager } from "@/components/ui/toast"

interface MatchFormProps {
  initial?: Match
  onSubmit: (input: MatchInput) => Promise<{ error: string | null }>
  onClearData?: () => Promise<{ error: string | null }>
  /** Existing peladas offered as templates when creating a new one. */
  templates?: Match[]
}

export function MatchForm({ initial, onSubmit, onClearData, templates }: MatchFormProps) {
  const navigate = useNavigate()
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [dataCleared, setDataCleared] = useState(false)
  const [templateId, setTemplateId] = useState("")

  const [name, setName] = useState(initial?.name ?? "")
  const [location, setLocation] = useState(initial?.location ?? "")
  const [matchDate, setMatchDate] = useState(initial?.match_date ?? "")
  const [startTime, setStartTime] = useState(initial?.start_time ?? "")
  const [maxPlayers, setMaxPlayers] = useState(String(initial?.max_players ?? 15))
  const [playersPerTeam, setPlayersPerTeam] = useState(String(initial?.players_per_team ?? 5))
  const [endCondition, setEndCondition] = useState<EndCondition>(initial?.end_condition ?? "time")
  const [matchDuration, setMatchDuration] = useState(
    initial?.match_duration_minutes != null ? String(initial.match_duration_minutes) : "10"
  )
  const [goalsToWin, setGoalsToWin] = useState(
    initial?.goals_to_win != null ? String(initial.goals_to_win) : "2"
  )
  const [tieBothLeave, setTieBothLeave] = useState(initial?.tie_both_leave_allowed ?? true)
  const [maxTimePerTeam, setMaxTimePerTeam] = useState(
    initial?.max_time_per_team_minutes != null ? String(initial.max_time_per_team_minutes) : ""
  )

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Copies the settings of an existing pelada into the form, leaving the
  // identity fields (name and date) for the user to fill in.
  function applyTemplate(m: Match) {
    setLocation(m.location ?? "")
    setStartTime(m.start_time ?? "")
    setMaxPlayers(String(m.max_players))
    setPlayersPerTeam(String(m.players_per_team))
    setEndCondition(m.end_condition)
    setMatchDuration(m.match_duration_minutes != null ? String(m.match_duration_minutes) : "10")
    setGoalsToWin(m.goals_to_win != null ? String(m.goals_to_win) : "2")
    setTieBothLeave(m.tie_both_leave_allowed)
    setMaxTimePerTeam(m.max_time_per_team_minutes != null ? String(m.max_time_per_team_minutes) : "")
  }

  const showTemplates = !initial && templates && templates.length > 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await onSubmit({
      name,
      location: location || null,
      match_date: matchDate,
      start_time: startTime || null,
      max_players: Number(maxPlayers),
      players_per_team: Number(playersPerTeam),
      end_condition: endCondition,
      match_duration_minutes:
        endCondition === "time" || endCondition === "both" ? Number(matchDuration) : null,
      goals_to_win: endCondition === "goals" || endCondition === "both" ? Number(goalsToWin) : null,
      tie_both_leave_allowed: tieBothLeave,
      max_time_per_team_minutes: maxTimePerTeam ? Number(maxTimePerTeam) : null,
    })
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate("/matches")
  }

  async function handleClearData() {
    if (!onClearData) return
    const { error } = await onClearData()
    setClearConfirmOpen(false)
    if (error) {
      toastManager.add({ title: "Erro ao limpar dados", description: error, type: "error" })
      return
    }
    setDataCleared(true)
    toastManager.add({ title: "Dados da pelada limpos", description: "Jogos, gols e assistências foram apagados." })
  }

  const showDangerZone = onClearData && (initial?.status === "in_progress" || initial?.status === "finished")

  return (
    <div className="flex w-full flex-col gap-4 pb-4">
      <Card className="w-full border-none shadow-none sm:border sm:shadow-sm">
      <CardHeader>
        <CardTitle>{initial ? "Editar pelada" : "Nova pelada"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="match-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {showTemplates && (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
              <Label htmlFor="template">Copiar configurações de outra pelada</Label>
              <Select
                value={templateId}
                onValueChange={(v) => {
                  const tid = v as string
                  setTemplateId(tid)
                  const m = templates!.find((t) => t.id === tid)
                  if (m) applyTemplate(m)
                }}
              >
                <SelectTrigger id="template">
                  <SelectValue placeholder="Selecione uma pelada...">
                    {(value: string) => {
                      const m = templates!.find((t) => t.id === value)
                      return m ? `${m.name} · ${m.match_date}` : "Selecione uma pelada..."
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {templates!.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} · {m.match_date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Preenche local, horário e regras. O nome e a data você define abaixo.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="location">Local</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="matchDate">Data</Label>
              <Input
                id="matchDate"
                type="date"
                required
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="startTime">Horário</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxPlayers">Máximo de jogadores</Label>
              <Input
                id="maxPlayers"
                type="number"
                min={2}
                required
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="playersPerTeam">Jogadores por time</Label>
              <Input
                id="playersPerTeam"
                type="number"
                min={1}
                required
                value={playersPerTeam}
                onChange={(e) => setPlayersPerTeam(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Critério de término</Label>
            <RadioGroup
              value={endCondition}
              onValueChange={(v) => setEndCondition(v as EndCondition)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="time" id="end-time" />
                <Label htmlFor="end-time">Tempo</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="goals" id="end-goals" />
                <Label htmlFor="end-goals">Gols</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="both" id="end-both" />
                <Label htmlFor="end-both">Tempo ou gols (o que vier primeiro)</Label>
              </div>
            </RadioGroup>
          </div>

          {(endCondition === "time" || endCondition === "both") && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="matchDuration">Tempo da partida (minutos)</Label>
              <Input
                id="matchDuration"
                type="number"
                min={1}
                required
                value={matchDuration}
                onChange={(e) => setMatchDuration(e.target.value)}
              />
            </div>
          )}

          {(endCondition === "goals" || endCondition === "both") && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="goalsToWin">Quantidade de gols</Label>
              <Input
                id="goalsToWin"
                type="number"
                min={1}
                required
                value={goalsToWin}
                onChange={(e) => setGoalsToWin(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch id="tieBothLeave" checked={tieBothLeave} onCheckedChange={setTieBothLeave} />
            <Label htmlFor="tieBothLeave">Empate: os dois times saem</Label>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="maxTimePerTeam">Tempo máximo que um time pode ficar (opcional, minutos)</Label>
            <Input
              id="maxTimePerTeam"
              type="number"
              min={1}
              value={maxTimePerTeam}
              onChange={(e) => setMaxTimePerTeam(e.target.value)}
            />
          </div>

          </form>
      </CardContent>
    </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {showDangerZone && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Zona de risco</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Apaga o histórico de jogos, gols e assistências dessa pelada — os times e jogadores continuam
              cadastrados, prontos para recomeçar do zero.
            </p>
            <Button
              variant="destructive"
              size="touch"
              onClick={() => setClearConfirmOpen(true)}
              disabled={dataCleared}
            >
              {dataCleared ? "Dados limpos ✓" : "Limpar dados da pelada"}
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Limpar dados da pelada?"
        description="Isso apaga todos os jogos, gols e assistências registrados. Times e jogadores continuam cadastrados. Essa ação não pode ser desfeita."
        confirmLabel="Limpar dados"
        confirmVariant="destructive"
        onOpenChange={setClearConfirmOpen}
        onConfirm={handleClearData}
      />

      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 p-4 backdrop-blur">
        <Button form="match-form" type="submit" size="touch" className="w-full" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  )
}

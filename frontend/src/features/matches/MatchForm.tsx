import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import type { EndCondition, Match, MatchInput } from "@pelafut/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MatchFormProps {
  initial?: Match
  onSubmit: (input: MatchInput) => Promise<{ error: string | null }>
}

export function MatchForm({ initial, onSubmit }: MatchFormProps) {
  const navigate = useNavigate()

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

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{initial ? "Editar pelada" : "Nova pelada"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

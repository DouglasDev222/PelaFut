import { useState } from "react"
import { Link } from "react-router-dom"
import { MoreVertical } from "lucide-react"
import type { Match, MatchStatus } from "@pelafut/shared"
import { useMatches } from "@/features/matches/useMatches"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const STATUS_LABELS: Record<MatchStatus, string> = {
  draft: "Rascunho",
  teams_formed: "Times formados",
  in_progress: "Partida em andamento",
  finished: "Encerrada",
}

const STATUS_TONES: Record<MatchStatus, StatusTone> = {
  draft: "neutral",
  teams_formed: "info",
  in_progress: "warning",
  finished: "success",
}

type ActionKey = "participants" | "teams" | "live" | "stats" | "edit"

function actionsFor(match: Match): Record<ActionKey, { label: string; to: string; show: boolean }> {
  const liveLabel =
    match.status === "finished" ? "Ver partida" : match.status === "teams_formed" ? "Iniciar jogo" : "Partida ao vivo"
  return {
    participants: { label: "Participantes", to: `/matches/${match.id}/participants`, show: true },
    teams: { label: "Times", to: `/matches/${match.id}/teams`, show: true },
    live: { label: liveLabel, to: `/matches/${match.id}/live`, show: match.status !== "draft" },
    stats: {
      label: "Estatísticas",
      to: `/matches/${match.id}/stats`,
      show: match.status === "in_progress" || match.status === "finished",
    },
    edit: { label: "Editar", to: `/matches/${match.id}/edit`, show: true },
  }
}

// Statuses with more than one entry get shown as buttons side by side on the
// card (the rest fall back to the overflow menu). Draft and teams_formed
// both need two: picking participants doesn't move the match out of draft,
// so teams can already be formed from a draft match — same as teams_formed,
// where reviewing the teams and starting the game matter equally.
const FEATURED_ACTION_KEYS: Record<MatchStatus, ActionKey[]> = {
  draft: ["participants", "teams"],
  teams_formed: ["teams", "live"],
  in_progress: ["live"],
  finished: ["stats"],
}

export function MatchListPage() {
  const { matches, participantCounts, loading, error, deleteMatch } = useMatches()

  if (loading) return null

  const today = todayIso()
  const upcoming = matches.filter((m) => m.match_date >= today)
  const past = matches.filter((m) => m.match_date < today)

  return (
    <div className="flex w-full flex-col gap-6">
      <Link to="/matches/new" className={cn(buttonVariants({ size: "touch" }), "w-full")}>
        + Nova pelada
      </Link>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <MatchSection title="Próximas" matches={upcoming} participantCounts={participantCounts} onDelete={deleteMatch} />
      <MatchSection title="Passadas" matches={past} participantCounts={participantCounts} onDelete={deleteMatch} />
    </div>
  )
}

function MatchSection({
  title,
  matches,
  participantCounts,
  onDelete,
}: {
  title: string
  matches: Match[]
  participantCounts: Record<string, number>
  onDelete: (id: string) => Promise<{ error: string | null }>
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {matches.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma pelada aqui.</p>}
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          participantCount={participantCounts[match.id] ?? 0}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function MatchCard({
  match,
  participantCount,
  onDelete,
}: {
  match: Match
  participantCount: number
  onDelete: (id: string) => Promise<{ error: string | null }>
}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const actions = actionsFor(match)
  const featuredKeys = FEATURED_ACTION_KEYS[match.status]
  const featured = featuredKeys.map((key) => actions[key])
  const secondary = (Object.keys(actions) as ActionKey[])
    .filter((key) => !featuredKeys.includes(key) && actions[key].show)
    .map((key) => actions[key])

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <p className="font-medium">{match.name}</p>
            <p className="text-xs text-muted-foreground">
              {match.match_date}
              {match.start_time ? ` às ${match.start_time.slice(0, 5)}` : ""}
              {match.location ? ` · ${match.location}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className={cn(participantCount > 0 && "font-medium text-foreground")}>
                {participantCount}/{match.max_players} participantes
              </span>{" "}
              · {match.players_per_team}/time
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <StatusBadge
              label={STATUS_LABELS[match.status]}
              tone={STATUS_TONES[match.status]}
              pulse={match.status === "in_progress"}
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Mais ações"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {secondary.map((action) => (
                  <DropdownMenuItem key={action.to} render={<Link to={action.to} />}>
                    {action.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex gap-2">
          {featured.map((action, i) => (
            <Link
              key={action.to}
              to={action.to}
              className={cn(
                buttonVariants({ size: "touch", variant: featured.length > 1 && i === 0 ? "outline" : "default" }),
                "flex-1"
              )}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </CardContent>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Excluir pelada?"
        description={`Isso apaga "${match.name}" e todo o histórico de jogos. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        confirmVariant="destructive"
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => {
          setDeleteConfirmOpen(false)
          onDelete(match.id)
        }}
      />
    </Card>
  )
}

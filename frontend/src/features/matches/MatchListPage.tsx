import { Link } from "react-router-dom"
import { useMatches } from "@/features/matches/useMatches"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function MatchListPage() {
  const { matches, loading, error, deleteMatch } = useMatches()

  if (loading) return null

  const today = todayIso()
  const upcoming = matches.filter((m) => m.match_date >= today)
  const past = matches.filter((m) => m.match_date < today)

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Peladas</h1>
        <Link to="/matches/new" className={buttonVariants()}>
          Nova pelada
        </Link>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <MatchSection title="Próximas" matches={upcoming} onDelete={deleteMatch} />
      <MatchSection title="Passadas" matches={past} onDelete={deleteMatch} />
    </div>
  )
}

function MatchSection({
  title,
  matches,
  onDelete,
}: {
  title: string
  matches: ReturnType<typeof useMatches>["matches"]
  onDelete: (id: string) => Promise<{ error: string | null }>
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {matches.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma pelada aqui.</p>
      )}
      {matches.map((match) => (
        <Card key={match.id}>
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium">{match.name}</p>
              <p className="text-sm text-muted-foreground">
                {match.match_date}
                {match.start_time ? ` às ${match.start_time.slice(0, 5)}` : ""}
                {match.location ? ` · ${match.location}` : ""}
                {" · "}
                {match.max_players} jogadores · {match.players_per_team}/time
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/matches/${match.id}/participants`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Participantes
              </Link>
              <Link
                to={`/matches/${match.id}/edit`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Editar
              </Link>
              <Button variant="destructive" size="sm" onClick={() => onDelete(match.id)}>
                Excluir
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

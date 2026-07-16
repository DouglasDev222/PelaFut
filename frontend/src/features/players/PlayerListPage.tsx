import { Link } from "react-router-dom"
import { usePlayers } from "@/features/players/usePlayers"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const STAR = "★"

export function PlayerListPage() {
  const { players, loading, error, deletePlayer, updatePlayer } = usePlayers()

  if (loading) return null

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Peladeiros</h1>
        <Link to="/players/new" className={buttonVariants()}>
          Novo peladeiro
        </Link>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {players.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum peladeiro cadastrado ainda.</p>
      )}

      <div className="flex flex-col gap-2">
        {players.map((player) => (
          <Card key={player.id}>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                {player.photo_url ? (
                  <img
                    src={player.photo_url}
                    alt={player.name}
                    className="size-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-12 rounded-full bg-muted" />
                )}
                <div>
                  <p className="font-medium">
                    {player.name}
                    {player.nickname ? ` (${player.nickname})` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {player.position === "goleiro" ? "Goleiro" : "Jogador"}
                    {player.shirt_number != null ? ` · #${player.shirt_number}` : ""}
                    {player.skill_level ? ` · ${STAR.repeat(player.skill_level)}` : ""}
                    {!player.active ? " · Inativo" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updatePlayer(player.id, { ...player, active: !player.active })}
                >
                  {player.active ? "Inativar" : "Ativar"}
                </Button>
                <Link
                  to={`/players/${player.id}/edit`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Editar
                </Link>
                <Button variant="destructive" size="sm" onClick={() => deletePlayer(player.id)}>
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

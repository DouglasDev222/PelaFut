import { useState } from "react"
import { Link } from "react-router-dom"
import { MoreVertical, Search, Users } from "lucide-react"
import type { Player } from "@pelafut/shared"
import { usePlayers } from "@/features/players/usePlayers"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { PlayerAvatar } from "@/components/PlayerAvatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"

const STAR = "★"

function normalize(s: string) {
  return s.trim().toLowerCase()
}

function matchesSearch(player: Player, query: string) {
  const q = normalize(query)
  if (!q) return true
  return normalize(player.name).includes(q) || normalize(player.nickname ?? "").includes(q)
}

export function PlayerListPage() {
  const { players, loading, error, deletePlayer, updatePlayer } = usePlayers()
  const [search, setSearch] = useState("")

  if (loading) return null

  const filtered = players.filter((p) => matchesSearch(p, search))

  return (
    <div className="flex w-full flex-col gap-4">
      <Link to="/players/new" className={cn(buttonVariants({ size: "touch" }), "w-full")}>
        + Novo peladeiro
      </Link>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {players.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar peladeiro..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {players.length === 0 && (
        <EmptyState
          icon={Users}
          title="Nenhum peladeiro cadastrado ainda"
          description="Cadastre o primeiro peladeiro pra começar a montar suas peladas."
        />
      )}

      {players.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={Search}
          title="Nenhum peladeiro encontrado"
          description={`Nada encontrado para "${search}".`}
        />
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            onToggleActive={() => updatePlayer(player.id, { ...player, active: !player.active })}
            onDelete={() => deletePlayer(player.id)}
          />
        ))}
      </div>
    </div>
  )
}

function PlayerCard({
  player,
  onToggleActive,
  onDelete,
}: {
  player: Player
  onToggleActive: () => void
  onDelete: () => void
}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        <PlayerAvatar photoUrl={player.photo_url} name={player.name} />
        <div className="flex-1">
          <p className="flex items-center gap-2 font-medium uppercase">
            {player.name}
            {player.nickname ? ` (${player.nickname})` : ""}
            {!player.active && <StatusBadge label="Inativo" tone="neutral" className="normal-case" />}
          </p>
          <p className="text-sm text-muted-foreground">
            {player.position === "goleiro" ? "Goleiro" : "Jogador"}
            {player.shirt_number != null ? ` · #${player.shirt_number}` : ""}
            {player.skill_level ? ` · ${STAR.repeat(player.skill_level)}` : ""}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Mais ações"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem render={<Link to={`/players/${player.id}/stats`} />}>Estatísticas</DropdownMenuItem>
            <DropdownMenuItem render={<Link to={`/players/${player.id}/edit`} />}>Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleActive}>
              {player.active ? "Inativar" : "Ativar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Excluir peladeiro?"
        description={`Isso apaga "${player.name}" e todo o histórico de participação dele. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        confirmVariant="destructive"
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => {
          setDeleteConfirmOpen(false)
          onDelete()
        }}
      />
    </Card>
  )
}

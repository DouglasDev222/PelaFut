import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { BarChart3, Pencil } from "lucide-react"
import type { Player } from "@pelafut/shared"
import { fetchPlayer } from "@/features/players/usePlayers"
import { supabase } from "@/lib/supabaseClient"
import { StarRating } from "@/features/players/StarRating"
import { PlayerAvatar } from "@/components/PlayerAvatar"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { toastManager } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

function formatBirth(iso: string): string {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  const birth = new Date(Number(y), Number(m) - 1, Number(d))
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age--
  return `${d}/${m}/${y} · ${age} anos`
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

/**
 * The peladeiro's profile: every detail at a glance, reached only from the
 * players list. Stars are editable right here (the value the balanced draw
 * leans on the most), and "Editar" opens the full form for everything else.
 */
export function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetchPlayer(id).then(({ player, error }) => {
      setPlayer(player)
      setError(error)
      setLoading(false)
    })
  }, [id])

  async function handleRating(value: number | null) {
    if (!player) return
    const previous = player.skill_level
    setPlayer({ ...player, skill_level: value }) // optimistic
    const { error } = await supabase.from("players").update({ skill_level: value }).eq("id", player.id)
    if (error) {
      setPlayer({ ...player, skill_level: previous }) // revert
      toastManager.add({ title: "Não consegui salvar o nível", description: error.message, type: "error" })
    }
  }

  if (loading) return null
  if (!player) return <p className="text-sm text-destructive">{error ?? "Peladeiro não encontrado"}</p>

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full border-none shadow-none sm:border sm:shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <PlayerAvatar photoUrl={player.photo_url} name={player.name} size="size-24" iconSize="size-10" />
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-lg font-semibold uppercase">
              {player.name}
              {player.nickname ? ` (${player.nickname})` : ""}
            </h2>
            {!player.active && <StatusBadge label="Inativo" tone="neutral" className="normal-case" />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Nível</span>
            {/* Editable right here — the one number the balanced draw cares about. */}
            <StarRating value={player.skill_level} onChange={handleRating} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Posição" value={player.position === "goleiro" ? "Goleiro" : "Jogador"} />
            <InfoRow
              label="Número da camisa"
              value={player.shirt_number != null ? `#${player.shirt_number}` : "—"}
            />
            <InfoRow
              label="Nascimento"
              value={player.birth_date ? formatBirth(player.birth_date) : "—"}
            />
            <InfoRow label="Situação" value={player.active ? "Ativo" : "Inativo"} />
          </div>

          {player.notes && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Observações</span>
              <p className="text-sm whitespace-pre-wrap">{player.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => navigate(`/players/${player.id}/edit`)}
          className={cn(buttonVariants({ size: "touch" }), "w-full")}
        >
          <Pencil className="size-4" /> Editar peladeiro
        </button>
        <Link
          to={`/players/${player.id}/stats`}
          className={cn(buttonVariants({ variant: "outline", size: "touch" }), "w-full")}
        >
          <BarChart3 className="size-4" /> Ver estatísticas
        </Link>
      </div>
    </div>
  )
}

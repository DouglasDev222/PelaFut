import { useParams } from "react-router-dom"
import { usePublicStats } from "@/features/public/usePublicStats"
import { publicPlayerProfile } from "@/features/public/publicMapping"
import { PublicNotFound, PublicShell } from "@/features/public/PublicShell"
import { PlayerProfileView } from "@/features/stats/views/PlayerProfileView"

export function PublicPlayerPage() {
  const { codigo, jogadorId } = useParams<{ codigo: string; jogadorId: string }>()
  // Account-wide payload: the profile spans every published pelada.
  const { data, notFound, loading, error } = usePublicStats(codigo!)

  if (loading) return null
  if (notFound || !data) return <PublicNotFound />

  const { player, overall, byMatch } = publicPlayerProfile(data, jogadorId!)
  if (!player) return <PublicNotFound />

  return (
    <PublicShell codigo={codigo!} titulo={data.titulo}>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <PlayerProfileView
        player={player}
        overall={overall}
        byMatch={byMatch}
        hrefForMatch={(matchId) => `/pelada/${codigo}/jogo/${matchId}`}
      />
    </PublicShell>
  )
}

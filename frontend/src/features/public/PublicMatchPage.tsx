import { useParams } from "react-router-dom"
import { usePublicStats } from "@/features/public/usePublicStats"
import { PublicNotFound, PublicShell } from "@/features/public/PublicShell"
import { computePlayerStats } from "@/features/stats/aggregate"
import { MatchStatsView } from "@/features/stats/views/MatchStatsView"
import { PublicPlayerProfileProvider } from "@/features/stats/PlayerProfilePopup"

export function PublicMatchPage() {
  const { codigo, jogoId } = useParams<{ codigo: string; jogoId: string }>()
  // Scoped fetch: a shared per-pelada link only pulls that pelada.
  const { data, notFound, loading, error } = usePublicStats(codigo!, jogoId)

  if (loading) return null
  if (notFound || !data) return <PublicNotFound />

  const pelada = data.matches.find((m) => m.id === jogoId)
  if (!pelada) return <PublicNotFound />

  const playerStats = computePlayerStats(data.rounds, data.goals, data.participants)

  return (
    <PublicShell codigo={codigo!} titulo={data.titulo}>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <PublicPlayerProfileProvider data={data} codigo={codigo!}>
        <MatchStatsView
          matchName={pelada.nome}
          teams={data.teams}
          rounds={data.statsRounds}
          participants={data.participants}
          goals={data.goals}
          playerStats={playerStats}
          playersById={data.playersById}
          regulationSeconds={pelada.durationMinutes ? pelada.durationMinutes * 60 : undefined}
          tieBothLeaveAllowed={pelada.tieBothLeaveAllowed}
          hrefForPlayer={(id) => `/pelada/${codigo}/jogador/${id}`}
        />
      </PublicPlayerProfileProvider>
    </PublicShell>
  )
}

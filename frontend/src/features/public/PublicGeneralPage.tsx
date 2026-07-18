import { useParams } from "react-router-dom"
import { usePublicStats } from "@/features/public/usePublicStats"
import { PublicNotFound, PublicShell } from "@/features/public/PublicShell"
import { GeneralStatsView } from "@/features/stats/views/GeneralStatsView"

export function PublicGeneralPage() {
  const { codigo } = useParams<{ codigo: string }>()
  const { data, rows, matchesCount, notFound, loading, error } = usePublicStats(codigo!)

  if (loading) return null
  if (notFound || !data) return <PublicNotFound />

  return (
    <PublicShell codigo={codigo!} titulo={data.titulo}>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <GeneralStatsView
        rows={rows}
        matchesCount={matchesCount}
        hrefForPlayer={(id) => `/pelada/${codigo}/jogador/${id}`}
      />
    </PublicShell>
  )
}

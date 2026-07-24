import { Users } from "lucide-react"
import { useAccountStats } from "@/features/stats/useAccountStats"
import { GeneralStatsView } from "@/features/stats/views/GeneralStatsView"
import { PrivatePlayerProfileProvider } from "@/features/stats/PlayerProfilePopup"
import { EmptyState } from "@/components/ui/empty-state"

export function GeneralStatsPage() {
  const { rows, matchesCount, loading, error } = useAccountStats()

  if (loading) return null

  return (
    <div className="flex w-full flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum peladeiro cadastrado ainda"
          description="Cadastre peladeiros e jogue algumas peladas pra ver as estatísticas aqui."
        />
      ) : (
        <PrivatePlayerProfileProvider>
          <GeneralStatsView
            rows={rows}
            matchesCount={matchesCount}
            hrefForPlayer={(id) => `/players/${id}/stats`}
          />
        </PrivatePlayerProfileProvider>
      )}
    </div>
  )
}

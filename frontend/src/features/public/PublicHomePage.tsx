import { Link, useParams } from "react-router-dom"
import { BarChart3, CalendarDays } from "lucide-react"
import { usePublicAccount } from "@/features/public/usePublicStats"
import { PublicNotFound, PublicShell } from "@/features/public/PublicShell"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function PublicHomePage() {
  const { codigo } = useParams<{ codigo: string }>()
  const { summary, notFound, loading, error } = usePublicAccount(codigo!)

  if (loading) return null
  if (notFound || !summary) return <PublicNotFound />

  const totalJogos = summary.peladas.reduce((sum, p) => sum + p.jogos, 0)
  const totalGols = summary.peladas.reduce((sum, p) => sum + p.gols, 0)

  return (
    <PublicShell codigo={codigo!} titulo={summary.titulo}>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {summary.peladas.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhuma pelada encerrada ainda"
          description="Assim que uma pelada terminar, as estatísticas aparecem aqui."
        />
      ) : (
        <>
          <Card>
            <CardContent className="grid grid-cols-3 divide-x divide-border py-4 text-center">
              <div className="flex flex-col">
                <span className="text-2xl font-semibold tabular-nums">
                  {summary.peladas.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  {summary.peladas.length === 1 ? "pelada" : "peladas"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold tabular-nums">{totalJogos}</span>
                <span className="text-xs text-muted-foreground">
                  {totalJogos === 1 ? "jogo" : "jogos"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold tabular-nums">{totalGols}</span>
                <span className="text-xs text-muted-foreground">
                  {totalGols === 1 ? "gol" : "gols"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Link
            to={`/pelada/${codigo}/geral`}
            className={cn(buttonVariants({ size: "touch" }), "w-full")}
          >
            <BarChart3 className="size-4" /> Estatísticas gerais
          </Link>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground">Peladas</p>
            {summary.peladas.map((p) => (
              <Link key={p.id} to={`/pelada/${codigo}/jogo/${p.id}`}>
                <Card className="hover:bg-muted/40">
                  <CardContent className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{p.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.data}
                        {p.local ? ` · ${p.local}` : ""}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {p.jogos} {p.jogos === 1 ? "jogo" : "jogos"} · {p.gols}{" "}
                      {p.gols === 1 ? "gol" : "gols"}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </PublicShell>
  )
}

import { useParams } from "react-router-dom"
import { useTeamFormation } from "@/features/teams/useTeamFormation"
import { TeamsBoard } from "@/features/teams/TeamsBoard"
import { Button } from "@/components/ui/button"

export function TeamFormationPage() {
  const { id } = useParams<{ id: string }>()
  const { teams, loading, saving, error, alreadyFormed, movePlayer, save } = useTeamFormation(
    id!
  )

  if (loading) return null

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Formação dos times</h1>
        <Button onClick={save} disabled={saving || teams.length === 0}>
          {saving ? "Salvando..." : alreadyFormed ? "Salvar alterações" : "Confirmar times"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum participante selecionado ainda. Volte para a pelada e selecione os participantes
          primeiro.
        </p>
      ) : (
        <TeamsBoard teams={teams} onMovePlayer={movePlayer} />
      )}
    </div>
  )
}

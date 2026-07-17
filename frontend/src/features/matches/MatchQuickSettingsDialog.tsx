import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog"

/**
 * A small popup to tweak the two numbers people most often want to change
 * mid-flow (max participants and players-per-team) without opening the full
 * match edit form. Which fields show is up to the caller.
 */
export function MatchQuickSettingsDialog({
  open,
  onOpenChange,
  showMaxPlayers = false,
  showPlayersPerTeam = false,
  maxPlayers,
  playersPerTeam,
  note,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  showMaxPlayers?: boolean
  showPlayersPerTeam?: boolean
  maxPlayers: number
  playersPerTeam: number
  note?: string
  onSave: (values: { maxPlayers: number; playersPerTeam: number }) => Promise<{ error: string | null }>
}) {
  const [maxP, setMaxP] = useState(String(maxPlayers))
  const [perTeam, setPerTeam] = useState(String(playersPerTeam))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Snap the inputs back to the live values every time the dialog opens.
  useEffect(() => {
    if (open) {
      setMaxP(String(maxPlayers))
      setPerTeam(String(playersPerTeam))
      setError(null)
    }
  }, [open, maxPlayers, playersPerTeam])

  async function handleSave() {
    setSaving(true)
    setError(null)
    const { error } = await onSave({ maxPlayers: Number(maxP), playersPerTeam: Number(perTeam) })
    setSaving(false)
    if (error) {
      setError(error)
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogTitle>Ajustar quantidades</DialogTitle>
        <div className="flex flex-col gap-4">
          {showMaxPlayers && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="qs-max">Máximo de participantes</Label>
              <Input
                id="qs-max"
                type="number"
                inputMode="numeric"
                min={2}
                value={maxP}
                onChange={(e) => setMaxP(e.target.value)}
              />
            </div>
          )}
          {showPlayersPerTeam && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="qs-per">Jogadores por time</Label>
              <Input
                id="qs-per"
                type="number"
                inputMode="numeric"
                min={1}
                value={perTeam}
                onChange={(e) => setPerTeam(e.target.value)}
              />
            </div>
          )}
          {note && <p className="text-xs text-amber-600 dark:text-amber-500">{note}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col gap-2">
            <Button size="touch" className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button size="touch" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  )
}

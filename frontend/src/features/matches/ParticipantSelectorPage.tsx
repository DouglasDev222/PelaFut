import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import type { Match, Player } from "@pelafut/shared"
import { supabase } from "@/lib/supabaseClient"
import { fetchMatch } from "@/features/matches/useMatches"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ParticipantSelectorPage() {
  const { id } = useParams<{ id: string }>()
  const [match, setMatch] = useState<Match | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!id) return
    async function load() {
      const [{ match }, playersRes, matchPlayersRes] = await Promise.all([
        fetchMatch(id!),
        supabase.from("players").select("*").eq("active", true).order("name"),
        supabase.from("match_players").select("player_id").eq("match_id", id!),
      ])
      setMatch(match)
      setPlayers((playersRes.data as Player[]) ?? [])
      setSelectedIds(
        new Set(((matchPlayersRes.data as { player_id: string }[]) ?? []).map((r) => r.player_id))
      )
      setLoading(false)
    }
    load()
  }, [id])

  function toggle(playerId: string) {
    setSaved(false)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        if (match && next.size >= match.max_players) {
          setError(`Limite de ${match.max_players} jogadores atingido.`)
          return prev
        }
        setError(null)
        next.add(playerId)
      }
      return next
    })
  }

  async function handleSave() {
    if (!id) return
    setSaving(true)
    setError(null)

    const { data: current } = await supabase
      .from("match_players")
      .select("player_id")
      .eq("match_id", id)
    const currentIds = new Set(((current as { player_id: string }[]) ?? []).map((r) => r.player_id))

    const toAdd = [...selectedIds].filter((pid) => !currentIds.has(pid))
    const toRemove = [...currentIds].filter((pid) => !selectedIds.has(pid))

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from("match_players")
        .insert(toAdd.map((player_id) => ({ match_id: id, player_id })))
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from("match_players")
        .delete()
        .eq("match_id", id)
        .in("player_id", toRemove)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setSaved(true)
  }

  if (loading || !match) return null

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>
          Participantes — {match.name} ({selectedIds.size}/{match.max_players})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {players.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum peladeiro ativo cadastrado ainda.
            </p>
          )}
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
            {players.map((player) => (
              <label
                key={player.id}
                className="flex items-center gap-2 rounded-md border p-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(player.id)}
                  onChange={() => toggle(player.id)}
                />
                {player.name}
                {player.nickname ? ` (${player.nickname})` : ""}
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm text-muted-foreground">Participantes salvos.</p>}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar participantes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { Search, Settings2, Users } from "lucide-react"
import type { Match, Player } from "@pelafut/shared"
import { supabase } from "@/lib/supabaseClient"
import { fetchMatch } from "@/features/matches/useMatches"
import { MatchQuickSettingsDialog } from "@/features/matches/MatchQuickSettingsDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { PlayerAvatar } from "@/components/PlayerAvatar"
import { cn } from "@/lib/utils"

function normalize(s: string) {
  return s.trim().toLowerCase()
}

function matchesSearch(player: Player, query: string) {
  const q = normalize(query)
  if (!q) return true
  return normalize(player.name).includes(q) || normalize(player.nickname ?? "").includes(q)
}

/**
 * Trims a selection down to `max`, keeping the first `max` selected players in
 * list order and dropping the rest (the "last" selected). Returns the same set
 * unchanged when it already fits.
 */
export function trimSelectionToMax(
  selected: Set<string>,
  players: { id: string }[],
  max: number
): Set<string> {
  if (selected.size <= max) return selected
  const keep = new Set<string>()
  for (const p of players) {
    if (keep.size >= max) break
    if (selected.has(p.id)) keep.add(p.id)
  }
  return keep
}

export function ParticipantSelectorPage({
  onReady,
}: {
  onReady?: (actions: { addPlayer: () => void }) => void
}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [match, setMatch] = useState<Match | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    const [{ match }, playersRes, matchPlayersRes] = await Promise.all([
      fetchMatch(id),
      supabase.from("players").select("*").eq("active", true).order("name"),
      supabase.from("match_players").select("player_id").eq("match_id", id),
    ])
    setMatch(match)
    setPlayers((playersRes.data as Player[]) ?? [])
    setSelectedIds(
      new Set(((matchPlayersRes.data as { player_id: string }[]) ?? []).map((r) => r.player_id))
    )
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  function toggle(playerId: string) {
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

  // Persists the current selection without navigating — shared by "Salvar" and
  // the "add a new peladeiro" shortcut (which saves first so nothing is lost
  // when it leaves for the player form).
  const persist = useCallback(async (): Promise<{ error: string | null }> => {
    if (!id) return { error: "Pelada não encontrada" }
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
      if (error) return { error: error.message }
    }
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from("match_players")
        .delete()
        .eq("match_id", id)
        .in("player_id", toRemove)
      if (error) return { error: error.message }
    }
    return { error: null }
  }, [id, selectedIds])

  async function handleSave() {
    setSaving(true)
    setError(null)
    const { error } = await persist()
    setSaving(false)
    if (error) {
      setError(error)
      return
    }
    navigate(-1)
  }

  const handleAddPlayer = useCallback(async () => {
    setSaving(true)
    setError(null)
    const { error } = await persist()
    setSaving(false)
    if (error) {
      setError(error)
      return
    }
    navigate(`/players/new?returnTo=${encodeURIComponent(location.pathname)}`)
  }, [persist, navigate, location.pathname])

  // Expose the header shortcut through a stable wrapper that reads the latest
  // handler from a ref — passing `handleAddPlayer` directly would re-fire the
  // effect (and the parent's setState) on every keystroke.
  const addPlayerRef = useRef(handleAddPlayer)
  addPlayerRef.current = handleAddPlayer
  useEffect(() => {
    onReady?.({ addPlayer: () => addPlayerRef.current() })
  }, [onReady])

  async function handleSaveSettings({
    maxPlayers,
    playersPerTeam,
  }: {
    maxPlayers: number
    playersPerTeam: number
  }) {
    if (!id) return { error: "Pelada não encontrada" }
    const { error } = await supabase
      .from("matches")
      .update({ max_players: maxPlayers, players_per_team: playersPerTeam })
      .eq("id", id)
    if (error) return { error: error.message }
    setMatch((m) => (m ? { ...m, max_players: maxPlayers, players_per_team: playersPerTeam } : m))
    // Lowering the cap below the current selection drops the last-selected
    // players (in list order) down to the new limit. This trims only the
    // local selection — it's committed to the DB on "Salvar participantes".
    setSelectedIds((prev) => trimSelectionToMax(prev, players, maxPlayers))
    return { error: null }
  }

  if (loading || !match) return null

  const filtered = players.filter((p) => matchesSearch(p, search))

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
          <div className="flex flex-col">
            <span className="font-medium">{match.name}</span>
            <span className="text-sm">
              Participantes: <strong>{selectedIds.size}/{match.max_players}</strong>
            </span>
            <span className="text-sm">
              Jogadores por time: <strong>{match.players_per_team}</strong>
            </span>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="size-4" /> Ajustar
          </Button>
        </div>
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
      </div>

      {players.length === 0 && (
        <EmptyState
          icon={Users}
          title="Nenhum peladeiro ativo cadastrado ainda"
          description="Toque no ícone de cadastrar no topo para adicionar um peladeiro."
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
        {filtered.map((player) => {
          const checked = selectedIds.has(player.id)
          return (
            <button
              key={player.id}
              type="button"
              aria-pressed={checked}
              onClick={() => toggle(player.id)}
              className={cn(
                "flex min-h-16 items-center gap-3 rounded-md border p-3 text-left text-base",
                checked && "border-primary bg-primary/5"
              )}
            >
              <PlayerAvatar photoUrl={player.photo_url} name={player.name} size="size-10" iconSize="size-4" />
              <span className="flex-1 uppercase">
                {player.name}
                {player.nickname ? ` (${player.nickname})` : ""}
              </span>
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded border-2",
                  checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                )}
              >
                {checked ? "✓" : ""}
              </span>
            </button>
          )
        })}
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t bg-background/95 p-4 backdrop-blur">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button size="touch" className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar participantes"}
        </Button>
      </div>

      <MatchQuickSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        showMaxPlayers
        showPlayersPerTeam
        maxPlayers={match.max_players}
        playersPerTeam={match.players_per_team}
        onSave={handleSaveSettings}
      />
    </div>
  )
}

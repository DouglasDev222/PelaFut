import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import type { Player } from "@pelafut/shared"
import { fetchPlayer, usePlayers } from "@/features/players/usePlayers"
import { PlayerForm } from "@/features/players/PlayerForm"

export function PlayerFormPage() {
  const { id } = useParams<{ id: string }>()
  const { createPlayer, updatePlayer } = usePlayers()
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(Boolean(id))

  useEffect(() => {
    if (!id) return
    fetchPlayer(id).then(({ player }) => {
      setPlayer(player)
      setLoading(false)
    })
  }, [id])

  if (loading) return null

  return (
    <PlayerForm
      initial={player ?? undefined}
      onSubmit={(input) => (id ? updatePlayer(id, input) : createPlayer(input))}
    />
  )
}

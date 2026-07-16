import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import type { Match } from "@pelafut/shared"
import { fetchMatch, useMatches } from "@/features/matches/useMatches"
import { MatchForm } from "@/features/matches/MatchForm"

export function MatchFormPage() {
  const { id } = useParams<{ id: string }>()
  const { createMatch, updateMatch } = useMatches()
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(Boolean(id))

  useEffect(() => {
    if (!id) return
    fetchMatch(id).then(({ match }) => {
      setMatch(match)
      setLoading(false)
    })
  }, [id])

  if (loading) return null

  return (
    <MatchForm
      initial={match ?? undefined}
      onSubmit={async (input) => {
        if (id) return updateMatch(id, input)
        const { error } = await createMatch(input)
        return { error }
      }}
    />
  )
}

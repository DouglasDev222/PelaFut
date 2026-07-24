import { createContext, useContext, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { usePlayerStats } from "@/features/stats/usePlayerStats"
import { publicPlayerProfile, type PublicStatsData } from "@/features/public/publicMapping"
import { PlayerProfileView } from "@/features/stats/views/PlayerProfileView"
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * Lets any player name inside the stats screens open the player's profile as a
 * popup instead of navigating away. A provider (private or public) at the top
 * of each screen owns the dialog and the data loading; `PlayerName` reads this
 * context and turns into a button. When there's no provider it falls back to a
 * link (so the standalone pages / shared URLs keep working).
 */
const PlayerProfileContext = createContext<{ open: (playerId: string) => void } | null>(null)

export function usePlayerProfilePopup() {
  return useContext(PlayerProfileContext)
}

/** A clickable player name: opens the popup when inside a provider, else links. */
export function PlayerName({
  playerId,
  href,
  className,
  children,
}: {
  playerId: string
  href?: string
  className?: string
  children: ReactNode
}) {
  const popup = usePlayerProfilePopup()
  if (popup) {
    return (
      <button
        type="button"
        // Stop the click from also triggering a clickable row around it.
        onClick={(e) => {
          e.stopPropagation()
          popup.open(playerId)
        }}
        className={cn("truncate text-left underline underline-offset-2 hover:text-foreground", className)}
      >
        {children}
      </button>
    )
  }
  if (href) {
    return (
      <Link to={href} className={cn("underline", className)}>
        {children}
      </Link>
    )
  }
  return <span className={className}>{children}</span>
}

function PrivateProfileDialog({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const { player, overall, byMatch, loading } = usePlayerStats(playerId)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogPopup className="flex max-h-[85svh] flex-col gap-4 overflow-y-auto">
        <DialogTitle className="sr-only">{player?.name ?? "Perfil do peladeiro"}</DialogTitle>
        {loading || !player ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <PlayerProfileView
            player={player}
            overall={overall}
            byMatch={byMatch}
            hrefForMatch={(matchId) => `/matches/${matchId}/stats`}
          />
        )}
      </DialogPopup>
    </Dialog>
  )
}

function PublicProfileDialog({
  playerId,
  data,
  codigo,
  onClose,
}: {
  playerId: string
  data: PublicStatsData
  codigo: string
  onClose: () => void
}) {
  const { player, overall, byMatch } = publicPlayerProfile(data, playerId)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogPopup className="flex max-h-[85svh] flex-col gap-4 overflow-y-auto">
        <DialogTitle className="sr-only">{player?.name ?? "Perfil do peladeiro"}</DialogTitle>
        {!player ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Peladeiro não encontrado.</p>
        ) : (
          <PlayerProfileView
            player={player}
            overall={overall}
            byMatch={byMatch}
            hrefForMatch={(matchId) => `/pelada/${codigo}/jogo/${matchId}`}
          />
        )}
      </DialogPopup>
    </Dialog>
  )
}

/** Wrap the private stats screens so their player names open a profile popup. */
export function PrivatePlayerProfileProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <PlayerProfileContext.Provider value={{ open: setOpenId }}>
      {children}
      {openId && <PrivateProfileDialog playerId={openId} onClose={() => setOpenId(null)} />}
    </PlayerProfileContext.Provider>
  )
}

/** Same for the public pages — derives the profile from the already-loaded payload. */
export function PublicPlayerProfileProvider({
  data,
  codigo,
  children,
}: {
  data: PublicStatsData
  codigo: string
  children: ReactNode
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <PlayerProfileContext.Provider value={{ open: setOpenId }}>
      {children}
      {openId && (
        <PublicProfileDialog playerId={openId} data={data} codigo={codigo} onClose={() => setOpenId(null)} />
      )}
    </PlayerProfileContext.Provider>
  )
}

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, Pencil, Plus, UserRound, X } from "lucide-react"
import { useAuth } from "@/features/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toastManager } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

/**
 * One-tap switching between the peladas this person manages on this device.
 * The active account's session is always kept fresh (AuthProvider), so tapping
 * another swaps in place with no password — unless its token has died, in
 * which case we send them to log into that pelada once more.
 */
export function AccountSwitcherCard() {
  const { accounts, user, switchAccount, forgetAccount, renameAccount } = useAuth()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState("")

  const sorted = [...accounts].sort((a, b) => a.label.localeCompare(b.label))

  async function handleSwitch(userId: string) {
    if (userId === user?.id || busyId) return
    setBusyId(userId)
    const { error } = await switchAccount(userId)
    setBusyId(null)
    if (error) {
      toastManager.add({
        title: "Precisa entrar nessa conta de novo",
        description: "A sessão salva expirou. Faça login uma vez para reconectá-la.",
        type: "error",
      })
      navigate("/login")
      return
    }
    navigate("/matches")
  }

  function startEditing(userId: string, current: string) {
    setEditingId(userId)
    setDraftLabel(current)
  }

  function commitLabel(userId: string) {
    renameAccount(userId, draftLabel)
    setEditingId(null)
  }

  return (
    <Card className="w-full border-none shadow-none sm:border sm:shadow-sm">
      <CardHeader>
        <CardTitle>Contas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Alterne entre as suas peladas sem digitar login toda vez.
        </p>

        <div className="flex flex-col gap-2">
          {sorted.map((account) => {
            const isActive = account.userId === user?.id
            const isEditing = editingId === account.userId
            return (
              <div
                key={account.userId}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-3",
                  isActive && "border-primary/60 bg-primary/5"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  <UserRound className="size-5" />
                </span>

                {isEditing ? (
                  <Input
                    autoFocus
                    value={draftLabel}
                    onChange={(e) => setDraftLabel(e.target.value)}
                    onBlur={() => commitLabel(account.userId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitLabel(account.userId)
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    className="h-9 flex-1"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSwitch(account.userId)}
                    disabled={isActive || !!busyId}
                    className="flex min-w-0 flex-1 flex-col items-start text-left disabled:cursor-default"
                  >
                    <span className="w-full truncate text-sm font-medium">{account.label}</span>
                    <span className="w-full truncate text-xs text-muted-foreground">
                      {account.email}
                    </span>
                  </button>
                )}

                {isActive ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                    <Check className="size-4" /> Atual
                  </span>
                ) : busyId === account.userId ? (
                  <span className="shrink-0 text-xs text-muted-foreground">Entrando...</span>
                ) : null}

                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => startEditing(account.userId, account.label)}
                    aria-label={`Renomear ${account.label}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                )}

                {!isActive && !isEditing && (
                  <button
                    type="button"
                    onClick={() => forgetAccount(account.userId)}
                    aria-label={`Remover ${account.label} deste aparelho`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="touch"
          className="w-full"
          onClick={() => navigate("/login")}
        >
          <Plus className="size-4" /> Entrar em outra conta
        </Button>
      </CardContent>
    </Card>
  )
}

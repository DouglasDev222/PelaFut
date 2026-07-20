import { useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { UserRound } from "lucide-react"
import { useAuth } from "@/features/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toastManager } from "@/components/ui/toast"

export function LoginForm() {
  const { signIn, accounts, switchAccount } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [continuingId, setContinuingId] = useState<string | null>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const remembered = [...accounts].sort((a, b) => a.label.localeCompare(b.label))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate("/matches")
  }

  async function handleContinue(userId: string, accountEmail: string) {
    if (continuingId) return
    setContinuingId(userId)
    const { error } = await switchAccount(userId)
    setContinuingId(null)
    if (!error) {
      navigate("/matches")
      return
    }
    // The saved session for this account died — fall back to a normal login,
    // with the email already filled so only the password is left to type.
    setEmail(accountEmail)
    setPassword("")
    toastManager.add({
      title: "Entre com a senha para continuar",
      description: "A sessão salva dessa conta expirou.",
    })
    passwordRef.current?.focus()
  }

  return (
    <Card className="w-full border-none shadow-none sm:border sm:shadow-sm">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {remembered.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Continuar como</p>
            {remembered.map((account) => (
              <button
                key={account.userId}
                type="button"
                onClick={() => handleContinue(account.userId, account.email)}
                disabled={!!continuingId}
                className="flex items-center gap-3 rounded-xl border p-3 text-left hover:bg-muted disabled:opacity-60"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <UserRound className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{account.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{account.email}</span>
                </span>
                {continuingId === account.userId && (
                  <span className="shrink-0 text-xs text-muted-foreground">Entrando...</span>
                )}
              </button>
            ))}
            <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              ou entre com e-mail
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              ref={passwordRef}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="touch" className="w-full" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
          <div className="flex justify-between text-sm text-muted-foreground">
            <Link to="/signup">Criar conta</Link>
            <Link to="/forgot-password">Esqueci minha senha</Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

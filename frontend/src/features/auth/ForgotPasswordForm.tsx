import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ForgotPasswordForm() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await resetPassword(email)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    setSent(true)
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-sm text-muted-foreground">
            Se o e-mail existir, enviamos um link de redefinição de senha.
          </p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        )}
        <div className="mt-4 text-sm text-muted-foreground">
          <Link to="/login">Voltar para login</Link>
        </div>
      </CardContent>
    </Card>
  )
}

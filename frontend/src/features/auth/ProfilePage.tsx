import { useEffect, useState, type FormEvent } from "react"
import { useAuth } from "@/features/auth/AuthProvider"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PublicLinkCard } from "@/features/public/PublicLinkCard"
import { AccountSwitcherCard } from "@/features/auth/AccountSwitcherCard"

export function ProfilePage() {
  const { user, signOut } = useAuth()
  const [fullName, setFullName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
        } else if (data) {
          setFullName(data.full_name ?? "")
          setAvatarUrl(data.avatar_url ?? "")
        }
        setLoading(false)
      })
  }, [user])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    setSaved(false)
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, avatar_url: avatarUrl || null })
      .eq("id", user.id)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSaved(true)
  }

  if (loading) return null

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full border-none shadow-none sm:border sm:shadow-sm">
        <CardHeader>
          <CardTitle>Meu perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label>E-mail</Label>
              <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Nome</Label>
              <Input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="avatarUrl">URL da foto</Label>
              <Input id="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && <p className="text-sm text-muted-foreground">Perfil atualizado.</p>}
            <Button type="submit" size="touch" className="w-full" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="touch"
              className="mt-4 w-full"
              onClick={() => signOut()}
            >
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>

      <AccountSwitcherCard />

      <PublicLinkCard />
    </div>
  )
}

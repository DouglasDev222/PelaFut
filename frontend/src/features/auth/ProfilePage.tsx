import { useEffect, useRef, useState, type FormEvent } from "react"
import { Camera, Image as ImageIcon } from "lucide-react"
import { useAuth } from "@/features/auth/AuthProvider"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerAvatar } from "@/components/PlayerAvatar"
import { PublicLinkCard } from "@/features/public/PublicLinkCard"
import { AccountSwitcherCard } from "@/features/auth/AccountSwitcherCard"

export function ProfilePage() {
  const { user, signOut } = useAuth()
  const [fullName, setFullName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

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

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    setError(null)
    setSaved(false)
    const path = `${user.id}/${crypto.randomUUID()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from("player-photos")
      .upload(path, file, { upsert: false })
    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from("player-photos").getPublicUrl(path)
    setAvatarUrl(data.publicUrl)
    setUploading(false)
  }

  function handleRemovePhoto() {
    setAvatarUrl("")
    // Clear both, otherwise re-picking the same file wouldn't fire onChange.
    if (cameraInputRef.current) cameraInputRef.current.value = ""
    if (galleryInputRef.current) galleryInputRef.current.value = ""
  }

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
            <div className="flex flex-col items-center gap-3">
              <PlayerAvatar photoUrl={avatarUrl} name={fullName} size="size-24" iconSize="size-10" />
              {/* Same two-input pattern as the player photo: `capture` forces
                  the camera on Android's gallery-only Photo Picker, so each
                  path gets its own hidden input. */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="touch"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="size-4" /> {uploading ? "Enviando..." : "Tirar foto"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="touch"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploading}
                >
                  <ImageIcon className="size-4" /> Galeria
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="touch"
                    className="text-destructive hover:text-destructive"
                    onClick={handleRemovePhoto}
                    disabled={uploading}
                  >
                    Remover
                  </Button>
                )}
              </div>
              <input
                ref={cameraInputRef}
                id="avatar-camera"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
                disabled={uploading}
              />
              <input
                ref={galleryInputRef}
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
                disabled={uploading}
              />
            </div>

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
            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && <p className="text-sm text-muted-foreground">Perfil atualizado.</p>}
            <Button type="submit" size="touch" className="w-full" disabled={saving || uploading}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AccountSwitcherCard />

      <PublicLinkCard />

      <Button
        type="button"
        variant="destructive"
        size="touch"
        className="mt-2 w-full"
        onClick={() => signOut()}
      >
        Sair
      </Button>
    </div>
  )
}

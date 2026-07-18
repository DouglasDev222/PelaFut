import { useRef, useState, type FormEvent } from "react"
import { Camera, Image as ImageIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { Player, PlayerInput, PlayerPosition } from "@pelafut/shared"
import { useAuth } from "@/features/auth/AuthProvider"
import { supabase } from "@/lib/supabaseClient"
import { StarRating } from "@/features/players/StarRating"
import { PlayerAvatar } from "@/components/PlayerAvatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PlayerFormProps {
  initial?: Player
  onSubmit: (input: PlayerInput) => Promise<{ error: string | null }>
  /** Where to go after saving. Defaults to the players list; set to return to
   * the pelada flow (e.g. participant selection) when reached as a shortcut. */
  returnTo?: string
}

export function PlayerForm({ initial, onSubmit, returnTo }: PlayerFormProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(initial?.name ?? "")
  const [nickname, setNickname] = useState(initial?.nickname ?? "")
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? "")
  const [active, setActive] = useState(initial?.active ?? true)
  const [birthDate, setBirthDate] = useState(initial?.birth_date ?? "")
  const [position, setPosition] = useState<PlayerPosition>(initial?.position ?? "jogador")
  const [skillLevel, setSkillLevel] = useState<number | null>(initial?.skill_level ?? null)
  const [shirtNumber, setShirtNumber] = useState(
    initial?.shirt_number != null ? String(initial.shirt_number) : ""
  )
  const [notes, setNotes] = useState(initial?.notes ?? "")

  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    setError(null)
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
    setPhotoUrl(data.publicUrl)
    setUploading(false)
  }

  function handleRemovePhoto() {
    setPhotoUrl("")
    // Clear both, otherwise re-picking the same file wouldn't fire onChange.
    if (cameraInputRef.current) cameraInputRef.current.value = ""
    if (galleryInputRef.current) galleryInputRef.current.value = ""
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    // The rating drives the balanced draw and the team nota, so it can't be
    // left empty — on new players and when editing an old one without it.
    if (skillLevel == null) {
      setError("Escolha a avaliação em estrelas do peladeiro.")
      return
    }
    setSubmitting(true)
    const { error } = await onSubmit({
      name: name.toUpperCase(),
      nickname: nickname ? nickname.toUpperCase() : null,
      photo_url: photoUrl || null,
      active,
      birth_date: birthDate || null,
      position,
      skill_level: skillLevel,
      shirt_number: shirtNumber ? Number(shirtNumber) : null,
      notes: notes || null,
    })
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    // Replace so the just-submitted form isn't left in the back history when
    // returning to the pelada flow.
    if (returnTo) navigate(returnTo, { replace: true })
    else navigate("/players")
  }

  return (
    <div className="flex w-full flex-col gap-4 pb-4">
      <Card className="w-full border-none shadow-none sm:border sm:shadow-sm">
        <CardHeader>
          <CardTitle>{initial ? "Editar peladeiro" : "Novo peladeiro"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="player-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col items-center gap-3">
            <PlayerAvatar photoUrl={photoUrl} name={name} size="size-24" iconSize="size-10" />
            {/* Two explicit buttons instead of one. With a single
                `accept="image/*"` input the choice is left to the OS picker —
                and on Android 13+ Chrome opens the system Photo Picker, which
                is gallery-only and never offers the camera. `capture` forces
                the camera, so each path gets its own input. */}
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
              {photoUrl && (
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
              id="photo-camera"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
              disabled={uploading}
            />
            <input
              ref={galleryInputRef}
              id="photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
              disabled={uploading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              required
              className="uppercase"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="nickname">Apelido</Label>
            <Input
              id="nickname"
              className="uppercase"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="birthDate">Data de nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="shirtNumber">Número da camisa</Label>
              <Input
                id="shirtNumber"
                type="number"
                min={0}
                value={shirtNumber}
                onChange={(e) => setShirtNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Posição</Label>
              <Select value={position} onValueChange={(v) => setPosition(v as PlayerPosition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jogador">Jogador</SelectItem>
                  <SelectItem value="goleiro">Goleiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>
                Nível <span className="text-destructive">*</span>
              </Label>
              <StarRating value={skillLevel} onChange={setSkillLevel} />
              <span className="text-xs text-muted-foreground">
                Toque uma vez para meia estrela, de novo para a estrela inteira.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="active">Ativo</Label>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          </form>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 p-4 backdrop-blur">
        <Button form="player-form" type="submit" size="touch" className="w-full" disabled={submitting || uploading}>
          {submitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  )
}

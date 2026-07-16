import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import type { Player, PlayerInput, PlayerPosition } from "@pelafut/shared"
import { useAuth } from "@/features/auth/AuthProvider"
import { supabase } from "@/lib/supabaseClient"
import { StarRating } from "@/features/players/StarRating"
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
}

export function PlayerForm({ initial, onSubmit }: PlayerFormProps) {
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await onSubmit({
      name,
      nickname: nickname || null,
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
    navigate("/players")
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{initial ? "Editar peladeiro" : "Novo peladeiro"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-4">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={name}
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <div className="size-16 rounded-full bg-muted" />
            )}
            <div className="flex flex-col gap-1">
              <Label htmlFor="photo">Foto</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={uploading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="nickname">Apelido</Label>
            <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />
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
              <Label>Nível</Label>
              <StarRating value={skillLevel} onChange={setSkillLevel} />
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={submitting || uploading}>
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

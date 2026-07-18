import { useEffect, useState } from "react"
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react"
import { useAuth } from "@/features/auth/AuthProvider"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

/**
 * Lets the organizer publish (and unpublish) the read-only stats page and share
 * its link. The code itself is generated server-side by `gerar_codigo_publico`
 * so it's unique and the client never picks it.
 */
export function PublicLinkCard() {
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedTitle, setSavedTitle] = useState(false)
  const [regenOpen, setRegenOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from("profiles")
      .select("public_code, public_stats_enabled, public_title")
      .eq("id", user.id)
      .single()
      .then(({ data, error: loadError }) => {
        if (loadError) setError(loadError.message)
        else if (data) {
          setCode((data.public_code as string | null) ?? null)
          setEnabled(Boolean(data.public_stats_enabled))
          setTitle((data.public_title as string | null) ?? "")
        }
        setLoading(false)
      })
  }, [user])

  const url = code ? `${window.location.origin}/pelada/${code}` : null

  async function ensureCode(): Promise<string | null> {
    if (code) return code
    const { data, error: rpcError } = await supabase.rpc("gerar_codigo_publico")
    if (rpcError) {
      setError(rpcError.message)
      return null
    }
    const novo = data as string
    setCode(novo)
    return novo
  }

  async function toggle(next: boolean) {
    setError(null)
    // Turning it on for the first time mints the code.
    if (next && !(await ensureCode())) return
    setEnabled(next)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ public_stats_enabled: next })
      .eq("id", user!.id)
    if (updateError) {
      setError(updateError.message)
      setEnabled(!next)
    }
  }

  async function saveTitle() {
    setError(null)
    setSavedTitle(false)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ public_title: title.trim() || null })
      .eq("id", user!.id)
    if (updateError) setError(updateError.message)
    else setSavedTitle(true)
  }

  async function regenerate() {
    setRegenOpen(false)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc("gerar_codigo_publico")
    if (rpcError) setError(rpcError.message)
    else setCode(data as string)
  }

  async function copy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return null

  return (
    <Card className="w-full border-none shadow-none sm:border sm:shadow-sm">
      <CardHeader>
        <CardTitle>Estatísticas públicas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="public-stats" className="text-sm">
              Página pública
            </Label>
            <span className="text-xs text-muted-foreground">
              Cria um link aberto com as estatísticas das peladas já encerradas. Quem tiver o link
              consegue ver, sem login.
            </span>
          </div>
          <Switch
            id="public-stats"
            checked={enabled}
            onCheckedChange={toggle}
            className="mt-0.5 shrink-0"
          />
        </div>

        {enabled && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="public-title">Título da página</Label>
              <div className="flex gap-2">
                <Input
                  id="public-title"
                  placeholder="Ex: Pelada da Quinta"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Button type="button" variant="outline" className="shrink-0" onClick={saveTitle}>
                  Salvar
                </Button>
              </div>
              {savedTitle && <p className="text-xs text-muted-foreground">Título atualizado.</p>}
            </div>

            {url && (
              <div className="flex flex-col gap-2">
                <Label>Link para compartilhar</Label>
                <p className="rounded-md border bg-muted px-3 py-2 text-sm break-all">{url}</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={copy}>
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                  >
                    <ExternalLink className="size-4" /> Abrir
                  </a>
                </div>
                <button
                  type="button"
                  className="flex items-center justify-center gap-1 self-center text-xs text-muted-foreground underline"
                  onClick={() => setRegenOpen(true)}
                >
                  <RefreshCw className="size-3" /> Gerar novo link
                </button>
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>

      <ConfirmDialog
        open={regenOpen}
        title="Gerar um novo link?"
        description="O link atual para de funcionar na hora. Quem já tiver o antigo não vai mais conseguir abrir."
        confirmLabel="Gerar novo"
        confirmVariant="destructive"
        onOpenChange={setRegenOpen}
        onConfirm={regenerate}
      />
    </Card>
  )
}

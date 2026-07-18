import { supabase } from "@/lib/supabaseClient"
import {
  mapPublicPayload,
  type PublicAccountSummary,
  type PublicRawPayload,
  type PublicStatsData,
} from "@/features/public/publicMapping"

/** Home: public title + the finished peladas of the account. */
export async function fetchPublicSummary(
  codigo: string
): Promise<{ data: PublicAccountSummary | null; error: string | null }> {
  const { data, error } = await supabase.rpc("pelada_publica_resumo", { codigo })
  if (error) return { data: null, error: error.message }
  // The RPC returns null for an unknown code AND for a disabled page — the
  // caller shows the same neutral screen for both, so neither is confirmed.
  if (!data) return { data: null, error: null }
  return { data: data as PublicAccountSummary, error: null }
}

/** Raw stats for the whole account, or for one pelada when `jogoId` is given. */
export async function fetchPublicStats(
  codigo: string,
  jogoId?: string
): Promise<{ data: PublicStatsData | null; error: string | null }> {
  const { data, error } = await supabase.rpc("pelada_publica_dados", {
    codigo,
    jogo_id: jogoId ?? null,
  })
  if (error) return { data: null, error: error.message }
  if (!data) return { data: null, error: null }
  return { data: mapPublicPayload(data as PublicRawPayload), error: null }
}

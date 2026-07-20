import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabaseClient"
import {
  readAccounts,
  removeAccount as removeStoredAccount,
  renameAccount as renameStoredAccount,
  upsertActiveAccount,
  type RememberedAccount,
} from "@/features/auth/accountStore"

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  /** Accounts remembered on this device for one-tap switching. */
  accounts: RememberedAccount[]
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  /** Swap to a remembered account without a fresh login. */
  switchAccount: (userId: string) => Promise<{ error: string | null }>
  forgetAccount: (userId: string) => void
  renameAccount: (userId: string, label: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Mirrors the live session into the remembered-accounts store, keeping its
 * token snapshot current so a later switch back doesn't hit an expired token. */
function rememberSession(session: Session | null): RememberedAccount[] {
  if (!session?.user.email) return readAccounts()
  const name = session.user.user_metadata?.full_name
  return upsertActiveAccount({
    userId: session.user.id,
    email: session.user.email,
    name: typeof name === "string" ? name : undefined,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<RememberedAccount[]>(() => readAccounts())

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAccounts(rememberSession(data.session))
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setAccounts(rememberSession(newSession))
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    accounts,
    async signUp(email, password, fullName) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      return { error: error?.message ?? null }
    },
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    },
    async signOut() {
      // "Sair" is a real logout (the token is revoked server-side), but the
      // account stays remembered — like an account chooser — so its label
      // survives and "Continuar como" can bring it back with one login.
      // Fully dropping it from this device is the "×" (forgetAccount).
      await supabase.auth.signOut()
    },
    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return { error: error?.message ?? null }
    },
    async switchAccount(userId) {
      const target = readAccounts().find((a) => a.userId === userId)
      if (!target) return { error: "Conta não encontrada neste dispositivo." }
      const { error } = await supabase.auth.setSession({
        access_token: target.accessToken,
        refresh_token: target.refreshToken,
      })
      // A dead refresh token is the one case the token approach can't recover
      // from silently — surface it so the caller can send them to log in again.
      if (error) return { error: error.message }
      return { error: null }
    },
    forgetAccount(userId) {
      setAccounts(removeStoredAccount(userId))
    },
    renameAccount(userId, label) {
      setAccounts(renameStoredAccount(userId, label))
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return ctx
}

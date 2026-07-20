// Remembered accounts for one-tap switching between peladas managed by the
// same person on the same device. We store each account's Supabase session
// snapshot (the very tokens supabase-js already persists in localStorage), so
// switching is a `setSession` away and no password is ever kept here.

export interface RememberedAccount {
  userId: string
  email: string
  /** Friendly, user-editable name — the email is not memorable ("Pelada da quarta"). */
  label: string
  accessToken: string
  refreshToken: string
}

const STORAGE_KEY = "pelafut.accounts"

export function readAccounts(): RememberedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (a): a is RememberedAccount =>
        !!a && typeof a.userId === "string" && typeof a.refreshToken === "string"
    )
  } catch {
    return []
  }
}

function writeAccounts(accounts: RememberedAccount[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  } catch {
    // localStorage can throw (private mode, quota) — switching just won't
    // persist, which is a graceful degradation, not a crash.
  }
}

/**
 * Records (or refreshes) the account that is currently signed in. Called on
 * every auth-state change so the active account's token snapshot never goes
 * stale under Supabase's refresh-token rotation. Keeps any existing label.
 */
export function upsertActiveAccount(input: {
  userId: string
  email: string
  accessToken: string
  refreshToken: string
}): RememberedAccount[] {
  const accounts = readAccounts()
  const existing = accounts.find((a) => a.userId === input.userId)
  const next: RememberedAccount = {
    userId: input.userId,
    email: input.email,
    label: existing?.label || input.email,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
  }
  const others = accounts.filter((a) => a.userId !== input.userId)
  const merged = [...others, next]
  writeAccounts(merged)
  return merged
}

export function removeAccount(userId: string): RememberedAccount[] {
  const merged = readAccounts().filter((a) => a.userId !== userId)
  writeAccounts(merged)
  return merged
}

export function renameAccount(userId: string, label: string): RememberedAccount[] {
  const merged = readAccounts().map((a) =>
    a.userId === userId ? { ...a, label: label.trim() || a.email } : a
  )
  writeAccounts(merged)
  return merged
}

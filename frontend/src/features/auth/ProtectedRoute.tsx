import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/features/auth/AuthProvider"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}

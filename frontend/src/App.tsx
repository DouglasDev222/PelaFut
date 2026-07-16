import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "@/features/auth/AuthProvider"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { LoginForm } from "@/features/auth/LoginForm"
import { SignupForm } from "@/features/auth/SignupForm"
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm"
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm"
import { ProfilePage } from "@/features/auth/ProfilePage"

function CenteredPage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh items-center justify-center p-4">{children}</div>
}

function HomePage() {
  return (
    <CenteredPage>
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold">PelaFut</h1>
        <p className="text-muted-foreground">Você está logado.</p>
        <a className="text-sm underline" href="/profile">
          Ir para o perfil
        </a>
      </div>
    </CenteredPage>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <CenteredPage>
                  <ProfilePage />
                </CenteredPage>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<CenteredPage><LoginForm /></CenteredPage>} />
          <Route path="/signup" element={<CenteredPage><SignupForm /></CenteredPage>} />
          <Route
            path="/forgot-password"
            element={<CenteredPage><ForgotPasswordForm /></CenteredPage>}
          />
          <Route
            path="/reset-password"
            element={<CenteredPage><ResetPasswordForm /></CenteredPage>}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

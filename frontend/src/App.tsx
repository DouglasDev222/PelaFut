import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import { AuthProvider } from "@/features/auth/AuthProvider"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { LoginForm } from "@/features/auth/LoginForm"
import { SignupForm } from "@/features/auth/SignupForm"
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm"
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm"
import { ProfilePage } from "@/features/auth/ProfilePage"
import { PlayerListPage } from "@/features/players/PlayerListPage"
import { PlayerFormPage } from "@/features/players/PlayerFormPage"
import { MatchListPage } from "@/features/matches/MatchListPage"
import { MatchFormPage } from "@/features/matches/MatchFormPage"
import { ParticipantSelectorPage } from "@/features/matches/ParticipantSelectorPage"
import { TeamFormationPage } from "@/features/teams/TeamFormationPage"

function CenteredPage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh items-center justify-center p-4">{children}</div>
}

function HomePage() {
  return (
    <CenteredPage>
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold">PelaFut</h1>
        <p className="text-muted-foreground">Você está logado.</p>
        <div className="flex gap-4 text-sm underline">
          <Link to="/players">Peladeiros</Link>
          <Link to="/matches">Peladas</Link>
          <Link to="/profile">Meu perfil</Link>
        </div>
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
          <Route
            path="/players"
            element={
              <ProtectedRoute>
                <CenteredPage>
                  <PlayerListPage />
                </CenteredPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/players/new"
            element={
              <ProtectedRoute>
                <CenteredPage>
                  <PlayerFormPage />
                </CenteredPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/players/:id/edit"
            element={
              <ProtectedRoute>
                <CenteredPage>
                  <PlayerFormPage />
                </CenteredPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <CenteredPage>
                  <MatchListPage />
                </CenteredPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/new"
            element={
              <ProtectedRoute>
                <CenteredPage>
                  <MatchFormPage />
                </CenteredPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:id/edit"
            element={
              <ProtectedRoute>
                <CenteredPage>
                  <MatchFormPage />
                </CenteredPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:id/participants"
            element={
              <ProtectedRoute>
                <CenteredPage>
                  <ParticipantSelectorPage />
                </CenteredPage>
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:id/teams"
            element={
              <ProtectedRoute>
                <CenteredPage>
                  <TeamFormationPage />
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

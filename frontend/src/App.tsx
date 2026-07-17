import { useState } from "react"
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from "react-router-dom"
import { CalendarDays, History, User, UserPlus, Users } from "lucide-react"
import { AuthProvider } from "@/features/auth/AuthProvider"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { AppShell } from "@/components/layout/AppShell"
import { ToastProvider } from "@/components/ui/toast"
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
import { TeamFormationPage, type TeamFormationBackContext } from "@/features/teams/TeamFormationPage"
import { LiveMatchPage } from "@/features/live/LiveMatchPage"
import { MatchStatsPage } from "@/features/stats/MatchStatsPage"
import { PlayerStatsPage } from "@/features/stats/PlayerStatsPage"

function HomePage() {
  const shortcuts = [
    { to: "/matches", label: "Peladas", Icon: CalendarDays },
    { to: "/players", label: "Peladeiros", Icon: Users },
    { to: "/profile", label: "Perfil", Icon: User },
  ]
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Bem-vindo de volta.</p>
      <Link
        to="/matches/new"
        className="flex items-center justify-center rounded-xl bg-primary px-4 py-4 text-base font-medium text-primary-foreground"
      >
        + Nova pelada
      </Link>
      <div className="grid grid-cols-3 gap-3">
        {shortcuts.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-1.5 rounded-xl border p-4 text-xs text-muted-foreground hover:bg-muted"
          >
            <Icon className="size-6" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function ParticipantSelectorRoute() {
  const [actions, setActions] = useState<{ addPlayer: () => void }>({ addPlayer: () => {} })
  return (
    <AppShell
      title="Participantes"
      headerActions={
        <button
          type="button"
          onClick={() => actions.addPlayer()}
          aria-label="Cadastrar novo peladeiro"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
        >
          <UserPlus className="size-5" />
        </button>
      }
    >
      <ParticipantSelectorPage onReady={setActions} />
    </AppShell>
  )
}

function TeamFormationRoute() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [backContext, setBackContext] = useState<TeamFormationBackContext>({
    hasInFlowBack: false,
    goBack: () => {},
  })

  return (
    <AppShell
      title="Formação dos times"
      onBack={() => {
        if (backContext.hasInFlowBack) {
          backContext.goBack()
          return
        }
        navigate("/matches")
      }}
      headerActions={
        <Link
          to={`/matches/${id}/participants`}
          aria-label="Ver peladeiros e escolher quem está jogando"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
        >
          <Users className="size-5" />
        </Link>
      }
    >
      <TeamFormationPage onBackContextChange={setBackContext} />
    </AppShell>
  )
}

function LiveMatchRoute() {
  const { id } = useParams<{ id: string }>()
  return (
    <AppShell
      title="Partida ao vivo"
      headerActions={
        <div className="flex shrink-0 items-center">
          <Link
            to={`/matches/${id}/teams`}
            aria-label="Editar times"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
          >
            <Users className="size-5" />
          </Link>
          <Link
            to={`/matches/${id}/stats`}
            aria-label="Ver histórico de jogos dessa pelada"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
          >
            <History className="size-5" />
          </Link>
        </div>
      }
    >
      <LiveMatchPage />
    </AppShell>
  )
}

function App() {
  return (
    <ToastProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell title="PelaFut">
                  <HomePage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppShell title="Perfil">
                  <ProfilePage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/players"
            element={
              <ProtectedRoute>
                <AppShell title="Peladeiros">
                  <PlayerListPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/players/new"
            element={
              <ProtectedRoute>
                <AppShell title="Novo peladeiro">
                  <PlayerFormPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/players/:id/edit"
            element={
              <ProtectedRoute>
                <AppShell title="Editar peladeiro">
                  <PlayerFormPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <AppShell title="Peladas">
                  <MatchListPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/new"
            element={
              <ProtectedRoute>
                <AppShell title="Nova pelada">
                  <MatchFormPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:id/edit"
            element={
              <ProtectedRoute>
                <AppShell title="Editar pelada">
                  <MatchFormPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:id/participants"
            element={
              <ProtectedRoute>
                <ParticipantSelectorRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:id/teams"
            element={
              <ProtectedRoute>
                <TeamFormationRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:id/live"
            element={
              <ProtectedRoute>
                <LiveMatchRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:id/stats"
            element={
              <ProtectedRoute>
                <AppShell title="Estatísticas">
                  <MatchStatsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/players/:id/stats"
            element={
              <ProtectedRoute>
                <AppShell title="Estatísticas">
                  <PlayerStatsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<AppShell title="Entrar"><LoginForm /></AppShell>} />
          <Route path="/signup" element={<AppShell title="Criar conta"><SignupForm /></AppShell>} />
          <Route
            path="/forgot-password"
            element={<AppShell title="Recuperar senha"><ForgotPasswordForm /></AppShell>}
          />
          <Route
            path="/reset-password"
            element={<AppShell title="Nova senha"><ResetPasswordForm /></AppShell>}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ToastProvider>
  )
}

export default App

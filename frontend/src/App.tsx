import { useState } from "react"
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from "react-router-dom"
import { MoreVertical, UserPlus, Users } from "lucide-react"
import { AuthProvider } from "@/features/auth/AuthProvider"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { AppShell } from "@/components/layout/AppShell"
import { ToastProvider } from "@/components/ui/toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LoginForm } from "@/features/auth/LoginForm"
import { SignupForm } from "@/features/auth/SignupForm"
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm"
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm"
import { ProfilePage } from "@/features/auth/ProfilePage"
import { PlayerListPage } from "@/features/players/PlayerListPage"
import { PlayerFormPage } from "@/features/players/PlayerFormPage"
import { PlayerProfilePage } from "@/features/players/PlayerProfilePage"
import { MatchListPage } from "@/features/matches/MatchListPage"
import { MatchFormPage } from "@/features/matches/MatchFormPage"
import { ParticipantSelectorPage } from "@/features/matches/ParticipantSelectorPage"
import { TeamFormationPage, type TeamFormationBackContext } from "@/features/teams/TeamFormationPage"
import { PlayerDeparturesPage } from "@/features/teams/PlayerDeparturesPage"
import { LiveMatchPage } from "@/features/live/LiveMatchPage"
import { MatchHistoryPage } from "@/features/live/MatchHistoryPage"
import { MatchStatsPage } from "@/features/stats/MatchStatsPage"
import { PlayerStatsPage } from "@/features/stats/PlayerStatsPage"
import { GeneralStatsPage } from "@/features/stats/GeneralStatsPage"
import { LandingPage } from "@/features/public/LandingPage"
import { PublicHomePage } from "@/features/public/PublicHomePage"
import { PublicGeneralPage } from "@/features/public/PublicGeneralPage"
import { PublicMatchPage } from "@/features/public/PublicMatchPage"
import { PublicPlayerPage } from "@/features/public/PublicPlayerPage"

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
        /* Um menu só, para o cabeçalho não virar uma fileira de ícones. */
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Mais ações da pelada"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
          >
            <MoreVertical className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem render={<Link to={`/matches/${id}/teams`} />}>Times</DropdownMenuItem>
            <DropdownMenuItem render={<Link to={`/matches/${id}/jogos`} />}>
              Histórico de jogos
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link to={`/matches/${id}/stats`} />}>
              Estatísticas
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
          {/* Área pública: sem login e sem AppShell. Fica antes das rotas
              privadas e nunca é envolvida por ProtectedRoute. */}
          <Route path="/pelada/:codigo" element={<PublicHomePage />} />
          <Route path="/pelada/:codigo/geral" element={<PublicGeneralPage />} />
          <Route path="/pelada/:codigo/jogo/:jogoId" element={<PublicMatchPage />} />
          <Route path="/pelada/:codigo/jogador/:jogadorId" element={<PublicPlayerPage />} />
          {/* A porta da frente é pública: o app inteiro vive atrás do login,
              e "/" nunca mais entrega a tela de entrar para um desconhecido. */}
          <Route path="/" element={<LandingPage />} />
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
            path="/players/:id"
            element={
              <ProtectedRoute>
                <AppShell title="Perfil do peladeiro">
                  <PlayerProfilePage />
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
            path="/matches/:id/saidas"
            element={
              <ProtectedRoute>
                <AppShell title="Quem saiu da pelada">
                  <PlayerDeparturesPage />
                </AppShell>
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
            path="/matches/:id/jogos"
            element={
              <ProtectedRoute>
                <AppShell title="Histórico de jogos">
                  <MatchHistoryPage />
                </AppShell>
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
            path="/players/stats"
            element={
              <ProtectedRoute>
                <AppShell title="Estatísticas gerais">
                  <GeneralStatsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/players/:id/stats"
            element={
              <ProtectedRoute>
                <AppShell title="Estatísticas do peladeiro">
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

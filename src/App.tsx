import { lazy, Suspense } from 'react'
import { createBrowserRouter, createRoutesFromElements, Navigate, Outlet, Route, RouterProvider, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth, wasExplicitSignOut } from '@/hooks/auth'
import { supabaseConfigured } from '@/lib/supabase'
import { PageLoader } from '@/components/ui/card'
import { AppShell } from '@/components/layout/AppShell'
import { ActiveWorkoutProvider } from '@/features/workout/ActiveWorkoutProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { HomePage } from '@/features/home/HomePage'
import { ActiveWorkoutPage } from '@/features/workout/ActiveWorkoutPage'
import { ProgramsPage } from '@/features/programs/ProgramsPage'
import { ProgramDetailPage } from '@/features/programs/ProgramDetailPage'
import { ProgramWorkoutEditorPage } from '@/features/programs/ProgramWorkoutEditorPage'
import { HistoryPage } from '@/features/history/HistoryPage'
import { WorkoutDetailPage } from '@/features/history/WorkoutDetailPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { NutritionPage } from '@/features/nutrition/NutritionPage'
import { ExerciseLibraryPage } from '@/features/exercises/ExerciseLibraryPage'

// Chart-heavy screens are split out so the workout screen loads fast
const ProgressPage = lazy(() => import('@/features/progress/ProgressPage'))
const BodyPage = lazy(() => import('@/features/body/BodyPage'))
const NutritionStatsPage = lazy(() => import('@/features/nutrition/NutritionStatsPage'))
const FoodsPage = lazy(() => import('@/features/nutrition/FoodsPage'))
const RecipeEditorPage = lazy(() => import('@/features/nutrition/RecipeEditorPage'))
const ExerciseDetailPage = lazy(() => import('@/features/exercises/ExerciseDetailPage').then((m) => ({ default: m.ExerciseDetailPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, refetchOnWindowFocus: true, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
})

function RequireAuth() {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={wasExplicitSignOut() ? null : { from: loc.pathname }} />
  return (
    <ActiveWorkoutProvider>
      <Outlet />
    </ActiveWorkoutProvider>
  )
}

function MissingConfig() {
  return (
    <div className="mx-auto max-w-md p-6 pt-24">
      <h1 className="text-2xl font-bold">FORMA</h1>
      <p className="mt-3 text-muted">
        Supabase är inte konfigurerat. Skapa filen <code className="text-fg">.env.local</code> med{' '}
        <code className="text-fg">VITE_SUPABASE_URL</code> och <code className="text-fg">VITE_SUPABASE_ANON_KEY</code> och starta om.
      </p>
    </div>
  )
}


function Root() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  )
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Root />}>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/workout" element={<ActiveWorkoutPage />} />
                <Route element={<AppShell />}>
                  <Route index element={<HomePage />} />
                  <Route path="programs" element={<ProgramsPage />} />
                  <Route path="programs/:programId" element={<ProgramDetailPage />} />
                  <Route path="programs/:programId/workouts/:workoutId" element={<ProgramWorkoutEditorPage />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="history/:workoutId" element={<WorkoutDetailPage />} />
                  <Route path="progress" element={<ProgressPage />} />
                  <Route path="exercises" element={<ExerciseLibraryPage />} />
                  <Route path="exercises/:exerciseId" element={<ExerciseDetailPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="body" element={<BodyPage />} />
                  <Route path="nutrition" element={<NutritionPage />} />
                  <Route path="nutrition/stats" element={<NutritionStatsPage />} />
                  <Route path="nutrition/foods" element={<FoodsPage />} />
                  <Route path="nutrition/recipes/:recipeId" element={<RecipeEditorPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>,
  ),
)

export function App() {
  if (!supabaseConfigured) return <MissingConfig />
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: '#1d1f23', border: '1px solid #2a2c31', color: '#f2f3f5' } }} />
      </AuthProvider>
    </QueryClientProvider>
  )
}

import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Dumbbell, History, LineChart, ListChecks, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActiveWorkout } from '@/features/workout/ActiveWorkoutProvider'
import { ElapsedClock } from '@/features/workout/ActiveWorkoutPage'

const TABS = [
  { to: '/', label: 'Träna', icon: Dumbbell, end: true },
  { to: '/programs', label: 'Program', icon: ListChecks },
  { to: '/history', label: 'Historik', icon: History },
  { to: '/progress', label: 'Progress', icon: LineChart },
  { to: '/settings', label: 'Profil', icon: UserRound },
]

export function AppShell() {
  const { draft } = useActiveWorkout()
  const navigate = useNavigate()
  const loc = useLocation()

  return (
    <div className="min-h-dvh">
      <main className="pt-safe mx-auto max-w-2xl px-4 pb-[calc(env(safe-area-inset-bottom)+9rem)]" key={loc.pathname.split('/')[1]}>
        <Outlet />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30">
        {draft && (
          <div className="mx-auto max-w-2xl px-3 pb-2">
            <button
              type="button"
              onClick={() => navigate('/workout')}
              className="flex w-full items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-left text-accent-fg shadow-[0_8px_30px_rgb(0_0_0/0.45)] active:scale-[0.99]"
              data-testid="resume-workout"
            >
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-fg/50" />
                <span className="relative inline-flex size-2.5 rounded-full bg-accent-fg" />
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">{draft.name}</span>
              <span className="tabular text-sm font-medium opacity-80">
                <ElapsedClock startedAt={draft.started_at} />
              </span>
            </button>
          </div>
        )}
        <nav className="border-t border-border/70 bg-bg/90 pb-safe backdrop-blur-xl" aria-label="Huvudmeny">
          <ul className="mx-auto grid max-w-2xl grid-cols-5">
            {TABS.map((t) => (
              <li key={t.to}>
                <NavLink
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    cn('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors', isActive ? 'text-fg' : 'text-subtle hover:text-muted')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <t.icon className={cn('size-[22px]', isActive && 'text-accent')} strokeWidth={isActive ? 2.25 : 1.75} />
                      {t.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode; back?: React.ReactNode }) {
  return (
    <header className="pb-4 pt-6">
      {back}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  )
}

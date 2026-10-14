# FORMA – Development status

_Last updated: 2026-10-14 (overnight session)_

> Note: the "previous complete FORMA specification" was not available in the project (no files, no earlier
> threads, no repository). Everything was built from the overnight brief alone.

## Implementation checklist

### Phase 1 – Training (priority)
- [x] Vite + React + TypeScript + Tailwind v4 + shadcn-style UI (Radix) + Lucide + TanStack Query + Recharts + PWA
- [x] Supabase schema with Row Level Security on every user table (`supabase/migrations`)
- [x] Email/password auth, sign-up, login, logout, password reset mail, change password
- [x] Profile created automatically on sign-up; per-user settings (rest time, auto rest timer, RIR column)
- [x] Exercise library: 150 exercises, Swedish names, muscle group, equipment, search, filters
- [x] Custom exercises, variations, per-user exercise notes, archive-instead-of-delete when used in history
- [x] Program builder: programs → workouts (templates) → planned exercises (sets, rep range, warm-ups, rest)
- [x] PPL / Upper-Lower / Full-body presets + empty custom; no fixed training days
- [x] Duplicate workout, duplicate program, reorder, edit, delete
- [x] Active workout: one-tap set completion, add/remove/duplicate set, warm-up/working/failure/drop sets,
      optional RIR, rest timer (sound + vibration), workout timer, exercise notes, add/remove/replace/reorder exercises
- [x] Previous performance per exercise and per set (grey placeholders); one tap repeats last time
- [x] Next-workout suggestion (double progression) from real history only
- [x] Dumbbell weight per dumbbell (volume counts both), unilateral (reps per side) and bodyweight (+kg) modes
- [x] Autosave: every change → localStorage (per user) immediately + Supabase within ~0.6 s; crash/reload recovery
- [x] Finish workout via transactional `save_workout` RPC
- [x] History: grouped by month, duration, volume, sets, PR badges; detail view; edit & delete completed workouts
- [x] Per-exercise page: records, e1RM/weight/reps/volume chart, weekly & monthly comparison, complete history
- [x] Progress: KPIs, strength chart, frequency, weekly volume, sets per muscle group, 16-week consistency, PR list
- [x] Range filters 7d / 30d / 90d / 6m / all

### Phase 2 – Nutrition
- [ ] (next)

### Phase 3 – Body weight & goals
- [ ] (pending)

### Phase 4 – Advanced
- [ ] (pending)

## Test results (latest run)
| Suite | Command | Result |
|---|---|---|
| Unit (training logic, draft ops) | `npm test` | 19/19 pass |
| Integration (RLS, two real users, RPC) | `npm run test:integration` | 11/11 pass |
| E2E (phone viewport, two users, full flow incl. reload recovery) | `npm run test:e2e` | 1/1 pass |
| Typecheck + production build | `npm run build` | pass |

## Known blockers
- No hosted Supabase project / credentials → app verified against a **local** Supabase stack only.
- Not deployed (no authorization to deploy publicly).

## Next priorities
1. Phase 2 nutrition
2. Phase 3 body weight & goals
3. Offline start of workouts, accessibility pass, partner sharing

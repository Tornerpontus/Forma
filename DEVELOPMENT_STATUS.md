# FORMA – Development status

_Last updated: 2026-10-14 (end of overnight session)_

> The "previous complete FORMA specification" was not available (no files, earlier threads or repository),
> so everything was built from the overnight brief alone.

Legend: **[x] verified** by an automated test or a manual screenshot check · **[~] built, not verified** · **[ ] not done**

## Phase 1 – Training
- [x] Email/password accounts; two users fully separated (RLS on every table, integration-tested)
- [x] Exercise library (150 Swedish exercises), search/filter, custom exercises, variations, personal notes
- [x] Program builder: PPL / Upper-Lower / Full body presets + custom; no fixed training days
- [x] Active workout: one-tap set completion, add/remove/duplicate sets, warm-up/working/failure/drop sets, optional RIR,
      rest timer, workout timer, exercise notes, add/remove/replace/reorder exercises
- [x] Previous performance (grey placeholders, visually distinct from typed values); one tap repeats last time
- [x] Weight per dumbbell, unilateral and bodyweight modes
- [x] Autosave (localStorage per user immediately + server within ~0.6 s); recovery after reload, new tab, crash, offline
- [x] Finish via transactional `save_workout` RPC; history; edit/delete completed workouts
- [x] e1RM, PRs (only when beating an earlier session), weekly/monthly comparison, next-workout suggestion from real history
- [x] Analytics with 7d / 30d / 90d / 6m / all
- [~] Rest-timer sound/vibration (works in the browser, not tested on a real phone)
- [~] Password reset by e-mail (no mail server in the sandbox)

## Phase 2 – Nutrition
- [x] Daily kcal/protein/carb/fat targets; food log per meal in grams; daily history; weekly statistics
- [x] Custom foods (values per 100 g, validation of impossible values), saved meals, recipes (raw or cooked weight)
- [~] Open Food Facts search + barcode-number lookup (code written and unit-tested on sample data, but the sandbox
      network blocks openfoodfacts.org, so never run against the real API)
- [ ] Livsmedelsverket food database (blocked from the sandbox; not built. No nutrition values were invented)
- [ ] Barcode scanning with the camera

## Phase 3 – Body & goals
- [x] Body weight log, 7-day moving average, trend chart, weekly rate, target weight
- [x] Measurements (waist, hips, chest, arm, thigh, calf, neck, body fat %)
- [x] Strength goals (weight × reps per exercise) with progress from real history; weekly workout-frequency goal
- [x] Home dashboard: week stats, goal progress, weight, next goal, recent PRs/workouts

## Phase 4 – Advanced
- [x] Cardio: time + distance per set for cardio exercises, pace, records, chart, previous-session repeat
- [x] Partner sharing: one-time invite code (48 h) → partner gets **read-only** access to completed workouts and
      custom exercises. Nutrition, body data, goals, programs and the live workout are never shared. Either side can end it.
- [x] Offline: app shell is precached by the service worker; an ongoing workout keeps working offline and syncs later
- [~] Accessibility: labelled inputs/buttons, 44 px touch targets, `aria-pressed` on set buttons; no screen-reader audit done
- [~] Performance: chart and secondary screens are lazy-loaded; main bundle 518 kB (157 kB gzip)
- [ ] Progress photos (needs Supabase Storage bucket + policies; postponed)
- [ ] Reminders / push notifications
- [~] Starting a brand-new workout with no connection at all (code path exists; only tested going offline mid-workout)

## Test results (latest run, all green)
| Suite | Command | Result |
|---|---|---|
| Unit (training, cardio, nutrition, body calculations, draft ops) | `npm test` | 32/32 |
| Integration (RLS with real users, RPC, partner sharing consent/revoke) | `npm run test:integration` | 18/18 |
| E2E, phone viewport (two-user training, nutrition, body, offline, crash recovery, cardio, partner sharing) | `npm run test:e2e` | 7/7 |
| Typecheck + lint + production build | `npm run build && npm run lint` | pass |

## Fixed during the session (notable)
- Workout started within a second of logging in could be discarded by the restore check (race) → fixed, covered by E2E.
- Login after logout bounced back to the previous page → fixed.

## Known blockers / needs Pontus
- No hosted Supabase project or credentials: verified only against a **local** Supabase stack. See README for setup.
- Not deployed (no authorization to deploy publicly).

## Next priorities
1. Create the Supabase project, deploy, install on both phones, real-device test of rest timer/vibration
2. Swedish food database (Livsmedelsverket export import) and camera barcode scanning
3. Progress photos (private storage bucket with per-user policies)
4. Reminders, accessibility audit with VoiceOver/TalkBack

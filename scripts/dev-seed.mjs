// LOCAL DEVELOPMENT ONLY: creates a demo user with ~10 weeks of realistic training history.
// Usage: node scripts/dev-seed.mjs [email] [password]
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => l.split(/=(.*)/s).slice(0, 2)),
)
if (!env.VITE_SUPABASE_URL.includes('127.0.0.1') && !env.VITE_SUPABASE_URL.includes('localhost')) {
  console.error('Refusing to seed a non-local database')
  process.exit(1)
}
const email = process.argv[2] ?? 'demo@forma.test'
const password = process.argv[3] ?? 'demo-password'
const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
let { data, error } = await c.auth.signInWithPassword({ email, password })
if (error) ({ data, error } = await c.auth.signUp({ email, password, options: { data: { display_name: 'Demo' } } }))
if (error) throw error
const uid = data.user.id

const { data: ex } = await c.from('exercises').select('id,name').is('user_id', null)
const id = (n) => ex.find((e) => e.name === n).id

const plans = {
  Push: [['Bänkpress', 60, 2.5, 8], ['Lutande hantelpress', 22, 1, 10], ['Sidolyft hantlar', 8, 0.5, 14], ['Triceps pushdown', 25, 1.25, 12]],
  Pull: [['Latsdrag', 50, 2.5, 10], ['Sittande kabelrodd', 50, 2.5, 10], ['Bicepscurl hantlar', 12, 0.5, 10]],
  Ben: [['Knäböj', 80, 2.5, 6], ['Rumänska marklyft', 70, 2.5, 8], ['Liggande lårcurl', 35, 1.25, 12], ['Stående vadpress', 60, 2.5, 12]],
}
const names = Object.keys(plans)
let n = 0
const start = new Date()
start.setDate(start.getDate() - 70)
for (let day = 0; day < 70; day++) {
  if (day % 7 === 2 || day % 7 === 5 || day % 7 === 6) continue // ~4 days/week
  if (Math.random() < 0.12) continue
  const date = new Date(start)
  date.setDate(start.getDate() + day)
  date.setHours(17, 30, 0, 0)
  const name = names[n % 3]
  const week = Math.floor(day / 7)
  const exercises = plans[name].map(([exName, base, inc, reps]) => {
    const w = Math.round((base + inc * week * 0.8) / 1.25) * 1.25
    return {
      exercise_id: id(exName),
      sets: [
        { set_type: 'warmup', weight: Math.round(w * 0.5), reps: 10, completed: true },
        ...[0, 1, 2].map((i) => ({ set_type: 'normal', weight: w, reps: Math.max(1, reps - i + (week % 2)), completed: true })),
      ],
    }
  })
  const { data: wk, error: e1 } = await c.from('workouts').insert({ user_id: uid, name, started_at: date.toISOString(), status: 'active' }).select('id').single()
  if (e1) throw e1
  const end = new Date(date.getTime() + (55 + Math.random() * 20) * 60000)
  const { error: e2 } = await c.rpc('save_workout', { p_workout_id: wk.id, p_payload: { name, started_at: date.toISOString(), ended_at: end.toISOString(), exercises }, p_complete: true })
  if (e2) throw e2
  n++
}
console.log(`Seeded ${n} workouts for ${email}`)

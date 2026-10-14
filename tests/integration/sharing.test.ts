/**
 * Partner sharing: read-only access to training data only after the owner's explicit invite is redeemed.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '../../src/lib/database.types'

const URL = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const KEY = process.env.VITE_SUPABASE_ANON_KEY!
type Client = SupabaseClient<Database>

async function newUser(name: string): Promise<{ c: Client; id: string }> {
  const c = createClient<Database>(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const email = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@forma.test`
  const { data, error } = await c.auth.signUp({ email, password: 'test-password-123', options: { data: { display_name: name } } })
  if (error) throw error
  return { c, id: data.user!.id }
}

let A: { c: Client; id: string } // owner
let B: { c: Client; id: string } // partner
let C: { c: Client; id: string } // outsider
let benchId: string
let doneId: string
let activeId: string
let customId: string

async function completedWorkout(u: { c: Client; id: string }, name: string) {
  const id = crypto.randomUUID()
  await u.c.from('workouts').insert({ id, user_id: u.id, name, status: 'active' }).throwOnError()
  await u.c
    .rpc('save_workout', {
      p_workout_id: id,
      p_payload: { name, exercises: [{ exercise_id: benchId, sets: [{ set_type: 'normal', weight: 80, reps: 5, completed: true }] }] },
      p_complete: true,
    })
    .throwOnError()
  return id
}

beforeAll(async () => {
  A = await newUser('owner')
  B = await newUser('partner')
  C = await newUser('outsider')
  benchId = (await A.c.from('exercises').select('id').eq('name', 'Bänkpress').is('user_id', null).single()).data!.id
  doneId = await completedWorkout(A, 'Annas push')
  activeId = crypto.randomUUID()
  await A.c.from('workouts').insert({ id: activeId, user_id: A.id, name: 'Pågående', status: 'active', draft: { secret: true } }).throwOnError()
  customId = (await A.c.from('exercises').insert({ user_id: A.id, name: 'Annas maskin', muscle_group: 'chest', equipment: 'machine' }).select('id').single()).data!.id
  await A.c.from('body_weights').insert({ user_id: A.id, measured_on: '2026-10-01', weight: 62.5 }).throwOnError()
})

describe('partner sharing', () => {
  it('nothing is visible before consent', async () => {
    expect((await B.c.from('workouts').select('id').eq('user_id', A.id)).data).toHaveLength(0)
    expect((await B.c.from('set_history').select('set_id').eq('user_id', A.id)).data).toHaveLength(0)
  })

  it('shares cannot be created directly, only by redeeming an invite', async () => {
    const { error } = await B.c.from('training_shares').insert({ owner_id: A.id, viewer_id: B.id })
    expect(error).not.toBeNull()
    const { error: e2 } = await B.c.from('share_invites').insert({ code: 'AAAA-BBBB-CCCC', owner_id: A.id })
    expect(e2).not.toBeNull()
  })

  it('invalid and own codes are rejected', async () => {
    const { error } = await B.c.rpc('accept_share_invite', { p_code: '0000-0000-0000' })
    expect(error?.message).toContain('invalid_or_expired_code')
    const { data: inv } = await A.c.rpc('create_share_invite').single()
    const { error: own } = await A.c.rpc('accept_share_invite', { p_code: inv!.code })
    expect(own?.message).toContain('own_code')
  })

  it('other users cannot see the owner’s invite codes', async () => {
    expect((await C.c.from('share_invites').select('code').eq('owner_id', A.id)).data).toHaveLength(0)
  })

  it('after redeeming, the partner can read completed training only – read-only', async () => {
    const { data: inv } = await A.c.rpc('create_share_invite').single()
    expect(inv!.code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/)
    const { data: name, error } = await B.c.rpc('accept_share_invite', { p_code: inv!.code.toLowerCase() })
    expect(error).toBeNull()
    expect(name).toBe('owner')

    // Code is single use
    const { error: reuse } = await C.c.rpc('accept_share_invite', { p_code: inv!.code })
    expect(reuse?.message).toContain('invalid_or_expired_code')

    const { data: ws } = await B.c.from('workouts').select('id, status, draft').eq('user_id', A.id)
    expect(ws!.map((w) => w.id)).toEqual([doneId])
    const { data: sets } = await B.c.from('set_history').select('weight, reps').eq('user_id', A.id)
    expect(sets).toEqual([{ weight: 80, reps: 5 }])
    expect((await B.c.from('exercises').select('id').eq('id', customId)).data).toHaveLength(1)

    // Not shared: nutrition/body/profile/programs/in-progress workout
    expect((await B.c.from('workouts').select('id').eq('id', activeId)).data).toHaveLength(0)
    expect((await B.c.from('body_weights').select('id').eq('user_id', A.id)).data).toHaveLength(0)
    expect((await B.c.from('profiles').select('id').eq('id', A.id)).data).toHaveLength(0)
    expect((await B.c.from('programs').select('id').eq('user_id', A.id)).data).toHaveLength(0)

    // Read-only
    await B.c.from('workouts').update({ name: 'hacked' }).eq('id', doneId)
    await B.c.from('workouts').delete().eq('id', doneId)
    await B.c.from('workout_sets').update({ weight: 999 }).eq('user_id', A.id)
    const { error: rpcErr } = await B.c.rpc('save_workout', { p_workout_id: doneId, p_payload: { exercises: [] }, p_complete: true })
    expect(rpcErr).not.toBeNull()
    const { data: still } = await A.c.from('set_history').select('weight').eq('workout_id', doneId)
    expect(still).toEqual([{ weight: 80 }])
    expect((await A.c.from('workouts').select('name').eq('id', doneId).single()).data!.name).toBe('Annas push')

    // The share is one-directional
    await completedWorkout(B, 'Bertils pass')
    expect((await A.c.from('workouts').select('id').eq('user_id', B.id)).data).toHaveLength(0)

    // Outsider still sees nothing
    expect((await C.c.from('workouts').select('id').eq('user_id', A.id)).data).toHaveLength(0)

    // Both sides see the share with only the other person's name
    const { data: la } = await A.c.rpc('list_training_shares')
    expect(la).toMatchObject([{ direction: 'outgoing', other_name: 'partner', viewer_id: B.id }])
    const { data: lb } = await B.c.rpc('list_training_shares')
    expect(lb).toMatchObject([{ direction: 'incoming', other_name: 'owner', owner_id: A.id }])
    expect((await C.c.rpc('list_training_shares')).data).toHaveLength(0)
  })

  it('the owner can revoke and access ends immediately', async () => {
    // Outsider cannot delete someone else's share
    await C.c.from('training_shares').delete().eq('owner_id', A.id)
    expect((await B.c.from('workouts').select('id').eq('user_id', A.id)).data).toHaveLength(1)

    await A.c.from('training_shares').delete().eq('owner_id', A.id).eq('viewer_id', B.id).throwOnError()
    expect((await B.c.from('workouts').select('id').eq('user_id', A.id)).data).toHaveLength(0)
    expect((await B.c.from('set_history').select('set_id').eq('user_id', A.id)).data).toHaveLength(0)
    expect((await B.c.from('exercises').select('id').eq('id', customId)).data).toHaveLength(0)
  })
})

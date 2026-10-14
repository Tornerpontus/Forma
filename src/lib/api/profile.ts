import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, unwrap } from '@/lib/supabase'
import { useUserId } from '@/hooks/auth'
import type { Database } from '@/lib/database.types'
import { qk } from './keys'

export type Profile = Database['public']['Tables']['profiles']['Row']

export function useProfile() {
  const uid = useUserId()
  return useQuery({
    queryKey: qk.profile(uid),
    queryFn: async () => unwrap(await supabase.from('profiles').select('*').eq('id', uid).single()),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateProfile() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>) =>
      unwrap(await supabase.from('profiles').update(patch).eq('id', uid).select('*').single()),
    onSuccess: (p) => qc.setQueryData(qk.profile(uid), p),
  })
}

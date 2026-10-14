-- Partner sharing (read-only, training only).
--
-- Consent model: the OWNER creates a one-time invite code and gives it to the partner. When the partner
-- redeems it, the partner may READ the owner's completed workouts and custom exercises. Nothing else is
-- shared (no nutrition, body data, programs, profile settings or the in-progress workout).
-- Sharing is one-directional; to share back the partner creates their own code.
-- Either side can end the share at any time. Rows can only be created through accept_share_invite().

create table public.share_invites (
  code text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours',
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null
);
create index share_invites_owner_idx on public.share_invites (owner_id);
alter table public.share_invites enable row level security;
create policy "share_invites: read own" on public.share_invites
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "share_invites: delete own" on public.share_invites
  for delete to authenticated using (owner_id = (select auth.uid()));
-- no insert/update policies: only via the functions below

create table public.training_shares (
  owner_id uuid not null references auth.users (id) on delete cascade,
  viewer_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, viewer_id),
  check (owner_id <> viewer_id)
);
create index training_shares_viewer_idx on public.training_shares (viewer_id);
alter table public.training_shares enable row level security;
create policy "training_shares: read own side" on public.training_shares
  for select to authenticated using (owner_id = (select auth.uid()) or viewer_id = (select auth.uid()));
create policy "training_shares: either side can end" on public.training_shares
  for delete to authenticated using (owner_id = (select auth.uid()) or viewer_id = (select auth.uid()));
-- no insert/update policies: a share can only be created by redeeming the owner's invite

-- True when the current user has been granted read access to p_owner's training.
create or replace function public.can_view_training(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.training_shares s
    where s.owner_id = p_owner and s.viewer_id = (select auth.uid())
  );
$$;
revoke execute on function public.can_view_training(uuid) from anon, public;
grant execute on function public.can_view_training(uuid) to authenticated;

create or replace function public.create_share_invite()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_hex text;
  v_code text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  -- One open invite per user: replace any unused one
  delete from public.share_invites i where i.owner_id = v_uid and i.used_at is null;
  v_hex := upper(encode(extensions.gen_random_bytes(6), 'hex'));
  v_code := substr(v_hex, 1, 4) || '-' || substr(v_hex, 5, 4) || '-' || substr(v_hex, 9, 4);
  return query
    insert into public.share_invites as i (code, owner_id) values (v_code, v_uid)
    returning i.code, i.expires_at;
end;
$$;
revoke execute on function public.create_share_invite() from anon, public;
grant execute on function public.create_share_invite() to authenticated;

create or replace function public.accept_share_invite(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.share_invites;
  v_name text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into v_inv from public.share_invites i
  where i.code = upper(trim(p_code)) and i.used_at is null and i.expires_at > now()
  for update;
  if not found then
    raise exception 'invalid_or_expired_code' using errcode = 'P0002';
  end if;
  if v_inv.owner_id = v_uid then
    raise exception 'own_code' using errcode = '22023';
  end if;
  insert into public.training_shares (owner_id, viewer_id) values (v_inv.owner_id, v_uid)
  on conflict do nothing;
  update public.share_invites set used_at = now(), used_by = v_uid where code = v_inv.code;
  select p.display_name into v_name from public.profiles p where p.id = v_inv.owner_id;
  return coalesce(v_name, '');
end;
$$;
revoke execute on function public.accept_share_invite(text) from anon, public;
grant execute on function public.accept_share_invite(text) to authenticated;

-- The current user's shares in both directions, with the other person's display name only.
create or replace function public.list_training_shares()
returns table (owner_id uuid, viewer_id uuid, other_name text, direction text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.owner_id, s.viewer_id, coalesce(p.display_name, ''),
         case when s.owner_id = (select auth.uid()) then 'outgoing' else 'incoming' end,
         s.created_at
  from public.training_shares s
  join public.profiles p on p.id = case when s.owner_id = (select auth.uid()) then s.viewer_id else s.owner_id end
  where s.owner_id = (select auth.uid()) or s.viewer_id = (select auth.uid())
  order by s.created_at;
$$;
revoke execute on function public.list_training_shares() from anon, public;
grant execute on function public.list_training_shares() to authenticated;

-- Read-only access for granted viewers. Only completed workouts; never the live draft.
create policy "workouts: partner reads completed" on public.workouts
  for select to authenticated using (status = 'completed' and public.can_view_training(user_id));

create policy "workout_exercises: partner reads" on public.workout_exercises
  for select to authenticated using (
    public.can_view_training(user_id)
    and exists (select 1 from public.workouts w where w.id = workout_id and w.status = 'completed')
  );

create policy "workout_sets: partner reads" on public.workout_sets
  for select to authenticated using (
    public.can_view_training(user_id)
    and exists (
      select 1 from public.workout_exercises we join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.status = 'completed'
    )
  );

create policy "exercises: partner reads custom" on public.exercises
  for select to authenticated using (user_id is not null and public.can_view_training(user_id));

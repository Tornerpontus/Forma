-- FORMA – Phase 1: träning
-- Every user-owned table carries user_id and is protected by Row Level Security.
-- Global library rows (exercises with user_id IS NULL) are readable by every signed-in user
-- but can only be changed through migrations.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles & settings
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  locale text not null default 'sv',
  default_rest_seconds int not null default 120 check (default_rest_seconds between 0 and 1800),
  auto_start_rest_timer boolean not null default true,
  show_rir boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic updated_at trigger
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Exercise library
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade, -- NULL = global library
  name text not null check (length(trim(name)) between 1 and 120),
  muscle_group text not null check (muscle_group in (
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs',
    'quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'traps', 'full_body', 'cardio', 'other'
  )),
  secondary_muscles text[] not null default '{}',
  equipment text not null check (equipment in (
    'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'smith',
    'band', 'ez_bar', 'trap_bar', 'plate', 'other'
  )),
  weight_mode text not null default 'total' check (weight_mode in ('total', 'per_dumbbell', 'bodyweight')),
  is_unilateral boolean not null default false,
  variation_of uuid references public.exercises (id) on delete set null,
  notes text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercises_user_idx on public.exercises (user_id);
create unique index exercises_global_name_uniq on public.exercises (lower(name)) where user_id is null;

alter table public.exercises enable row level security;

create policy "exercises: read global and own" on public.exercises
  for select to authenticated using (user_id is null or user_id = (select auth.uid()));
create policy "exercises: insert own" on public.exercises
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "exercises: update own" on public.exercises
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "exercises: delete own" on public.exercises
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger exercises_touch before update on public.exercises
  for each row execute function public.touch_updated_at();

-- Private per-user notes on any exercise (including global ones)
create table public.exercise_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.exercise_notes enable row level security;
create policy "exercise_notes: all own" on public.exercise_notes
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Programs → templates (pass) → planned exercises
-- ---------------------------------------------------------------------------
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  description text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index programs_user_idx on public.programs (user_id);

create table public.program_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  notes text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index program_workouts_program_idx on public.program_workouts (program_id);

create table public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_workout_id uuid not null references public.program_workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position int not null default 0,
  target_sets int not null default 3 check (target_sets between 1 and 20),
  rep_min int not null default 8 check (rep_min between 1 and 100),
  rep_max int not null default 12 check (rep_max between 1 and 100),
  warmup_sets int not null default 0 check (warmup_sets between 0 and 10),
  rest_seconds int check (rest_seconds between 0 and 1800),
  notes text not null default '',
  check (rep_max >= rep_min)
);
create index program_exercises_workout_idx on public.program_exercises (program_workout_id);

alter table public.programs enable row level security;
alter table public.program_workouts enable row level security;
alter table public.program_exercises enable row level security;

create policy "programs: all own" on public.programs
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "program_workouts: read own" on public.program_workouts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "program_workouts: write own" on public.program_workouts
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.programs p where p.id = program_id and p.user_id = (select auth.uid()))
  );
create policy "program_workouts: update own" on public.program_workouts
  for update to authenticated using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.programs p where p.id = program_id and p.user_id = (select auth.uid()))
  );
create policy "program_workouts: delete own" on public.program_workouts
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "program_exercises: read own" on public.program_exercises
  for select to authenticated using (user_id = (select auth.uid()));
create policy "program_exercises: insert own" on public.program_exercises
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.program_workouts w where w.id = program_workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e where e.id = exercise_id and (e.user_id is null or e.user_id = (select auth.uid())))
  );
create policy "program_exercises: update own" on public.program_exercises
  for update to authenticated using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.program_workouts w where w.id = program_workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e where e.id = exercise_id and (e.user_id is null or e.user_id = (select auth.uid())))
  );
create policy "program_exercises: delete own" on public.program_exercises
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger programs_touch before update on public.programs
  for each row execute function public.touch_updated_at();
create trigger program_workouts_touch before update on public.program_workouts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Logged workouts
-- An active workout lives as a JSON draft on its row (saved continuously from the phone).
-- Finishing or editing a workout normalises the draft into workout_exercises / workout_sets
-- inside one transaction (save_workout).
-- ---------------------------------------------------------------------------
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Pass',
  program_workout_id uuid references public.program_workouts (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'completed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text not null default '',
  draft jsonb,
  draft_version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workouts_user_started_idx on public.workouts (user_id, started_at desc);
-- At most one active workout per user
create unique index workouts_one_active_per_user on public.workouts (user_id) where status = 'active';

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position int not null default 0,
  notes text not null default ''
);
create index workout_exercises_workout_idx on public.workout_exercises (workout_id);
create index workout_exercises_user_ex_idx on public.workout_exercises (user_id, exercise_id);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  position int not null default 0,
  set_type text not null default 'normal' check (set_type in ('warmup', 'normal', 'failure', 'drop')),
  weight numeric(7, 2) check (weight is null or weight between -500 and 2000),
  reps int check (reps is null or reps between 0 and 1000),
  rir numeric(3, 1) check (rir is null or rir between 0 and 10),
  completed boolean not null default false,
  completed_at timestamptz
);
create index workout_sets_we_idx on public.workout_sets (workout_exercise_id);

alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;

create policy "workouts: all own" on public.workouts
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "workout_exercises: read own" on public.workout_exercises
  for select to authenticated using (user_id = (select auth.uid()));
create policy "workout_exercises: insert own" on public.workout_exercises
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e where e.id = exercise_id and (e.user_id is null or e.user_id = (select auth.uid())))
  );
create policy "workout_exercises: update own" on public.workout_exercises
  for update to authenticated using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
  );
create policy "workout_exercises: delete own" on public.workout_exercises
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "workout_sets: read own" on public.workout_sets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "workout_sets: insert own" on public.workout_sets
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workout_exercises we where we.id = workout_exercise_id and we.user_id = (select auth.uid()))
  );
create policy "workout_sets: update own" on public.workout_sets
  for update to authenticated using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workout_exercises we where we.id = workout_exercise_id and we.user_id = (select auth.uid()))
  );
create policy "workout_sets: delete own" on public.workout_sets
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger workouts_touch before update on public.workouts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- save_workout: atomically replace a workout's exercises/sets from a JSON payload.
-- Runs as the caller (security invoker) so every insert is checked by RLS as well.
-- payload = {
--   name, notes, started_at, ended_at, program_workout_id,
--   exercises: [{ exercise_id, notes, sets: [{ set_type, weight, reps, rir, completed, completed_at }] }]
-- }
-- ---------------------------------------------------------------------------
create or replace function public.save_workout(p_workout_id uuid, p_payload jsonb, p_complete boolean default true)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ex jsonb;
  v_set jsonb;
  v_we_id uuid;
  v_ex_pos int := 0;
  v_set_pos int;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.workouts w where w.id = p_workout_id and w.user_id = v_uid) then
    raise exception 'workout not found' using errcode = 'P0002';
  end if;

  update public.workouts set
    name = coalesce(nullif(trim(p_payload ->> 'name'), ''), name),
    notes = coalesce(p_payload ->> 'notes', notes),
    started_at = coalesce((p_payload ->> 'started_at')::timestamptz, started_at),
    ended_at = case when p_complete then coalesce((p_payload ->> 'ended_at')::timestamptz, ended_at, now()) else ended_at end,
    status = case when p_complete then 'completed' else status end,
    draft = case when p_complete then null else draft end
  where id = p_workout_id and user_id = v_uid;

  delete from public.workout_exercises where workout_id = p_workout_id and user_id = v_uid;

  for v_ex in select * from jsonb_array_elements(coalesce(p_payload -> 'exercises', '[]'::jsonb)) loop
    insert into public.workout_exercises (user_id, workout_id, exercise_id, position, notes)
    values (v_uid, p_workout_id, (v_ex ->> 'exercise_id')::uuid, v_ex_pos, coalesce(v_ex ->> 'notes', ''))
    returning id into v_we_id;
    v_ex_pos := v_ex_pos + 1;

    v_set_pos := 0;
    for v_set in select * from jsonb_array_elements(coalesce(v_ex -> 'sets', '[]'::jsonb)) loop
      insert into public.workout_sets (user_id, workout_exercise_id, position, set_type, weight, reps, rir, completed, completed_at)
      values (
        v_uid, v_we_id, v_set_pos,
        coalesce(v_set ->> 'set_type', 'normal'),
        nullif(v_set ->> 'weight', '')::numeric,
        nullif(v_set ->> 'reps', '')::int,
        nullif(v_set ->> 'rir', '')::numeric,
        coalesce((v_set ->> 'completed')::boolean, false),
        nullif(v_set ->> 'completed_at', '')::timestamptz
      );
      v_set_pos := v_set_pos + 1;
    end loop;
  end loop;

  return p_workout_id;
end;
$$;

grant execute on function public.save_workout(uuid, jsonb, boolean) to authenticated;
revoke execute on function public.save_workout(uuid, jsonb, boolean) from anon, public;

-- ---------------------------------------------------------------------------
-- Flat history view used for previous performance, PRs and charts.
-- security_invoker makes the view obey the caller's RLS.
-- ---------------------------------------------------------------------------
create view public.set_history with (security_invoker = true) as
select
  s.id as set_id,
  s.user_id,
  w.id as workout_id,
  w.name as workout_name,
  w.started_at,
  we.id as workout_exercise_id,
  we.exercise_id,
  we.position as exercise_position,
  s.position as set_position,
  s.set_type,
  s.weight,
  s.reps,
  s.rir,
  s.completed
from public.workout_sets s
join public.workout_exercises we on we.id = s.workout_exercise_id
join public.workouts w on w.id = we.workout_id
where w.status = 'completed';

grant select on public.set_history to authenticated;

-- Alla migrationer i en fil, för att klistra in i Supabase SQL Editor (kör en gång på ett nytt projekt).
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
-- FORMA – global exercise library (generated by scripts/gen_exercises.py)
insert into public.exercises (name, muscle_group, equipment, weight_mode, is_unilateral, secondary_muscles) values
  ('Bänkpress', 'chest', 'barbell', 'total', false, '{triceps,shoulders}'),
  ('Lutande bänkpress', 'chest', 'barbell', 'total', false, '{shoulders,triceps}'),
  ('Nedåtlutande bänkpress', 'chest', 'barbell', 'total', false, '{triceps}'),
  ('Smalgreppad bänkpress', 'triceps', 'barbell', 'total', false, '{chest}'),
  ('Hantelpress', 'chest', 'dumbbell', 'per_dumbbell', false, '{triceps,shoulders}'),
  ('Lutande hantelpress', 'chest', 'dumbbell', 'per_dumbbell', false, '{shoulders,triceps}'),
  ('Nedåtlutande hantelpress', 'chest', 'dumbbell', 'per_dumbbell', false, '{triceps}'),
  ('Hantelflyes', 'chest', 'dumbbell', 'per_dumbbell', false, '{}'),
  ('Lutande hantelflyes', 'chest', 'dumbbell', 'per_dumbbell', false, '{shoulders}'),
  ('Kabelflyes', 'chest', 'cable', 'total', false, '{}'),
  ('Kabelflyes nedifrån', 'chest', 'cable', 'total', false, '{shoulders}'),
  ('Kabelflyes uppifrån', 'chest', 'cable', 'total', false, '{}'),
  ('Bröstpress maskin', 'chest', 'machine', 'total', false, '{triceps}'),
  ('Lutande bröstpress maskin', 'chest', 'machine', 'total', false, '{shoulders}'),
  ('Pec deck', 'chest', 'machine', 'total', false, '{}'),
  ('Smith bänkpress', 'chest', 'smith', 'total', false, '{triceps}'),
  ('Lutande smith bänkpress', 'chest', 'smith', 'total', false, '{shoulders}'),
  ('Armhävningar', 'chest', 'bodyweight', 'bodyweight', false, '{triceps,shoulders}'),
  ('Dips bröst', 'chest', 'bodyweight', 'bodyweight', false, '{triceps}'),
  ('Pullover hantel', 'chest', 'dumbbell', 'total', false, '{back}'),
  ('Marklyft', 'back', 'barbell', 'total', false, '{hamstrings,glutes}'),
  ('Rumänska marklyft', 'hamstrings', 'barbell', 'total', false, '{glutes,back}'),
  ('Stela marklyft', 'hamstrings', 'barbell', 'total', false, '{glutes}'),
  ('Sumomarklyft', 'back', 'barbell', 'total', false, '{glutes,quads}'),
  ('Trap bar marklyft', 'back', 'trap_bar', 'total', false, '{quads,glutes}'),
  ('Skivstångsrodd', 'back', 'barbell', 'total', false, '{biceps}'),
  ('Pendlay-rodd', 'back', 'barbell', 'total', false, '{biceps}'),
  ('T-stångsrodd', 'back', 'plate', 'total', false, '{biceps}'),
  ('Hantelrodd', 'back', 'dumbbell', 'per_dumbbell', true, '{biceps}'),
  ('Lutande hantelrodd', 'back', 'dumbbell', 'per_dumbbell', false, '{biceps}'),
  ('Sittande kabelrodd', 'back', 'cable', 'total', false, '{biceps}'),
  ('Enarms kabelrodd', 'back', 'cable', 'total', true, '{biceps}'),
  ('Maskinrodd', 'back', 'machine', 'total', false, '{biceps}'),
  ('Bröststödd rodd maskin', 'back', 'machine', 'total', false, '{biceps}'),
  ('Latsdrag', 'back', 'cable', 'total', false, '{biceps}'),
  ('Latsdrag smalt grepp', 'back', 'cable', 'total', false, '{biceps}'),
  ('Latsdrag underhandsgrepp', 'back', 'cable', 'total', false, '{biceps}'),
  ('Enarms latsdrag', 'back', 'cable', 'total', true, '{biceps}'),
  ('Raka armar latsdrag', 'back', 'cable', 'total', false, '{}'),
  ('Chins', 'back', 'bodyweight', 'bodyweight', false, '{biceps}'),
  ('Pull-ups', 'back', 'bodyweight', 'bodyweight', false, '{biceps}'),
  ('Assisterade chins', 'back', 'machine', 'total', false, '{biceps}'),
  ('Inverterad rodd', 'back', 'bodyweight', 'bodyweight', false, '{biceps}'),
  ('Rygglyft', 'back', 'bodyweight', 'bodyweight', false, '{glutes,hamstrings}'),
  ('Good mornings', 'hamstrings', 'barbell', 'total', false, '{back}'),
  ('Shrugs skivstång', 'traps', 'barbell', 'total', false, '{}'),
  ('Shrugs hantlar', 'traps', 'dumbbell', 'per_dumbbell', false, '{}'),
  ('Militärpress', 'shoulders', 'barbell', 'total', false, '{triceps}'),
  ('Sittande axelpress hantlar', 'shoulders', 'dumbbell', 'per_dumbbell', false, '{triceps}'),
  ('Stående axelpress hantlar', 'shoulders', 'dumbbell', 'per_dumbbell', false, '{triceps}'),
  ('Arnoldpress', 'shoulders', 'dumbbell', 'per_dumbbell', false, '{triceps}'),
  ('Axelpress maskin', 'shoulders', 'machine', 'total', false, '{triceps}'),
  ('Smith axelpress', 'shoulders', 'smith', 'total', false, '{triceps}'),
  ('Sidolyft hantlar', 'shoulders', 'dumbbell', 'per_dumbbell', false, '{}'),
  ('Sidolyft kabel', 'shoulders', 'cable', 'total', true, '{}'),
  ('Sidolyft maskin', 'shoulders', 'machine', 'total', false, '{}'),
  ('Framåtlyft hantlar', 'shoulders', 'dumbbell', 'per_dumbbell', false, '{}'),
  ('Omvända flyes hantlar', 'shoulders', 'dumbbell', 'per_dumbbell', false, '{back}'),
  ('Omvänd pec deck', 'shoulders', 'machine', 'total', false, '{back}'),
  ('Face pulls', 'shoulders', 'cable', 'total', false, '{back,traps}'),
  ('Upright row', 'shoulders', 'barbell', 'total', false, '{traps}'),
  ('Landmine press', 'shoulders', 'barbell', 'total', true, '{chest,triceps}'),
  ('Bicepscurl skivstång', 'biceps', 'barbell', 'total', false, '{forearms}'),
  ('Bicepscurl EZ-stång', 'biceps', 'ez_bar', 'total', false, '{forearms}'),
  ('Bicepscurl hantlar', 'biceps', 'dumbbell', 'per_dumbbell', false, '{forearms}'),
  ('Hammercurl', 'biceps', 'dumbbell', 'per_dumbbell', false, '{forearms}'),
  ('Lutande hantelcurl', 'biceps', 'dumbbell', 'per_dumbbell', false, '{}'),
  ('Koncentrationscurl', 'biceps', 'dumbbell', 'total', true, '{}'),
  ('Scottcurl', 'biceps', 'ez_bar', 'total', false, '{}'),
  ('Scottcurl maskin', 'biceps', 'machine', 'total', false, '{}'),
  ('Bicepscurl kabel', 'biceps', 'cable', 'total', false, '{}'),
  ('Spidercurl', 'biceps', 'dumbbell', 'per_dumbbell', false, '{}'),
  ('Triceps pushdown', 'triceps', 'cable', 'total', false, '{}'),
  ('Triceps pushdown rep', 'triceps', 'cable', 'total', false, '{}'),
  ('Triceps overhead kabel', 'triceps', 'cable', 'total', false, '{}'),
  ('Skull crushers', 'triceps', 'ez_bar', 'total', false, '{}'),
  ('Fransk press hantel', 'triceps', 'dumbbell', 'total', false, '{}'),
  ('Triceps kickback', 'triceps', 'dumbbell', 'per_dumbbell', true, '{}'),
  ('Dips', 'triceps', 'bodyweight', 'bodyweight', false, '{chest,shoulders}'),
  ('Bänkdips', 'triceps', 'bodyweight', 'bodyweight', false, '{}'),
  ('Dips maskin', 'triceps', 'machine', 'total', false, '{chest}'),
  ('Handledscurl', 'forearms', 'barbell', 'total', false, '{}'),
  ('Omvänd handledscurl', 'forearms', 'barbell', 'total', false, '{}'),
  ('Farmers walk', 'forearms', 'dumbbell', 'per_dumbbell', false, '{traps,full_body}'),
  ('Knäböj', 'quads', 'barbell', 'total', false, '{glutes,hamstrings}'),
  ('Frontböj', 'quads', 'barbell', 'total', false, '{glutes,abs}'),
  ('Smith knäböj', 'quads', 'smith', 'total', false, '{glutes}'),
  ('Gobletknäböj', 'quads', 'dumbbell', 'total', false, '{glutes}'),
  ('Bulgarian split squat', 'quads', 'dumbbell', 'per_dumbbell', true, '{glutes}'),
  ('Utfallssteg', 'quads', 'dumbbell', 'per_dumbbell', true, '{glutes}'),
  ('Gående utfall', 'quads', 'dumbbell', 'per_dumbbell', true, '{glutes}'),
  ('Step-ups', 'quads', 'dumbbell', 'per_dumbbell', true, '{glutes}'),
  ('Benpress', 'quads', 'machine', 'total', false, '{glutes}'),
  ('Enbens benpress', 'quads', 'machine', 'total', true, '{glutes}'),
  ('Hack squat', 'quads', 'machine', 'total', false, '{glutes}'),
  ('Benspark', 'quads', 'machine', 'total', false, '{}'),
  ('Enbens benspark', 'quads', 'machine', 'total', true, '{}'),
  ('Pendulum squat', 'quads', 'machine', 'total', false, '{glutes}'),
  ('Sissy squat', 'quads', 'bodyweight', 'bodyweight', false, '{}'),
  ('Liggande lårcurl', 'hamstrings', 'machine', 'total', false, '{}'),
  ('Sittande lårcurl', 'hamstrings', 'machine', 'total', false, '{}'),
  ('Stående lårcurl', 'hamstrings', 'machine', 'total', true, '{}'),
  ('Nordic curls', 'hamstrings', 'bodyweight', 'bodyweight', false, '{}'),
  ('Rumänska marklyft hantlar', 'hamstrings', 'dumbbell', 'per_dumbbell', false, '{glutes}'),
  ('Enbens rumänska marklyft', 'hamstrings', 'dumbbell', 'total', true, '{glutes}'),
  ('Hip thrust', 'glutes', 'barbell', 'total', false, '{hamstrings}'),
  ('Hip thrust maskin', 'glutes', 'machine', 'total', false, '{hamstrings}'),
  ('Glute bridge', 'glutes', 'barbell', 'total', false, '{hamstrings}'),
  ('Kabelkickback', 'glutes', 'cable', 'total', true, '{}'),
  ('Glute kickback maskin', 'glutes', 'machine', 'total', true, '{}'),
  ('Abduktor maskin', 'glutes', 'machine', 'total', false, '{}'),
  ('Adduktor maskin', 'adductors', 'machine', 'total', false, '{}'),
  ('Copenhagen plank', 'adductors', 'bodyweight', 'bodyweight', true, '{abs}'),
  ('Kettlebell swing', 'glutes', 'kettlebell', 'total', false, '{hamstrings,back}'),
  ('Stående vadpress', 'calves', 'machine', 'total', false, '{}'),
  ('Sittande vadpress', 'calves', 'machine', 'total', false, '{}'),
  ('Vadpress i benpress', 'calves', 'machine', 'total', false, '{}'),
  ('Enbens vadpress', 'calves', 'dumbbell', 'total', true, '{}'),
  ('Smith vadpress', 'calves', 'smith', 'total', false, '{}'),
  ('Plankan', 'abs', 'bodyweight', 'bodyweight', false, '{}'),
  ('Sidoplanka', 'abs', 'bodyweight', 'bodyweight', true, '{}'),
  ('Crunches', 'abs', 'bodyweight', 'bodyweight', false, '{}'),
  ('Kabelcrunch', 'abs', 'cable', 'total', false, '{}'),
  ('Hängande benlyft', 'abs', 'bodyweight', 'bodyweight', false, '{}'),
  ('Benlyft i ställning', 'abs', 'bodyweight', 'bodyweight', false, '{}'),
  ('Ab wheel', 'abs', 'other', 'bodyweight', false, '{}'),
  ('Russian twist', 'abs', 'plate', 'total', false, '{}'),
  ('Pallof press', 'abs', 'cable', 'total', true, '{}'),
  ('Crunch maskin', 'abs', 'machine', 'total', false, '{}'),
  ('Dead bug', 'abs', 'bodyweight', 'bodyweight', false, '{}'),
  ('Bird dog', 'abs', 'bodyweight', 'bodyweight', false, '{back}'),
  ('Rumänsk marklyft kettlebell', 'hamstrings', 'kettlebell', 'total', false, '{glutes}'),
  ('Kettlebell goblet squat', 'quads', 'kettlebell', 'total', false, '{glutes}'),
  ('Turkish get-up', 'full_body', 'kettlebell', 'total', true, '{shoulders,abs}'),
  ('Thrusters', 'full_body', 'barbell', 'total', false, '{quads,shoulders}'),
  ('Frivändning', 'full_body', 'barbell', 'total', false, '{back,quads}'),
  ('Ryck', 'full_body', 'barbell', 'total', false, '{shoulders,quads}'),
  ('Burpees', 'full_body', 'bodyweight', 'bodyweight', false, '{}'),
  ('Slädpush', 'full_body', 'other', 'total', false, '{quads}'),
  ('Löpning', 'cardio', 'other', 'bodyweight', false, '{}'),
  ('Löpband', 'cardio', 'machine', 'bodyweight', false, '{}'),
  ('Roddmaskin', 'cardio', 'machine', 'bodyweight', false, '{back}'),
  ('Cykel', 'cardio', 'machine', 'bodyweight', false, '{quads}'),
  ('Crosstrainer', 'cardio', 'machine', 'bodyweight', false, '{}'),
  ('Trappmaskin', 'cardio', 'machine', 'bodyweight', false, '{glutes}'),
  ('Assault bike', 'cardio', 'machine', 'bodyweight', false, '{}'),
  ('Hopprep', 'cardio', 'other', 'bodyweight', false, '{calves}'),
  ('Promenad', 'cardio', 'other', 'bodyweight', false, '{}'),
  ('Simning', 'cardio', 'other', 'bodyweight', false, '{full_body}'),
  ('Skierg', 'cardio', 'machine', 'bodyweight', false, '{back}')
on conflict do nothing;
-- FORMA – Phase 2: nutrition. All rows are private per user (RLS).

alter table public.profiles
  add column kcal_target int check (kcal_target is null or kcal_target between 0 and 20000),
  add column protein_target int check (protein_target is null or protein_target between 0 and 1000),
  add column carbs_target int check (carbs_target is null or carbs_target between 0 and 2000),
  add column fat_target int check (fat_target is null or fat_target between 0 and 1000);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  brand text not null default '',
  -- Nutrition per 100 g, as entered by the user or copied from the cited source
  kcal numeric(7, 2) not null check (kcal between 0 and 1000),
  protein numeric(6, 2) not null default 0 check (protein between 0 and 100),
  carbs numeric(6, 2) not null default 0 check (carbs between 0 and 100),
  fat numeric(6, 2) not null default 0 check (fat between 0 and 100),
  fiber numeric(6, 2) check (fiber is null or fiber between 0 and 100),
  portion_g numeric(7, 1) check (portion_g is null or portion_g > 0),
  portion_name text not null default '',
  source text not null default 'manual' check (source in ('manual', 'openfoodfacts', 'livsmedelsverket')),
  source_id text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index foods_user_idx on public.foods (user_id);
create unique index foods_user_source_uniq on public.foods (user_id, source, source_id) where source_id is not null;

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  servings numeric(5, 1) not null default 1 check (servings > 0),
  -- Weight after cooking; when null the sum of the raw ingredients is used
  cooked_weight_g numeric(8, 1) check (cooked_weight_g is null or cooked_weight_g > 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  grams numeric(8, 1) not null check (grams > 0),
  position int not null default 0
);
create index recipe_items_recipe_idx on public.recipe_items (recipe_id);

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  created_at timestamptz not null default now()
);

create table public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_id uuid not null references public.saved_meals (id) on delete cascade,
  food_id uuid references public.foods (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete cascade,
  grams numeric(8, 1) not null check (grams > 0),
  position int not null default 0,
  check ((food_id is null) <> (recipe_id is null))
);
create index saved_meal_items_meal_idx on public.saved_meal_items (meal_id);

-- A logged portion. Nutrition values are snapshotted so later edits to a food never rewrite history.
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_on date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id uuid references public.foods (id) on delete set null,
  recipe_id uuid references public.recipes (id) on delete set null,
  name text not null,
  grams numeric(8, 1) not null check (grams > 0 and grams <= 10000),
  kcal numeric(8, 1) not null check (kcal >= 0),
  protein numeric(7, 1) not null default 0 check (protein >= 0),
  carbs numeric(7, 1) not null default 0 check (carbs >= 0),
  fat numeric(7, 1) not null default 0 check (fat >= 0),
  created_at timestamptz not null default now()
);
create index food_logs_user_day_idx on public.food_logs (user_id, logged_on);

alter table public.foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.saved_meals enable row level security;
alter table public.saved_meal_items enable row level security;
alter table public.food_logs enable row level security;

create policy "foods: all own" on public.foods
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recipes: all own" on public.recipes
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "saved_meals: all own" on public.saved_meals
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "recipe_items: read own" on public.recipe_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "recipe_items: write own" on public.recipe_items
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid()))
  );
create policy "recipe_items: update own" on public.recipe_items
  for update to authenticated using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid()))
    and exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid()))
  );
create policy "recipe_items: delete own" on public.recipe_items
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "saved_meal_items: read own" on public.saved_meal_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_meal_items: write own" on public.saved_meal_items
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.saved_meals m where m.id = meal_id and m.user_id = (select auth.uid()))
    and (food_id is null or exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid())))
    and (recipe_id is null or exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())))
  );
create policy "saved_meal_items: delete own" on public.saved_meal_items
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "food_logs: read own" on public.food_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "food_logs: insert own" on public.food_logs
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (food_id is null or exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid())))
    and (recipe_id is null or exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())))
  );
create policy "food_logs: update own" on public.food_logs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "food_logs: delete own" on public.food_logs
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger foods_touch before update on public.foods for each row execute function public.touch_updated_at();
create trigger recipes_touch before update on public.recipes for each row execute function public.touch_updated_at();
-- FORMA – Phase 3: body weight, measurements and goals. Private per user (RLS).

alter table public.profiles
  add column target_weight numeric(5, 1) check (target_weight is null or target_weight between 20 and 400),
  add column weekly_workout_goal int check (weekly_workout_goal is null or weekly_workout_goal between 1 and 14),
  add column height_cm numeric(4, 1) check (height_cm is null or height_cm between 80 and 260);

create table public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_on date not null,
  weight numeric(5, 2) not null check (weight between 20 and 400),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, measured_on)
);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_on date not null,
  -- centimetres; body_fat in percent
  waist numeric(5, 1) check (waist is null or waist between 20 and 300),
  hips numeric(5, 1) check (hips is null or hips between 20 and 300),
  chest numeric(5, 1) check (chest is null or chest between 20 and 300),
  arm numeric(5, 1) check (arm is null or arm between 5 and 100),
  thigh numeric(5, 1) check (thigh is null or thigh between 10 and 150),
  calf numeric(5, 1) check (calf is null or calf between 10 and 100),
  neck numeric(5, 1) check (neck is null or neck between 10 and 100),
  body_fat numeric(4, 1) check (body_fat is null or body_fat between 1 and 70),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, measured_on)
);

create table public.strength_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  target_weight numeric(6, 2) not null check (target_weight > 0 and target_weight < 2000),
  target_reps int not null default 1 check (target_reps between 1 and 100),
  target_date date,
  achieved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.body_weights enable row level security;
alter table public.body_measurements enable row level security;
alter table public.strength_goals enable row level security;

create policy "body_weights: all own" on public.body_weights
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "body_measurements: all own" on public.body_measurements
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "strength_goals: read own" on public.strength_goals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "strength_goals: insert own" on public.strength_goals
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.exercises e where e.id = exercise_id and (e.user_id is null or e.user_id = (select auth.uid())))
  );
create policy "strength_goals: update own" on public.strength_goals
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "strength_goals: delete own" on public.strength_goals
  for delete to authenticated using (user_id = (select auth.uid()));
-- Cardio: time and distance per set (used for exercises with muscle_group = 'cardio').
alter table public.workout_sets
  add column duration_seconds int check (duration_seconds is null or duration_seconds between 0 and 86400),
  add column distance_m numeric(9, 1) check (distance_m is null or distance_m between 0 and 1000000);

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
      insert into public.workout_sets (user_id, workout_exercise_id, position, set_type, weight, reps, rir, duration_seconds, distance_m, completed, completed_at)
      values (
        v_uid, v_we_id, v_set_pos,
        coalesce(v_set ->> 'set_type', 'normal'),
        nullif(v_set ->> 'weight', '')::numeric,
        nullif(v_set ->> 'reps', '')::int,
        nullif(v_set ->> 'rir', '')::numeric,
        nullif(v_set ->> 'duration_seconds', '')::int,
        nullif(v_set ->> 'distance_m', '')::numeric,
        coalesce((v_set ->> 'completed')::boolean, false),
        nullif(v_set ->> 'completed_at', '')::timestamptz
      );
      v_set_pos := v_set_pos + 1;
    end loop;
  end loop;

  return p_workout_id;
end;
$$;

create or replace view public.set_history with (security_invoker = true) as
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
  s.completed,
  s.duration_seconds,
  s.distance_m
from public.workout_sets s
join public.workout_exercises we on we.id = s.workout_exercise_id
join public.workouts w on w.id = we.workout_id
where w.status = 'completed';
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

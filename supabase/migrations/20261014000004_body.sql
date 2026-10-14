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

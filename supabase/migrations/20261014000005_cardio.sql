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

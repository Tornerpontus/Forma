export type SetType = 'warmup' | 'normal' | 'failure' | 'drop'
export type WeightMode = 'total' | 'per_dumbbell' | 'bodyweight'

export interface DraftSet {
  id: string
  set_type: SetType
  weight: number | null
  reps: number | null
  rir: number | null
  completed: boolean
  completed_at: string | null
}

export interface DraftTarget {
  sets: number
  rep_min: number
  rep_max: number
}

export interface DraftExercise {
  id: string
  exercise_id: string
  notes: string
  rest_seconds: number | null
  target: DraftTarget | null
  sets: DraftSet[]
}

export interface RestTimerState {
  started_at: string
  ends_at: string
  duration: number
}

export interface WorkoutDraft {
  workout_id: string
  name: string
  notes: string
  started_at: string
  program_workout_id: string | null
  exercises: DraftExercise[]
  rest_timer: RestTimerState | null
  /** Monotonic counter used to resolve local vs. server copies after a crash. */
  version: number
  updated_at: string
}

/** One completed set, as read from the set_history view. */
export interface HistorySet {
  set_id: string
  workout_id: string
  workout_name: string
  started_at: string
  exercise_id: string
  exercise_position: number
  set_position: number
  set_type: SetType
  weight: number | null
  reps: number | null
  rir: number | null
  completed: boolean
}

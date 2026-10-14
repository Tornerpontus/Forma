export const qk = {
  profile: (uid: string) => ['profile', uid] as const,
  exercises: (uid: string) => ['exercises', uid] as const,
  exerciseNotes: (uid: string) => ['exercise-notes', uid] as const,
  programs: (uid: string) => ['programs', uid] as const,
  activeWorkout: (uid: string) => ['active-workout', uid] as const,
  workouts: (uid: string) => ['workouts', uid] as const,
  workout: (uid: string, id: string) => ['workout', uid, id] as const,
  setHistory: (uid: string) => ['set-history', uid] as const,
  shares: (uid: string) => ['shares', uid] as const,
  partner: (uid: string, ownerId: string) => ['partner', uid, ownerId] as const,
}

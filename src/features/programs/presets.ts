/** Starting points for new programs. Exercise names must exist in the global library. */
export interface PresetWorkout {
  name: string
  exercises: { name: string; sets: number; rep_min: number; rep_max: number; warmups?: number }[]
}
export interface Preset {
  id: string
  name: string
  description: string
  workouts: PresetWorkout[]
}

export const PRESETS: Preset[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Ben',
    description: 'Tre pass – bröst/axlar/triceps, rygg/biceps, ben.',
    workouts: [
      {
        name: 'Push',
        exercises: [
          { name: 'Bänkpress', sets: 3, rep_min: 6, rep_max: 10, warmups: 2 },
          { name: 'Lutande hantelpress', sets: 3, rep_min: 8, rep_max: 12 },
          { name: 'Sittande axelpress hantlar', sets: 3, rep_min: 8, rep_max: 12 },
          { name: 'Sidolyft hantlar', sets: 3, rep_min: 12, rep_max: 20 },
          { name: 'Triceps pushdown', sets: 3, rep_min: 10, rep_max: 15 },
        ],
      },
      {
        name: 'Pull',
        exercises: [
          { name: 'Latsdrag', sets: 3, rep_min: 8, rep_max: 12, warmups: 1 },
          { name: 'Sittande kabelrodd', sets: 3, rep_min: 8, rep_max: 12 },
          { name: 'Hantelrodd', sets: 3, rep_min: 8, rep_max: 12 },
          { name: 'Face pulls', sets: 3, rep_min: 12, rep_max: 20 },
          { name: 'Bicepscurl hantlar', sets: 3, rep_min: 8, rep_max: 12 },
        ],
      },
      {
        name: 'Ben',
        exercises: [
          { name: 'Knäböj', sets: 3, rep_min: 5, rep_max: 8, warmups: 2 },
          { name: 'Rumänska marklyft', sets: 3, rep_min: 8, rep_max: 10 },
          { name: 'Benpress', sets: 3, rep_min: 10, rep_max: 15 },
          { name: 'Liggande lårcurl', sets: 3, rep_min: 10, rep_max: 15 },
          { name: 'Stående vadpress', sets: 3, rep_min: 10, rep_max: 15 },
        ],
      },
    ],
  },
  {
    id: 'ul',
    name: 'Över / Under',
    description: 'Två pass – överkropp och underkropp.',
    workouts: [
      {
        name: 'Överkropp',
        exercises: [
          { name: 'Bänkpress', sets: 3, rep_min: 6, rep_max: 10, warmups: 2 },
          { name: 'Skivstångsrodd', sets: 3, rep_min: 6, rep_max: 10 },
          { name: 'Sittande axelpress hantlar', sets: 3, rep_min: 8, rep_max: 12 },
          { name: 'Latsdrag', sets: 3, rep_min: 8, rep_max: 12 },
          { name: 'Bicepscurl EZ-stång', sets: 2, rep_min: 10, rep_max: 12 },
          { name: 'Triceps overhead kabel', sets: 2, rep_min: 10, rep_max: 12 },
        ],
      },
      {
        name: 'Underkropp',
        exercises: [
          { name: 'Knäböj', sets: 3, rep_min: 5, rep_max: 8, warmups: 2 },
          { name: 'Rumänska marklyft', sets: 3, rep_min: 8, rep_max: 10 },
          { name: 'Bulgarian split squat', sets: 3, rep_min: 8, rep_max: 12 },
          { name: 'Sittande lårcurl', sets: 3, rep_min: 10, rep_max: 15 },
          { name: 'Hip thrust', sets: 3, rep_min: 8, rep_max: 12 },
          { name: 'Stående vadpress', sets: 3, rep_min: 10, rep_max: 15 },
        ],
      },
    ],
  },
  {
    id: 'fb',
    name: 'Helkropp',
    description: 'Två omväxlande helkroppspass.',
    workouts: [
      {
        name: 'Helkropp A',
        exercises: [
          { name: 'Knäböj', sets: 3, rep_min: 5, rep_max: 8, warmups: 2 },
          { name: 'Bänkpress', sets: 3, rep_min: 6, rep_max: 10 },
          { name: 'Skivstångsrodd', sets: 3, rep_min: 8, rep_max: 10 },
          { name: 'Plankan', sets: 3, rep_min: 1, rep_max: 1 },
        ],
      },
      {
        name: 'Helkropp B',
        exercises: [
          { name: 'Marklyft', sets: 3, rep_min: 4, rep_max: 6, warmups: 2 },
          { name: 'Militärpress', sets: 3, rep_min: 6, rep_max: 10 },
          { name: 'Chins', sets: 3, rep_min: 5, rep_max: 10 },
          { name: 'Gående utfall', sets: 3, rep_min: 8, rep_max: 12 },
        ],
      },
    ],
  },
]

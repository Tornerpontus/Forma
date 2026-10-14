export const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs',
  'quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'traps', 'full_body', 'cardio', 'other',
] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const MUSCLE_LABEL: Record<string, string> = {
  chest: 'Bröst',
  back: 'Rygg',
  shoulders: 'Axlar',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Underarmar',
  abs: 'Mage',
  quads: 'Framsida lår',
  hamstrings: 'Baksida lår',
  glutes: 'Säte',
  calves: 'Vader',
  adductors: 'Adduktorer',
  traps: 'Trapezius',
  full_body: 'Helkropp',
  cardio: 'Kondition',
  other: 'Övrigt',
}

export const EQUIPMENT = [
  'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'smith', 'band', 'ez_bar', 'trap_bar', 'plate', 'other',
] as const
export type Equipment = (typeof EQUIPMENT)[number]

export const EQUIPMENT_LABEL: Record<string, string> = {
  barbell: 'Skivstång',
  dumbbell: 'Hantlar',
  cable: 'Kabel',
  machine: 'Maskin',
  bodyweight: 'Kroppsvikt',
  kettlebell: 'Kettlebell',
  smith: 'Smithmaskin',
  band: 'Gummiband',
  ez_bar: 'EZ-stång',
  trap_bar: 'Trap bar',
  plate: 'Viktskiva',
  other: 'Övrigt',
}

export const SET_TYPE_LABEL: Record<string, string> = {
  warmup: 'Uppvärmning',
  normal: 'Arbetsset',
  failure: 'Till failure',
  drop: 'Dropset',
}

export const SET_TYPE_SHORT: Record<string, string> = {
  warmup: 'U',
  normal: '',
  failure: 'F',
  drop: 'D',
}

export const WEIGHT_MODE_LABEL: Record<string, string> = {
  total: 'Total vikt',
  per_dumbbell: 'Vikt per hantel',
  bodyweight: 'Kroppsvikt (+ extra vikt)',
}

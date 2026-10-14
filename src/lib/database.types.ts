
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "exercise_notes": {
                  Row: {
                    "exercise_id": string,"notes": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "exercise_id": string,"notes"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "exercise_id"?: string,"notes"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercise_notes_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "archived": boolean,"created_at": string,"equipment": string,"id": string,"is_unilateral": boolean,"muscle_group": string,"name": string,"notes": string,"secondary_muscles": (string)[],"updated_at": string,"user_id": string | null,"variation_of": string | null,"weight_mode": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"created_at"?: string,"equipment": string,"id"?: string,"is_unilateral"?: boolean,"muscle_group": string,"name": string,"notes"?: string,"secondary_muscles"?: (string)[],"updated_at"?: string,"user_id"?: string | null,"variation_of"?: string | null,"weight_mode"?: string
                  }
                  Update: {
                    "archived"?: boolean,"created_at"?: string,"equipment"?: string,"id"?: string,"is_unilateral"?: boolean,"muscle_group"?: string,"name"?: string,"notes"?: string,"secondary_muscles"?: (string)[],"updated_at"?: string,"user_id"?: string | null,"variation_of"?: string | null,"weight_mode"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercises_variation_of_fkey"
      columns: ["variation_of"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "auto_start_rest_timer": boolean,"created_at": string,"default_rest_seconds": number,"display_name": string,"id": string,"locale": string,"updated_at": string,"weight_unit": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auto_start_rest_timer"?: boolean,"created_at"?: string,"default_rest_seconds"?: number,"display_name"?: string,"id": string,"locale"?: string,"updated_at"?: string,"weight_unit"?: string
                  }
                  Update: {
                    "auto_start_rest_timer"?: boolean,"created_at"?: string,"default_rest_seconds"?: number,"display_name"?: string,"id"?: string,"locale"?: string,"updated_at"?: string,"weight_unit"?: string
                  }
                  Relationships: [
                    
                  ]
                },"program_exercises": {
                  Row: {
                    "exercise_id": string,"id": string,"notes": string,"position": number,"program_workout_id": string,"rep_max": number,"rep_min": number,"rest_seconds": number | null,"target_sets": number,"user_id": string,"warmup_sets": number
                  }
                  ComputedFields: never
                  Insert: {
                    "exercise_id": string,"id"?: string,"notes"?: string,"position"?: number,"program_workout_id": string,"rep_max"?: number,"rep_min"?: number,"rest_seconds"?: number | null,"target_sets"?: number,"user_id": string,"warmup_sets"?: number
                  }
                  Update: {
                    "exercise_id"?: string,"id"?: string,"notes"?: string,"position"?: number,"program_workout_id"?: string,"rep_max"?: number,"rep_min"?: number,"rest_seconds"?: number | null,"target_sets"?: number,"user_id"?: string,"warmup_sets"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "program_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "program_exercises_program_workout_id_fkey"
      columns: ["program_workout_id"]
isOneToOne: false
      referencedRelation: "program_workouts"
      referencedColumns: ["id"]
    }
                  ]
                },"program_workouts": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"notes": string,"position": number,"program_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"notes"?: string,"position"?: number,"program_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"notes"?: string,"position"?: number,"program_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "program_workouts_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    }
                  ]
                },"programs": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"name": string,"position": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"name": string,"position"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"name"?: string,"position"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"workout_exercises": {
                  Row: {
                    "exercise_id": string,"id": string,"notes": string,"position": number,"user_id": string,"workout_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "exercise_id": string,"id"?: string,"notes"?: string,"position"?: number,"user_id": string,"workout_id": string
                  }
                  Update: {
                    "exercise_id"?: string,"id"?: string,"notes"?: string,"position"?: number,"user_id"?: string,"workout_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_exercises_workout_id_fkey"
      columns: ["workout_id"]
isOneToOne: false
      referencedRelation: "set_history"
      referencedColumns: ["workout_id"]
    },{
      foreignKeyName: "workout_exercises_workout_id_fkey"
      columns: ["workout_id"]
isOneToOne: false
      referencedRelation: "workouts"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_sets": {
                  Row: {
                    "completed": boolean,"completed_at": string | null,"id": string,"position": number,"reps": number | null,"rir": number | null,"set_type": string,"user_id": string,"weight": number | null,"workout_exercise_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed"?: boolean,"completed_at"?: string | null,"id"?: string,"position"?: number,"reps"?: number | null,"rir"?: number | null,"set_type"?: string,"user_id": string,"weight"?: number | null,"workout_exercise_id": string
                  }
                  Update: {
                    "completed"?: boolean,"completed_at"?: string | null,"id"?: string,"position"?: number,"reps"?: number | null,"rir"?: number | null,"set_type"?: string,"user_id"?: string,"weight"?: number | null,"workout_exercise_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_sets_workout_exercise_id_fkey"
      columns: ["workout_exercise_id"]
isOneToOne: false
      referencedRelation: "set_history"
      referencedColumns: ["workout_exercise_id"]
    },{
      foreignKeyName: "workout_sets_workout_exercise_id_fkey"
      columns: ["workout_exercise_id"]
isOneToOne: false
      referencedRelation: "workout_exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"workouts": {
                  Row: {
                    "created_at": string,"draft": Json | null,"draft_version": number,"ended_at": string | null,"id": string,"name": string,"notes": string,"program_workout_id": string | null,"started_at": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"draft"?: Json | null,"draft_version"?: number,"ended_at"?: string | null,"id"?: string,"name"?: string,"notes"?: string,"program_workout_id"?: string | null,"started_at"?: string,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"draft"?: Json | null,"draft_version"?: number,"ended_at"?: string | null,"id"?: string,"name"?: string,"notes"?: string,"program_workout_id"?: string | null,"started_at"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workouts_program_workout_id_fkey"
      columns: ["program_workout_id"]
isOneToOne: false
      referencedRelation: "program_workouts"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "set_history": {
                  Row: {
                    "completed": boolean | null,"exercise_id": string | null,"exercise_position": number | null,"reps": number | null,"rir": number | null,"set_id": string | null,"set_position": number | null,"set_type": string | null,"started_at": string | null,"user_id": string | null,"weight": number | null,"workout_exercise_id": string | null,"workout_id": string | null,"workout_name": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "workout_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "save_workout":
{ Args: { "p_complete"?: boolean,"p_payload": Json,"p_workout_id": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const

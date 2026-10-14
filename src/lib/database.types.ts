
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
            "body_measurements": {
                  Row: {
                    "arm": number | null,"body_fat": number | null,"calf": number | null,"chest": number | null,"created_at": string,"hips": number | null,"id": string,"measured_on": string,"neck": number | null,"note": string,"thigh": number | null,"user_id": string,"waist": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "arm"?: number | null,"body_fat"?: number | null,"calf"?: number | null,"chest"?: number | null,"created_at"?: string,"hips"?: number | null,"id"?: string,"measured_on": string,"neck"?: number | null,"note"?: string,"thigh"?: number | null,"user_id": string,"waist"?: number | null
                  }
                  Update: {
                    "arm"?: number | null,"body_fat"?: number | null,"calf"?: number | null,"chest"?: number | null,"created_at"?: string,"hips"?: number | null,"id"?: string,"measured_on"?: string,"neck"?: number | null,"note"?: string,"thigh"?: number | null,"user_id"?: string,"waist"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"body_weights": {
                  Row: {
                    "created_at": string,"id": string,"measured_on": string,"note": string,"user_id": string,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"measured_on": string,"note"?: string,"user_id": string,"weight": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"measured_on"?: string,"note"?: string,"user_id"?: string,"weight"?: number
                  }
                  Relationships: [
                    
                  ]
                },"exercise_notes": {
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
                },"food_logs": {
                  Row: {
                    "carbs": number,"created_at": string,"fat": number,"food_id": string | null,"grams": number,"id": string,"kcal": number,"logged_on": string,"meal": string,"name": string,"protein": number,"recipe_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "carbs"?: number,"created_at"?: string,"fat"?: number,"food_id"?: string | null,"grams": number,"id"?: string,"kcal": number,"logged_on": string,"meal": string,"name": string,"protein"?: number,"recipe_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "carbs"?: number,"created_at"?: string,"fat"?: number,"food_id"?: string | null,"grams"?: number,"id"?: string,"kcal"?: number,"logged_on"?: string,"meal"?: string,"name"?: string,"protein"?: number,"recipe_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "food_logs_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "food_logs_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"foods": {
                  Row: {
                    "archived": boolean,"brand": string,"carbs": number,"created_at": string,"fat": number,"fiber": number | null,"id": string,"kcal": number,"name": string,"portion_g": number | null,"portion_name": string,"protein": number,"source": string,"source_id": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"brand"?: string,"carbs"?: number,"created_at"?: string,"fat"?: number,"fiber"?: number | null,"id"?: string,"kcal": number,"name": string,"portion_g"?: number | null,"portion_name"?: string,"protein"?: number,"source"?: string,"source_id"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "archived"?: boolean,"brand"?: string,"carbs"?: number,"created_at"?: string,"fat"?: number,"fiber"?: number | null,"id"?: string,"kcal"?: number,"name"?: string,"portion_g"?: number | null,"portion_name"?: string,"protein"?: number,"source"?: string,"source_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "auto_start_rest_timer": boolean,"carbs_target": number | null,"created_at": string,"default_rest_seconds": number,"display_name": string,"fat_target": number | null,"height_cm": number | null,"id": string,"kcal_target": number | null,"locale": string,"protein_target": number | null,"show_rir": boolean,"target_weight": number | null,"updated_at": string,"weekly_workout_goal": number | null,"weight_unit": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auto_start_rest_timer"?: boolean,"carbs_target"?: number | null,"created_at"?: string,"default_rest_seconds"?: number,"display_name"?: string,"fat_target"?: number | null,"height_cm"?: number | null,"id": string,"kcal_target"?: number | null,"locale"?: string,"protein_target"?: number | null,"show_rir"?: boolean,"target_weight"?: number | null,"updated_at"?: string,"weekly_workout_goal"?: number | null,"weight_unit"?: string
                  }
                  Update: {
                    "auto_start_rest_timer"?: boolean,"carbs_target"?: number | null,"created_at"?: string,"default_rest_seconds"?: number,"display_name"?: string,"fat_target"?: number | null,"height_cm"?: number | null,"id"?: string,"kcal_target"?: number | null,"locale"?: string,"protein_target"?: number | null,"show_rir"?: boolean,"target_weight"?: number | null,"updated_at"?: string,"weekly_workout_goal"?: number | null,"weight_unit"?: string
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
                },"recipe_items": {
                  Row: {
                    "food_id": string,"grams": number,"id": string,"position": number,"recipe_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "food_id": string,"grams": number,"id"?: string,"position"?: number,"recipe_id": string,"user_id": string
                  }
                  Update: {
                    "food_id"?: string,"grams"?: number,"id"?: string,"position"?: number,"recipe_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_items_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_items_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipes": {
                  Row: {
                    "cooked_weight_g": number | null,"created_at": string,"id": string,"name": string,"notes": string,"servings": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cooked_weight_g"?: number | null,"created_at"?: string,"id"?: string,"name": string,"notes"?: string,"servings"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "cooked_weight_g"?: number | null,"created_at"?: string,"id"?: string,"name"?: string,"notes"?: string,"servings"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"saved_meal_items": {
                  Row: {
                    "food_id": string | null,"grams": number,"id": string,"meal_id": string,"position": number,"recipe_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "food_id"?: string | null,"grams": number,"id"?: string,"meal_id": string,"position"?: number,"recipe_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "food_id"?: string | null,"grams"?: number,"id"?: string,"meal_id"?: string,"position"?: number,"recipe_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_meal_items_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_meal_items_meal_id_fkey"
      columns: ["meal_id"]
isOneToOne: false
      referencedRelation: "saved_meals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_meal_items_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_meals": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"share_invites": {
                  Row: {
                    "code": string,"created_at": string,"expires_at": string,"owner_id": string,"used_at": string | null,"used_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"expires_at"?: string,"owner_id": string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"expires_at"?: string,"owner_id"?: string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"strength_goals": {
                  Row: {
                    "achieved_at": string | null,"created_at": string,"exercise_id": string,"id": string,"target_date": string | null,"target_reps": number,"target_weight": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "achieved_at"?: string | null,"created_at"?: string,"exercise_id": string,"id"?: string,"target_date"?: string | null,"target_reps"?: number,"target_weight": number,"user_id": string
                  }
                  Update: {
                    "achieved_at"?: string | null,"created_at"?: string,"exercise_id"?: string,"id"?: string,"target_date"?: string | null,"target_reps"?: number,"target_weight"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "strength_goals_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"training_shares": {
                  Row: {
                    "created_at": string,"owner_id": string,"viewer_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"owner_id": string,"viewer_id": string
                  }
                  Update: {
                    "created_at"?: string,"owner_id"?: string,"viewer_id"?: string
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
                    "completed": boolean,"completed_at": string | null,"distance_m": number | null,"duration_seconds": number | null,"id": string,"position": number,"reps": number | null,"rir": number | null,"set_type": string,"user_id": string,"weight": number | null,"workout_exercise_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed"?: boolean,"completed_at"?: string | null,"distance_m"?: number | null,"duration_seconds"?: number | null,"id"?: string,"position"?: number,"reps"?: number | null,"rir"?: number | null,"set_type"?: string,"user_id": string,"weight"?: number | null,"workout_exercise_id": string
                  }
                  Update: {
                    "completed"?: boolean,"completed_at"?: string | null,"distance_m"?: number | null,"duration_seconds"?: number | null,"id"?: string,"position"?: number,"reps"?: number | null,"rir"?: number | null,"set_type"?: string,"user_id"?: string,"weight"?: number | null,"workout_exercise_id"?: string
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
                    "completed": boolean | null,"distance_m": number | null,"duration_seconds": number | null,"exercise_id": string | null,"exercise_position": number | null,"reps": number | null,"rir": number | null,"set_id": string | null,"set_position": number | null,"set_type": string | null,"started_at": string | null,"user_id": string | null,"weight": number | null,"workout_exercise_id": string | null,"workout_id": string | null,"workout_name": string | null
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
            "accept_share_invite":
{ Args: { "p_code": string }; Returns: string
                           },
"can_view_training":
{ Args: { "p_owner": string }; Returns: boolean
                           },
"create_share_invite":
{ Args: Record<PropertyKey, never>; Returns: {
              "code": string,"expires_at": string
            }[]
                           },
"list_training_shares":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,"direction": string,"other_name": string,"owner_id": string,"viewer_id": string
            }[]
                           },
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

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string;
        };
        Update: {
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      coaches: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          experience: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          experience?: number;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          name?: string;
          experience?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          coach_id: string;
          name: string;
          level: string;
          goal: string | null;
          start_date: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          name: string;
          level: string;
          goal?: string | null;
          start_date: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          coach_id?: string;
          name?: string;
          level?: string;
          goal?: string | null;
          start_date?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          coach_id: string;
          title: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          title: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          coach_id?: string;
          title?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_assignments: {
        Row: {
          id: string;
          workout_id: string;
          student_id: string;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          student_id: string;
          assigned_at?: string;
        };
        Update: {
          workout_id?: string;
          student_id?: string;
          assigned_at?: string;
        };
        Relationships: [];
      };
      progress: {
        Row: {
          id: string;
          student_id: string;
          pullups: number;
          pushups: number;
          muscle_ups: number;
          handstand_seconds: number;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          pullups?: number;
          pushups?: number;
          muscle_ups?: number;
          handstand_seconds?: number;
          date: string;
          created_at?: string;
        };
        Update: {
          student_id?: string;
          pullups?: number;
          pushups?: number;
          muscle_ups?: number;
          handstand_seconds?: number;
          date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          student_id: string;
          amount: number;
          status: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          amount: number;
          status?: string;
          date: string;
          created_at?: string;
        };
        Update: {
          student_id?: string;
          amount?: number;
          status?: string;
          date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      student_goals: {
        Row: {
          id: string;
          student_id: string;
          metric: string;
          target_value: number;
          target_date: string;
          status: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          metric: string;
          target_value: number;
          target_date: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          student_id?: string;
          metric?: string;
          target_value?: number;
          target_date?: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      student_skills: {
        Row: {
          id: string;
          student_id: string;
          skill_slug: string;
          current_stage: number;
          target_stage: number;
          status: string;
          notes: string | null;
          started_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          skill_slug: string;
          current_stage?: number;
          target_stage?: number;
          status?: string;
          notes?: string | null;
          started_at?: string;
          updated_at?: string;
        };
        Update: {
          student_id?: string;
          skill_slug?: string;
          current_stage?: number;
          target_stage?: number;
          status?: string;
          notes?: string | null;
          started_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      skill_progress_logs: {
        Row: {
          id: string;
          student_skill_id: string;
          stage_index: number;
          readiness_score: number | null;
          passed: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_skill_id: string;
          stage_index: number;
          readiness_score?: number | null;
          passed?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          student_skill_id?: string;
          stage_index?: number;
          readiness_score?: number | null;
          passed?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      dashboard_student_summary: {
        Args: {
          p_student_ids: string[];
          p_start_date?: string | null;
          p_end_date?: string | null;
        };
        Returns: {
          student_id: string;
          records: number;
          latest_date: string | null;
          best_pullups: number;
          paid_for_student: number;
        }[];
      };
      dashboard_trend_metrics: {
        Args: {
          p_student_ids: string[];
          p_reference_date?: string;
        };
        Returns: {
          sort_order: number;
          label: string;
          current_value: number;
          previous_value: number;
          delta_percentage: number | null;
          format: string;
        }[];
      };
      dashboard_summary_stats: {
        Args: {
          p_student_ids: string[];
          p_start_date?: string | null;
          p_end_date?: string | null;
        };
        Returns: {
          progress_count: number;
          paid_revenue: number;
          pending_revenue: number;
          best_pullups: number;
          best_pushups: number;
          best_muscle_ups: number;
          best_handstand: number;
          coverage_count: number;
        }[];
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
}

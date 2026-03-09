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
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}

import { Database } from "@/types/database";

export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Workout = Database["public"]["Tables"]["workouts"]["Row"];
export type WorkoutAssignment = Database["public"]["Tables"]["workout_assignments"]["Row"];
export type ProgressEntry = Database["public"]["Tables"]["progress"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];

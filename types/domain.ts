import { Database } from "@/types/database";

export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Workout = Database["public"]["Tables"]["workouts"]["Row"];
export type WorkoutAssignment = Database["public"]["Tables"]["workout_assignments"]["Row"];
export type ProgressEntry = Database["public"]["Tables"]["progress"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type StudentGoal = Database["public"]["Tables"]["student_goals"]["Row"];
export type StudentSkill = Database["public"]["Tables"]["student_skills"]["Row"];
export type SkillProgressLog = Database["public"]["Tables"]["skill_progress_logs"]["Row"];

export type StudentStatus = "active" | "inactive" | "archived";
export type GoalMetric = "pullups" | "pushups" | "muscle_ups" | "handstand_seconds";
export type GoalStatus = "active" | "completed" | "archived";
export type SkillSlug = "handstand" | "muscle_up" | "front_lever" | "planche" | "back_lever" | "l_sit";
export type StudentSkillStatus = "active" | "completed" | "archived";

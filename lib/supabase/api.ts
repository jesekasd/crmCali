import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCoachContext() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: coach, error: coachError } = await supabase
    .from("coaches")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (coachError || !coach) {
    return { error: NextResponse.json({ error: "Coach profile not found" }, { status: 403 }) };
  }

  return { supabase, user, coachId: coach.id };
}

export async function getCoachStudents(
  supabase: any,
  coachId: string,
  options?: { includeArchived?: boolean }
) {
  let query = supabase.from("students").select("*").eq("coach_id", coachId).order("name", { ascending: true });

  if (!options?.includeArchived) {
    query = query.neq("status", "archived");
  }

  const { data, error } = await query;

  if (error) {
    return [];
  }

  return data ?? [];
}

export async function getCoachStudentIds(supabase: any, coachId: string, options?: { includeArchived?: boolean }) {
  const students = await getCoachStudents(supabase, coachId, options);
  return students.map((student: { id: string }) => student.id);
}

export async function getOwnedStudent(supabase: any, coachId: string, studentId: string) {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getOwnedOperativeStudent(supabase: any, coachId: string, studentId: string) {
  const student = await getOwnedStudent(supabase, coachId, studentId);

  if (!student || student.status === "archived") {
    return null;
  }

  return student;
}

export async function coachOwnsStudent(supabase: any, coachId: string, studentId: string) {
  const student = await getOwnedStudent(supabase, coachId, studentId);
  return Boolean(student);
}

export async function getOwnedWorkout(supabase: any, coachId: string, workoutId: string) {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", workoutId)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getOwnedPayment(supabase: any, coachId: string, paymentId: string) {
  const { data: payment, error } = await supabase.from("payments").select("*").eq("id", paymentId).maybeSingle();

  if (error || !payment) {
    return null;
  }

  const student = await getOwnedStudent(supabase, coachId, payment.student_id);
  if (!student) {
    return null;
  }

  return payment;
}

export async function getOwnedGoal(supabase: any, coachId: string, goalId: string) {
  const { data: goal, error } = await supabase.from("student_goals").select("*").eq("id", goalId).maybeSingle();

  if (error || !goal) {
    return null;
  }

  const student = await getOwnedStudent(supabase, coachId, goal.student_id);
  if (!student) {
    return null;
  }

  return goal;
}

export async function getOwnedStudentSkill(supabase: any, coachId: string, studentSkillId: string) {
  const { data: studentSkill, error } = await supabase
    .from("student_skills")
    .select("*")
    .eq("id", studentSkillId)
    .maybeSingle();

  if (error || !studentSkill) {
    return null;
  }

  const student = await getOwnedStudent(supabase, coachId, studentSkill.student_id);
  if (!student) {
    return null;
  }

  return studentSkill;
}

export async function getOwnedOperativeStudentSkill(supabase: any, coachId: string, studentSkillId: string) {
  const studentSkill = await getOwnedStudentSkill(supabase, coachId, studentSkillId);

  if (!studentSkill) {
    return null;
  }

  const student = await getOwnedOperativeStudent(supabase, coachId, studentSkill.student_id);
  if (!student) {
    return null;
  }

  return studentSkill;
}

export async function getOwnedWorkoutAssignment(supabase: any, coachId: string, assignmentId: string) {
  const { data: assignment, error } = await supabase
    .from("workout_assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle();

  if (error || !assignment) {
    return null;
  }

  const [student, workout] = await Promise.all([
    getOwnedStudent(supabase, coachId, assignment.student_id),
    getOwnedWorkout(supabase, coachId, assignment.workout_id)
  ]);

  if (!student || !workout) {
    return null;
  }

  return assignment;
}

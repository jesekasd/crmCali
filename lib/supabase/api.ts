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

export async function coachOwnsStudent(supabase: any, coachId: string, studentId: string) {
  const { data: student, error } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("coach_id", coachId)
    .maybeSingle();

  return !error && Boolean(student);
}

export async function getOwnedGoal(supabase: any, coachId: string, goalId: string) {
  const { data: goal, error } = await supabase.from("student_goals").select("*").eq("id", goalId).maybeSingle();

  if (error || !goal) {
    return null;
  }

  const isOwner = await coachOwnsStudent(supabase, coachId, goal.student_id);
  if (!isOwner) {
    return null;
  }

  return goal;
}

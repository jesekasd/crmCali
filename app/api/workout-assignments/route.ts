import { NextRequest, NextResponse } from "next/server";
import { getCoachContext } from "@/lib/supabase/api";

export async function POST(request: NextRequest) {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const body = (await request.json()) as { workoutId?: string; studentId?: string };
  if (!body.workoutId || !body.studentId) {
    return NextResponse.json({ error: "workoutId and studentId are required" }, { status: 400 });
  }

  const { supabase, coachId } = context;

  const [{ data: workout }, { data: student }] = await Promise.all([
    supabase.from("workouts").select("id").eq("id", body.workoutId).eq("coach_id", coachId).maybeSingle(),
    supabase.from("students").select("id").eq("id", body.studentId).eq("coach_id", coachId).maybeSingle()
  ]);

  if (!workout || !student) {
    return NextResponse.json({ error: "workout or student not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("workout_assignments")
    .insert({
      workout_id: body.workoutId,
      student_id: body.studentId
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const assignmentId = request.nextUrl.searchParams.get("id");
  if (!assignmentId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { supabase, coachId } = context;
  const { data: assignment } = await supabase
    .from("workout_assignments")
    .select("id, workout_id, student_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ error: "assignment not found" }, { status: 404 });
  }

  const [{ data: workout }, { data: student }] = await Promise.all([
    supabase.from("workouts").select("id").eq("id", assignment.workout_id).eq("coach_id", coachId).maybeSingle(),
    supabase.from("students").select("id").eq("id", assignment.student_id).eq("coach_id", coachId).maybeSingle()
  ]);

  if (!workout || !student) {
    return NextResponse.json({ error: "assignment not found" }, { status: 404 });
  }

  const { error } = await supabase.from("workout_assignments").delete().eq("id", assignmentId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: assignmentId });
}

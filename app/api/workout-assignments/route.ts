import { NextRequest, NextResponse } from "next/server";
import { getCoachContext, getOwnedOperativeStudent, getOwnedWorkout, getOwnedWorkoutAssignment } from "@/lib/supabase/api";

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
  const [workout, student] = await Promise.all([
    getOwnedWorkout(supabase, coachId, body.workoutId),
    getOwnedOperativeStudent(supabase, coachId, body.studentId)
  ]);

  if (!workout || !student) {
    return NextResponse.json({ error: "workout or student not found, or student is archived" }, { status: 404 });
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
  const assignment = await getOwnedWorkoutAssignment(supabase, coachId, assignmentId);
  if (!assignment) {
    return NextResponse.json({ error: "assignment not found" }, { status: 404 });
  }

  const { error } = await supabase.from("workout_assignments").delete().eq("id", assignmentId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: assignmentId });
}

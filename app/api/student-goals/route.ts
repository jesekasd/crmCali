import { NextRequest, NextResponse } from "next/server";
import { coachOwnsStudent, getCoachContext } from "@/lib/supabase/api";

export async function GET() {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const { data: students } = await supabase.from("students").select("id").eq("coach_id", coachId);
  const studentIds = (students ?? []).map((student: { id: string }) => student.id);

  if (studentIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("student_goals")
    .select("*")
    .in("student_id", studentIds)
    .order("target_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const body = (await request.json()) as {
    studentId?: string;
    metric?: string;
    targetValue?: number;
    targetDate?: string;
    notes?: string;
  };

  if (!body.studentId || !body.metric || body.targetValue === undefined || !body.targetDate) {
    return NextResponse.json({ error: "studentId, metric, targetValue and targetDate are required" }, { status: 400 });
  }

  const { supabase, coachId } = context;
  const isOwner = await coachOwnsStudent(supabase, coachId, body.studentId);
  if (!isOwner) {
    return NextResponse.json({ error: "student not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("student_goals")
    .insert({
      student_id: body.studentId,
      metric: body.metric,
      target_value: body.targetValue,
      target_date: body.targetDate,
      notes: body.notes ?? null
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

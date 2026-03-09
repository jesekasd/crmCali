import { NextRequest, NextResponse } from "next/server";
import { getCoachContext, getCoachStudentIds, getOwnedOperativeStudent } from "@/lib/supabase/api";

export async function GET() {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const studentIds = await getCoachStudentIds(supabase, coachId);

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
  const student = await getOwnedOperativeStudent(supabase, coachId, body.studentId);
  if (!student) {
    return NextResponse.json({ error: "student not found or archived" }, { status: 404 });
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

import { NextRequest, NextResponse } from "next/server";
import { getCoachContext } from "@/lib/supabase/api";

export async function GET() {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const { data: students } = await supabase.from("students").select("id").eq("coach_id", coachId);
  const studentIds = (students ?? []).map((student) => student.id);

  if (studentIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("progress")
    .select("*")
    .in("student_id", studentIds)
    .order("date", { ascending: false });

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
    pullups?: number;
    pushups?: number;
    muscle_ups?: number;
    handstand_seconds?: number;
    date?: string;
  };

  if (!body.studentId || !body.date) {
    return NextResponse.json({ error: "studentId and date are required" }, { status: 400 });
  }

  const { supabase, coachId } = context;
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", body.studentId)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ error: "student not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("progress")
    .insert({
      student_id: body.studentId,
      pullups: body.pullups ?? 0,
      pushups: body.pushups ?? 0,
      muscle_ups: body.muscle_ups ?? 0,
      handstand_seconds: body.handstand_seconds ?? 0,
      date: body.date
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

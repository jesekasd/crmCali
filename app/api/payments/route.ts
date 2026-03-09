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
    .from("payments")
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
    amount?: number;
    status?: string;
    date?: string;
  };

  if (!body.studentId || body.amount === undefined || !body.date) {
    return NextResponse.json({ error: "studentId, amount and date are required" }, { status: 400 });
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
    .from("payments")
    .insert({
      student_id: body.studentId,
      amount: body.amount,
      status: body.status ?? "pending",
      date: body.date
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const body = (await request.json()) as { id?: string; status?: string };

  if (!body.id || !body.status) {
    return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  }

  const { supabase, coachId } = context;
  const { data: payment } = await supabase.from("payments").select("id, student_id").eq("id", body.id).maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "payment not found" }, { status: 404 });
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", payment.student_id)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ error: "payment not found" }, { status: 404 });
  }

  const { data, error } = await supabase.from("payments").update({ status: body.status }).eq("id", body.id).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

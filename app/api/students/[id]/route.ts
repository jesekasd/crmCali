import { NextRequest, NextResponse } from "next/server";
import { getCoachContext, getOwnedStudent } from "@/lib/supabase/api";

type Params = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const student = await getOwnedStudent(supabase, coachId, params.id);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    level?: string;
    goal?: string | null;
    start_date?: string;
    status?: string;
  };

  const { data, error } = await supabase
    .from("students")
    .update({
      name: body.name,
      level: body.level,
      goal: body.goal,
      start_date: body.start_date,
      status: body.status
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const student = await getOwnedStudent(supabase, coachId, params.id);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const { error } = await supabase.from("students").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

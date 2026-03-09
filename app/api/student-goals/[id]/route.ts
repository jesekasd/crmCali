import { NextRequest, NextResponse } from "next/server";
import { getCoachContext, getOwnedGoal } from "@/lib/supabase/api";

type Params = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const goal = await getOwnedGoal(supabase, coachId, params.id);
  if (!goal) {
    return NextResponse.json({ error: "goal not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    status?: string;
    targetValue?: number;
    targetDate?: string;
    notes?: string | null;
  };

  const { data, error } = await supabase
    .from("student_goals")
    .update({
      status: body.status,
      target_value: body.targetValue,
      target_date: body.targetDate,
      notes: body.notes
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
  const goal = await getOwnedGoal(supabase, coachId, params.id);
  if (!goal) {
    return NextResponse.json({ error: "goal not found" }, { status: 404 });
  }

  const { error } = await supabase.from("student_goals").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

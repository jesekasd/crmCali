import { NextRequest, NextResponse } from "next/server";
import { getCoachContext } from "@/lib/supabase/api";

export async function GET() {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });

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

  const body = await request.json();
  const { name, level, goal, start_date, status } = body as {
    name?: string;
    level?: string;
    goal?: string;
    start_date?: string;
    status?: string;
  };

  if (!name || !level || !start_date) {
    return NextResponse.json({ error: "name, level and start_date are required" }, { status: 400 });
  }

  const { supabase, coachId } = context;
  const { data, error } = await supabase
    .from("students")
    .insert({
      coach_id: coachId,
      name,
      level,
      goal: goal ?? null,
      start_date,
      status: status ?? "active"
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

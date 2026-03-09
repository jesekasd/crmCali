import { NextRequest, NextResponse } from "next/server";
import { getCoachContext } from "@/lib/supabase/api";

export async function GET() {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const { data, error } = await supabase
    .from("workouts")
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

  const body = (await request.json()) as { title?: string; description?: string };
  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { supabase, coachId } = context;
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      coach_id: coachId,
      title: body.title,
      description: body.description ?? null
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

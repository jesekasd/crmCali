import { NextRequest, NextResponse } from "next/server";
import { clampSkillStageIndex, getMaxSkillStageIndex, isSkillSlug } from "@/lib/skills/catalog";
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
    .from("student_skills")
    .select("*")
    .in("student_id", studentIds)
    .order("updated_at", { ascending: false });

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
    skillSlug?: string;
    targetStage?: number;
    notes?: string;
  };

  if (!body.studentId || !body.skillSlug) {
    return NextResponse.json({ error: "studentId and skillSlug are required" }, { status: 400 });
  }

  if (!isSkillSlug(body.skillSlug)) {
    return NextResponse.json({ error: "invalid skillSlug" }, { status: 400 });
  }

  const { supabase, coachId } = context;
  const student = await getOwnedOperativeStudent(supabase, coachId, body.studentId);

  if (!student) {
    return NextResponse.json({ error: "student not found or archived" }, { status: 404 });
  }

  const { data: existingAssignment } = await supabase
    .from("student_skills")
    .select("id")
    .eq("student_id", body.studentId)
    .eq("skill_slug", body.skillSlug)
    .maybeSingle();

  if (existingAssignment) {
    return NextResponse.json({ error: "skill already assigned to this student" }, { status: 409 });
  }

  const maxStageIndex = getMaxSkillStageIndex(body.skillSlug);
  const targetStage =
    body.targetStage === undefined ? maxStageIndex : clampSkillStageIndex(body.skillSlug, body.targetStage);

  const { data, error } = await supabase
    .from("student_skills")
    .insert({
      student_id: body.studentId,
      skill_slug: body.skillSlug,
      current_stage: 0,
      target_stage: targetStage,
      notes: body.notes?.trim() || null,
      updated_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

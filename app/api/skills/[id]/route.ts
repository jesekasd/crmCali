import { NextRequest, NextResponse } from "next/server";
import { clampSkillStageIndex, isStudentSkillStatus, resolveStudentSkillStatus } from "@/lib/skills/catalog";
import { getCoachContext, getOwnedStudentSkill } from "@/lib/supabase/api";

type Params = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const assignment = await getOwnedStudentSkill(supabase, coachId, params.id);

  if (!assignment) {
    return NextResponse.json({ error: "skill assignment not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    currentStage?: number;
    targetStage?: number;
    status?: string;
    notes?: string | null;
  };

  if (body.status && !isStudentSkillStatus(body.status)) {
    return NextResponse.json({ error: "invalid skill status" }, { status: 400 });
  }

  const skillSlug = assignment.skill_slug;
  const currentStage =
    body.currentStage === undefined ? assignment.current_stage : clampSkillStageIndex(skillSlug, body.currentStage);
  const targetStage =
    body.targetStage === undefined ? assignment.target_stage : clampSkillStageIndex(skillSlug, body.targetStage);
  const baseStatus = (body.status ?? assignment.status) as ReturnType<typeof resolveStudentSkillStatus>;
  const status = resolveStudentSkillStatus(skillSlug, currentStage, baseStatus);

  const { data, error } = await supabase
    .from("student_skills")
    .update({
      current_stage: currentStage,
      target_stage: targetStage,
      status,
      notes: body.notes === undefined ? assignment.notes : body.notes,
      updated_at: new Date().toISOString()
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
  const assignment = await getOwnedStudentSkill(supabase, coachId, params.id);

  if (!assignment) {
    return NextResponse.json({ error: "skill assignment not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("student_skills")
    .update({
      status: "archived",
      updated_at: new Date().toISOString()
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

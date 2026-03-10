import { NextRequest, NextResponse } from "next/server";
import { clampSkillStageIndex, resolveStudentSkillStatus } from "@/lib/skills/catalog";
import { getCoachContext, getOwnedOperativeStudentSkill } from "@/lib/supabase/api";

export async function POST(request: NextRequest) {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const body = (await request.json()) as {
    studentSkillId?: string;
    stageIndex?: number;
    readinessScore?: number;
    passed?: boolean;
    notes?: string;
  };

  if (!body.studentSkillId || body.stageIndex === undefined) {
    return NextResponse.json({ error: "studentSkillId and stageIndex are required" }, { status: 400 });
  }

  const readinessScore =
    body.readinessScore === undefined || body.readinessScore === null ? null : Math.floor(body.readinessScore);

  if (readinessScore !== null && (readinessScore < 0 || readinessScore > 100)) {
    return NextResponse.json({ error: "readinessScore must be between 0 and 100" }, { status: 400 });
  }

  const { supabase, coachId } = context;
  const assignment = await getOwnedOperativeStudentSkill(supabase, coachId, body.studentSkillId);

  if (!assignment) {
    return NextResponse.json({ error: "skill assignment not found or student archived" }, { status: 404 });
  }

  if (assignment.status === "archived") {
    return NextResponse.json({ error: "skill assignment is archived" }, { status: 400 });
  }

  const normalizedStageIndex = clampSkillStageIndex(assignment.skill_slug, body.stageIndex);

  if (normalizedStageIndex !== Math.floor(body.stageIndex)) {
    return NextResponse.json({ error: "stageIndex is outside the valid range for this skill" }, { status: 400 });
  }

  const { data: log, error: logError } = await supabase
    .from("skill_progress_logs")
    .insert({
      student_skill_id: assignment.id,
      stage_index: normalizedStageIndex,
      readiness_score: readinessScore,
      passed: body.passed ?? false,
      notes: body.notes?.trim() || null
    })
    .select("*")
    .single();

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 400 });
  }

  const nextCurrentStage = body.passed ? Math.max(assignment.current_stage, normalizedStageIndex) : assignment.current_stage;
  const nextStatus = resolveStudentSkillStatus(assignment.skill_slug, nextCurrentStage, assignment.status);

  const { data: updatedAssignment, error: assignmentError } = await supabase
    .from("student_skills")
    .update({
      current_stage: nextCurrentStage,
      status: nextStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", assignment.id)
    .select("*")
    .single();

  if (assignmentError) {
    return NextResponse.json({ error: assignmentError.message }, { status: 400 });
  }

  return NextResponse.json({ log, assignment: updatedAssignment }, { status: 201 });
}

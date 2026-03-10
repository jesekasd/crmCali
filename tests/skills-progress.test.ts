import test from "node:test";
import assert from "node:assert/strict";
import { clampSkillStageIndex, getSkillDefinition, getSkillStage, resolveStudentSkillStatus } from "@/lib/skills/catalog";
import { buildStudentSkillSnapshots } from "@/lib/skills/progress";
import { SkillProgressLog, Student, StudentSkill } from "@/types/domain";

const student: Student = {
  id: "student-1",
  coach_id: "coach-1",
  name: "Alicia",
  level: "advanced",
  goal: "Handstand libre",
  start_date: "2026-01-01",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z"
};

test("clampSkillStageIndex keeps values within the handstand roadmap", () => {
  assert.equal(clampSkillStageIndex("handstand", -3), 0);
  assert.equal(clampSkillStageIndex("handstand", 2), 2);
  assert.equal(clampSkillStageIndex("handstand", 99), getSkillDefinition("handstand").stages.length - 1);
});

test("resolveStudentSkillStatus auto-completes when the last stage is reached", () => {
  const finalIndex = getSkillDefinition("front_lever").stages.length - 1;
  assert.equal(resolveStudentSkillStatus("front_lever", finalIndex, "active"), "completed");
  assert.equal(resolveStudentSkillStatus("front_lever", 1, "active"), "active");
  assert.equal(resolveStudentSkillStatus("front_lever", finalIndex, "archived"), "archived");
});

test("getSkillStage resolves the descriptive stage data", () => {
  const stage = getSkillStage("muscle_up", 2);
  assert.equal(stage.label, "Chest to Bar");
  assert.match(stage.benchmark, /3 reps/i);
});

test("buildStudentSkillSnapshots maps assignment progress and latest log metadata", () => {
  const assignment: StudentSkill = {
    id: "skill-1",
    student_id: student.id,
    skill_slug: "handstand",
    current_stage: 2,
    target_stage: 4,
    status: "active",
    notes: "Enfocar línea y apertura de hombro",
    started_at: "2026-03-01",
    updated_at: "2026-03-09T10:00:00.000Z"
  };

  const logs: SkillProgressLog[] = [
    {
      id: "log-1",
      student_skill_id: assignment.id,
      stage_index: 2,
      readiness_score: 82,
      passed: true,
      notes: "Mejor control en taps",
      created_at: "2026-03-09T09:00:00.000Z"
    },
    {
      id: "log-2",
      student_skill_id: assignment.id,
      stage_index: 1,
      readiness_score: 65,
      passed: false,
      notes: "Falla la línea al salir",
      created_at: "2026-03-05T09:00:00.000Z"
    }
  ];

  const [snapshot] = buildStudentSkillSnapshots([assignment], logs, { [student.id]: student });

  assert.equal(snapshot.studentName, "Alicia");
  assert.equal(snapshot.skillLabel, "Handstand");
  assert.equal(snapshot.currentStageLabel, "Shoulder Taps");
  assert.equal(snapshot.targetStageLabel, "Freestanding 10s");
  assert.equal(snapshot.nextStageLabel, "Freestanding Attempts");
  assert.equal(snapshot.lastReadinessScore, 82);
  assert.equal(snapshot.lastPassed, true);
  assert.equal(snapshot.totalLogs, 2);
  assert.equal(snapshot.stages[2]?.isCurrent, true);
  assert.equal(snapshot.stages[4]?.isTarget, true);
});

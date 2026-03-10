import { getNextSkillStage, getSkillCompletionRatio, getSkillDefinition, getSkillStage, resolveStudentSkillStatus } from "@/lib/skills/catalog";
import { SkillProgressLog, SkillSlug, Student, StudentSkill, StudentSkillStatus } from "@/types/domain";

export interface SkillStageView {
  index: number;
  label: string;
  benchmark: string;
  isCurrent: boolean;
  isTarget: boolean;
  isCompleted: boolean;
}

export interface StudentSkillSnapshot {
  id: string;
  studentId: string;
  studentName: string;
  skillSlug: SkillSlug;
  skillLabel: string;
  skillCategory: string;
  skillDescription: string;
  status: StudentSkillStatus;
  currentStage: number;
  currentStageLabel: string;
  currentBenchmark: string;
  targetStage: number;
  targetStageLabel: string;
  nextStageLabel: string | null;
  progressRatio: number;
  notes: string | null;
  startedAt: string;
  updatedAt: string;
  totalLogs: number;
  lastLogAt: string | null;
  lastReadinessScore: number | null;
  lastPassed: boolean | null;
  lastLogNotes: string | null;
  stages: SkillStageView[];
}

export function buildStudentSkillSnapshots(
  assignments: StudentSkill[],
  logs: SkillProgressLog[],
  studentsById: Record<string, Student>
) {
  const logsBySkillId = new Map<string, SkillProgressLog[]>();

  for (const log of logs) {
    const currentLogs = logsBySkillId.get(log.student_skill_id) ?? [];
    currentLogs.push(log);
    logsBySkillId.set(log.student_skill_id, currentLogs);
  }

  return assignments
    .map((assignment) => {
      const skillSlug = assignment.skill_slug as SkillSlug;
      const definition = getSkillDefinition(skillSlug);
      const student = studentsById[assignment.student_id];
      const assignmentLogs = (logsBySkillId.get(assignment.id) ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const currentStage = assignment.current_stage;
      const targetStage = assignment.target_stage;
      const currentStageDefinition = getSkillStage(skillSlug, currentStage);
      const targetStageDefinition = getSkillStage(skillSlug, targetStage);
      const nextStage = getNextSkillStage(skillSlug, currentStage);
      const latestLog = assignmentLogs[0];
      const status = resolveStudentSkillStatus(skillSlug, currentStage, assignment.status as StudentSkillStatus);

      return {
        id: assignment.id,
        studentId: assignment.student_id,
        studentName: student?.name ?? "Alumno desconocido",
        skillSlug,
        skillLabel: definition.label,
        skillCategory: definition.category,
        skillDescription: definition.shortDescription,
        status,
        currentStage,
        currentStageLabel: currentStageDefinition.label,
        currentBenchmark: currentStageDefinition.benchmark,
        targetStage,
        targetStageLabel: targetStageDefinition.label,
        nextStageLabel: nextStage?.label ?? null,
        progressRatio: getSkillCompletionRatio(skillSlug, currentStage),
        notes: assignment.notes,
        startedAt: assignment.started_at,
        updatedAt: assignment.updated_at,
        totalLogs: assignmentLogs.length,
        lastLogAt: latestLog?.created_at ?? null,
        lastReadinessScore: latestLog?.readiness_score ?? null,
        lastPassed: latestLog?.passed ?? null,
        lastLogNotes: latestLog?.notes ?? null,
        stages: definition.stages.map((stage) => ({
          index: stage.index,
          label: stage.label,
          benchmark: stage.benchmark,
          isCurrent: stage.index === currentStage,
          isTarget: stage.index === targetStage,
          isCompleted: stage.index <= currentStage
        }))
      } satisfies StudentSkillSnapshot;
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

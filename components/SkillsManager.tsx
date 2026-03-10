"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Flag, Target, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/client/api";
import { SKILL_CATALOG, getMaxSkillStageIndex, getSkillDefinition } from "@/lib/skills/catalog";
import { StudentSkillSnapshot } from "@/lib/skills/progress";
import { SkillProgressLog, SkillSlug, Student, StudentSkill } from "@/types/domain";

interface SkillsManagerProps {
  students: Student[];
  assignments: StudentSkill[];
  logs: SkillProgressLog[];
  snapshots: StudentSkillSnapshot[];
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "Sin registros";
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function SkillsManager({ students, assignments, logs, snapshots }: SkillsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initialOperativeAssignment = assignments.find((assignment) => assignment.status !== "archived") ?? assignments[0];
  const [assignmentForm, setAssignmentForm] = useState({
    studentId: students[0]?.id ?? "",
    skillSlug: SKILL_CATALOG[0]?.slug ?? "handstand",
    targetStage: getMaxSkillStageIndex(SKILL_CATALOG[0]?.slug ?? "handstand"),
    notes: ""
  });
  const [logForm, setLogForm] = useState({
    studentSkillId: initialOperativeAssignment?.id ?? "",
    stageIndex: initialOperativeAssignment?.current_stage ?? 0,
    readinessScore: 70,
    passed: true,
    notes: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const operativeAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status !== "archived"),
    [assignments]
  );

  const selectedSkillDefinition = useMemo(
    () => getSkillDefinition(assignmentForm.skillSlug as SkillSlug),
    [assignmentForm.skillSlug]
  );

  const selectedLogAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === logForm.studentSkillId) ?? null,
    [assignments, logForm.studentSkillId]
  );

  const selectedLogSkillDefinition = useMemo(
    () => (selectedLogAssignment ? getSkillDefinition(selectedLogAssignment.skill_slug as SkillSlug) : null),
    [selectedLogAssignment]
  );

  const summary = useMemo(
    () => ({
      active: snapshots.filter((snapshot) => snapshot.status === "active").length,
      completed: snapshots.filter((snapshot) => snapshot.status === "completed").length,
      coveredStudents: new Set(snapshots.map((snapshot) => snapshot.studentId)).size,
      logs: logs.length
    }),
    [logs.length, snapshots]
  );

  const refreshPage = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const createAssignment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiRequest<StudentSkill>("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignmentForm)
      });
      setAssignmentForm((current) => ({ ...current, notes: "" }));
      refreshPage();
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  };

  const createSkillLog = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiRequest<{ log: SkillProgressLog; assignment: StudentSkill }>("/api/skill-progress-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logForm)
      });
      setLogForm((current) => ({ ...current, notes: "" }));
      refreshPage();
    } catch (logError) {
      setError(logError instanceof Error ? logError.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  };

  const updateAssignment = async (
    id: string,
    payload: Partial<Pick<StudentSkill, "current_stage" | "target_stage" | "status" | "notes">>
  ) => {
    setSaving(true);
    setError(null);

    try {
      await apiRequest<StudentSkill>(`/api/skills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStage: payload.current_stage,
          targetStage: payload.target_stage,
          status: payload.status,
          notes: payload.notes
        })
      });
      refreshPage();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  };

  const archiveAssignment = async (id: string) => {
    setSaving(true);
    setError(null);

    try {
      await apiRequest<StudentSkill>(`/api/skills/${id}`, { method: "DELETE" });
      refreshPage();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5">
          <p className="text-sm font-medium text-slate-500">Skills activas</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.active}</p>
        </article>
        <article className="card p-5">
          <p className="text-sm font-medium text-slate-500">Skills completadas</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.completed}</p>
        </article>
        <article className="card p-5">
          <p className="text-sm font-medium text-slate-500">Alumnos con skill</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.coveredStudents}</p>
        </article>
        <article className="card p-5">
          <p className="text-sm font-medium text-slate-500">Intentos registrados</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.logs}</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="card p-5">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-brand-600" />
            <h2 className="text-lg font-semibold text-slate-900">Asignar progresión</h2>
          </div>
          <form onSubmit={createAssignment} className="mt-4 space-y-3">
            <select
              value={assignmentForm.studentId}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, studentId: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
            <select
              value={assignmentForm.skillSlug}
              onChange={(event) => {
                const skillSlug = event.target.value as SkillSlug;
                setAssignmentForm((current) => ({
                  ...current,
                  skillSlug,
                  targetStage: getMaxSkillStageIndex(skillSlug)
                }));
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {SKILL_CATALOG.map((skill) => (
                <option key={skill.slug} value={skill.slug}>
                  {skill.label}
                </option>
              ))}
            </select>
            <select
              value={assignmentForm.targetStage}
              onChange={(event) =>
                setAssignmentForm((current) => ({ ...current, targetStage: Number(event.target.value) }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {selectedSkillDefinition.stages.map((stage) => (
                <option key={stage.index} value={stage.index}>
                  Meta: {stage.label}
                </option>
              ))}
            </select>
            <textarea
              value={assignmentForm.notes}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, notes: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Enfoque técnico, bloque principal, puntos a vigilar..."
              rows={3}
            />
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-medium text-slate-800">{selectedSkillDefinition.label}</p>
              <p className="mt-1">{selectedSkillDefinition.shortDescription}</p>
            </div>
            <button
              type="submit"
              disabled={saving || isPending || !assignmentForm.studentId}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Asignar skill
            </button>
          </form>
        </article>

        <article className="card p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-600" />
            <h2 className="text-lg font-semibold text-slate-900">Registrar avance</h2>
          </div>
          <form onSubmit={createSkillLog} className="mt-4 space-y-3">
            <select
              value={logForm.studentSkillId}
              onChange={(event) => {
                const studentSkillId = event.target.value;
                const assignment = operativeAssignments.find((item) => item.id === studentSkillId);
                setLogForm((current) => ({
                  ...current,
                  studentSkillId,
                  stageIndex: assignment?.current_stage ?? 0
                }));
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            >
              {operativeAssignments.map((assignment) => {
                const definition = getSkillDefinition(assignment.skill_slug as SkillSlug);
                const student = students.find((item) => item.id === assignment.student_id);

                return (
                  <option key={assignment.id} value={assignment.id}>
                    {student?.name ?? "Alumno"} · {definition.label}
                  </option>
                );
              })}
            </select>
            <select
              value={logForm.stageIndex}
              onChange={(event) => setLogForm((current) => ({ ...current, stageIndex: Number(event.target.value) }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              disabled={!selectedLogSkillDefinition}
            >
              {(selectedLogSkillDefinition?.stages ?? []).map((stage) => (
                <option key={stage.index} value={stage.index}>
                  {stage.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={100}
              value={logForm.readinessScore}
              onChange={(event) => setLogForm((current) => ({ ...current, readinessScore: Number(event.target.value) }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Readiness 0-100"
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={logForm.passed}
                onChange={(event) => setLogForm((current) => ({ ...current, passed: event.target.checked }))}
              />
              Etapa validada
            </label>
            <textarea
              value={logForm.notes}
              onChange={(event) => setLogForm((current) => ({ ...current, notes: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Calidad técnica, fallos, cues del coach..."
              rows={3}
            />
            <button
              type="submit"
              disabled={saving || isPending || !logForm.studentSkillId}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Guardar intento
            </button>
          </form>
        </article>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {snapshots.length === 0 ? (
        <article className="card p-6">
          <p className="text-sm text-slate-600">Todavía no hay progresiones asignadas. Empieza con handstand, muscle-up o front lever.</p>
        </article>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshots.map((snapshot) => (
            <article key={snapshot.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{snapshot.skillCategory}</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">
                    {snapshot.studentName} · {snapshot.skillLabel}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{snapshot.skillDescription}</p>
                </div>
                <span
                  className={
                    snapshot.status === "completed"
                      ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
                      : snapshot.status === "archived"
                        ? "rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                        : "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700"
                  }
                >
                  {snapshot.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Etapa actual</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{snapshot.currentStageLabel}</p>
                  <p className="mt-1 text-xs text-slate-500">Benchmark: {snapshot.currentBenchmark}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Siguiente paso</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{snapshot.nextStageLabel ?? "Skill completada"}</p>
                  <p className="mt-1 text-xs text-slate-500">Meta actual: {snapshot.targetStageLabel}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Progreso del skill</span>
                  <span>{Math.round(snapshot.progressRatio * 100)}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(snapshot.progressRatio * 100, 6)}%` }} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {snapshot.stages.map((stage) => (
                  <span
                    key={`${snapshot.id}-${stage.index}`}
                    className={
                      stage.isCurrent
                        ? "rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white"
                        : stage.isTarget
                          ? "rounded-full border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700"
                          : stage.isCompleted
                            ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                            : "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                    }
                    title={stage.benchmark}
                  >
                    {stage.label}
                  </span>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Último intento: {formatShortDate(snapshot.lastLogAt)}</span>
                  <span>
                    Readiness: {snapshot.lastReadinessScore !== null ? `${snapshot.lastReadinessScore}/100` : "Sin score"}
                  </span>
                </div>
                <p className="mt-2">
                  {snapshot.lastLogNotes || snapshot.notes || "Sin observaciones registradas todavía."}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {snapshot.status === "archived" ? (
                  <button
                    type="button"
                    onClick={() => updateAssignment(snapshot.id, { status: "active" })}
                    disabled={saving || isPending}
                    className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700"
                  >
                    Reactivar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      updateAssignment(snapshot.id, {
                        status: snapshot.status === "completed" ? "active" : "completed",
                        current_stage:
                          snapshot.status === "completed" ? Math.max(snapshot.currentStage - 1, 0) : snapshot.currentStage
                      })
                    }
                    disabled={saving || isPending}
                    className="rounded-lg border border-brand-200 px-3 py-2 text-xs font-medium text-brand-700"
                  >
                    {snapshot.status === "completed" ? "Reabrir skill" : "Marcar completada"}
                  </button>
                )}
                {snapshot.status !== "archived" ? (
                  <button
                    type="button"
                    onClick={() => archiveAssignment(snapshot.id)}
                    disabled={saving || isPending}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    Archivar
                  </button>
                ) : null}
                <span className="ml-auto text-xs text-slate-400">
                  {snapshot.totalLogs} registros · iniciado {formatShortDate(snapshot.startedAt)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <article className="card p-5">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-900">Mapa base de skills</h2>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {SKILL_CATALOG.map((skill) => (
            <div key={skill.slug} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{skill.label}</h3>
                  <p className="mt-1 text-sm text-slate-500">{skill.shortDescription}</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {skill.stages.map((stage) => (
                  <li key={`${skill.slug}-${stage.index}`} className="rounded-lg bg-slate-50 px-3 py-2">
                    <span className="font-medium text-slate-800">{stage.label}</span>
                    <span className="block text-xs text-slate-500">{stage.benchmark}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

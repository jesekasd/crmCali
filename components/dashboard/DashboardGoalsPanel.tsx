"use client";

import { useEffect, useState } from "react";
import { DashboardGoalSnapshot } from "@/lib/dashboard/types";
import { getMetricLabel } from "@/lib/dashboard/reporting";
import { GoalMetric, Student, StudentGoal } from "@/types/domain";

interface DashboardGoalsPanelProps {
  students: Student[];
  selectedStudentId: string;
  goals: DashboardGoalSnapshot[];
  onCreateGoal: (payload: {
    studentId: string;
    metric: GoalMetric;
    targetValue: number;
    targetDate: string;
    notes: string;
  }) => Promise<void>;
  onUpdateGoal: (goalId: string, payload: Partial<Pick<StudentGoal, "status">>) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
}

export function DashboardGoalsPanel({
  students,
  selectedStudentId,
  goals,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal
}: DashboardGoalsPanelProps) {
  const [form, setForm] = useState({
    studentId: selectedStudentId !== "all" ? selectedStudentId : students[0]?.id ?? "",
    metric: "pullups" as GoalMetric,
    targetValue: "10",
    targetDate: new Date().toISOString().slice(0, 10),
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [actionGoalId, setActionGoalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedStudentId !== "all") {
      setForm((current) => ({ ...current, studentId: selectedStudentId }));
    }
  }, [selectedStudentId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onCreateGoal({
        studentId: form.studentId,
        metric: form.metric,
        targetValue: Number(form.targetValue),
        targetDate: form.targetDate,
        notes: form.notes
      });
      setForm((current) => ({ ...current, targetValue: "10", targetDate: new Date().toISOString().slice(0, 10), notes: "" }));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear la meta.");
    } finally {
      setLoading(false);
    }
  };

  const runGoalAction = async (goalId: string, action: () => Promise<void>) => {
    setActionGoalId(goalId);
    setError(null);

    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo actualizar la meta.");
    } finally {
      setActionGoalId(null);
    }
  };

  return (
    <article className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Metas por alumno</h3>
          <p className="mt-1 text-sm text-slate-500">Persistidas en Supabase y evaluadas sin jobs de pago.</p>
        </div>
        <span className="text-sm text-slate-500">{goals.length} metas</span>
      </div>

      <form data-export-hidden="true" onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        <select
          value={form.studentId}
          onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          required
        >
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
        <select
          value={form.metric}
          onChange={(event) => setForm((current) => ({ ...current, metric: event.target.value as GoalMetric }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="pullups">Pullups</option>
          <option value="pushups">Pushups</option>
          <option value="muscle_ups">Muscle up</option>
          <option value="handstand_seconds">Handstand</option>
        </select>
        <input
          type="number"
          min={0}
          value={form.targetValue}
          onChange={(event) => setForm((current) => ({ ...current, targetValue: event.target.value }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Valor objetivo"
          required
        />
        <input
          type="date"
          value={form.targetDate}
          onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          required
        />
        <textarea
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          rows={2}
          placeholder="Notas de contexto para la meta"
        />
        <button
          type="submit"
          disabled={loading || !form.studentId}
          className="md:col-span-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Crear meta"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-5 space-y-3">
        {goals.length === 0 ? (
          <p className="text-sm text-slate-600">No hay metas cargadas para el filtro actual.</p>
        ) : (
          goals.map((goal) => (
            <div key={goal.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {goal.studentName} - {getMetricLabel(goal.metric)}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Objetivo: {goal.targetValue} | Actual: {goal.currentValue} | Fecha: {goal.targetDate}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    goal.status === "completed"
                      ? "bg-emerald-100 text-emerald-700"
                      : goal.status === "archived"
                        ? "bg-slate-100 text-slate-600"
                        : "bg-brand-50 text-brand-700"
                  }`}
                >
                  {goal.status}
                </span>
              </div>

              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-brand-500" style={{ width: `${Math.max(goal.progressRatio * 100, 4)}%` }} />
                </div>
                {goal.notes ? <p className="mt-2 text-sm text-slate-600">{goal.notes}</p> : null}
              </div>

              <div data-export-hidden="true" className="mt-3 flex flex-wrap gap-2">
                {goal.status !== "completed" ? (
                  <button
                    type="button"
                    onClick={() => runGoalAction(goal.id, () => onUpdateGoal(goal.id, { status: "completed" }))}
                    className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700"
                    disabled={actionGoalId === goal.id}
                  >
                    Marcar completada
                  </button>
                ) : null}
                {goal.status !== "archived" ? (
                  <button
                    type="button"
                    onClick={() => runGoalAction(goal.id, () => onUpdateGoal(goal.id, { status: "archived" }))}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                    disabled={actionGoalId === goal.id}
                  >
                    Archivar
                  </button>
                ) : null}
                {goal.status !== "active" ? (
                  <button
                    type="button"
                    onClick={() => runGoalAction(goal.id, () => onUpdateGoal(goal.id, { status: "active" }))}
                    className="rounded-lg border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700"
                    disabled={actionGoalId === goal.id}
                  >
                    Reactivar
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => runGoalAction(goal.id, () => onDeleteGoal(goal.id))}
                  className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700"
                  disabled={actionGoalId === goal.id}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

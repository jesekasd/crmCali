"use client";

import { useMemo, useState } from "react";
import { Student, Workout, WorkoutAssignment } from "@/types/domain";

interface WorkoutEditorProps {
  students: Student[];
  initialWorkouts: Workout[];
  initialAssignments: WorkoutAssignment[];
}

export function WorkoutEditor({ students, initialWorkouts, initialAssignments }: WorkoutEditorProps) {
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [workoutForm, setWorkoutForm] = useState({ title: "", description: "" });
  const [assignmentForm, setAssignmentForm] = useState({
    workoutId: initialWorkouts[0]?.id ?? "",
    studentId: students[0]?.id ?? ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentsById = useMemo(() => Object.fromEntries(students.map((student) => [student.id, student.name])), [students]);
  const workoutsById = useMemo(() => Object.fromEntries(workouts.map((workout) => [workout.id, workout.title])), [workouts]);

  const createWorkout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workoutForm)
      });
      if (!response.ok) {
        throw new Error("No se pudo crear la rutina.");
      }
      const created = (await response.json()) as Workout;
      setWorkouts((prev) => [created, ...prev]);
      setWorkoutForm({ title: "", description: "" });
      setAssignmentForm((prev) => ({ ...prev, workoutId: created.id }));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const assignWorkout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/workout-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignmentForm)
      });
      if (!response.ok) {
        throw new Error("No se pudo asignar la rutina.");
      }
      const created = (await response.json()) as WorkoutAssignment;
      setAssignments((prev) => [created, ...prev]);
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const unassignWorkout = async (assignmentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workout-assignments?id=${encodeURIComponent(assignmentId)}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error("No se pudo desasignar la rutina.");
      }
      setAssignments((prev) => prev.filter((assignment) => assignment.id !== assignmentId));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <article className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900">Crear rutina</h2>
        <form onSubmit={createWorkout} className="mt-4 space-y-3">
          <input
            value={workoutForm.title}
            onChange={(event) => setWorkoutForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Titulo"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <textarea
            value={workoutForm.description}
            onChange={(event) => setWorkoutForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Descripcion"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            rows={4}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Guardar rutina
          </button>
        </form>
      </article>

      <article className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900">Asignar rutina</h2>
        <form onSubmit={assignWorkout} className="mt-4 space-y-3">
          <select
            value={assignmentForm.workoutId}
            onChange={(event) => setAssignmentForm((prev) => ({ ...prev, workoutId: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          >
            {workouts.map((workout) => (
              <option key={workout.id} value={workout.id}>
                {workout.title}
              </option>
            ))}
          </select>
          <select
            value={assignmentForm.studentId}
            onChange={(event) => setAssignmentForm((prev) => ({ ...prev, studentId: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || workouts.length === 0 || students.length === 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Asignar
          </button>
        </form>
      </article>

      <article className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900">Rutinas creadas</h2>
        <ul className="mt-4 space-y-3">
          {workouts.map((workout) => (
            <li key={workout.id} className="rounded-lg border border-slate-200 p-3">
              <h3 className="font-medium text-slate-900">{workout.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{workout.description || "Sin descripcion"}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900">Asignaciones</h2>
        <ul className="mt-4 space-y-3">
          {assignments.map((assignment) => (
            <li key={assignment.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700">
                  {studentsById[assignment.student_id] || "Alumno desconocido"}
                </span>
                <span className="text-sm font-medium text-brand-700">
                  {workoutsById[assignment.workout_id] || "Rutina desconocida"}
                </span>
              </div>
              <button
                onClick={() => unassignWorkout(assignment.id)}
                disabled={loading}
                className="mt-3 rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700 disabled:opacity-60"
              >
                Desasignar
              </button>
            </li>
          ))}
        </ul>
      </article>

      {error ? <p className="xl:col-span-2 text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { ProgressEntry, Student } from "@/types/domain";
import { ProgressChart } from "@/components/ProgressChart";

interface ProgressManagerProps {
  students: Student[];
  initialEntries: ProgressEntry[];
}

export function ProgressManager({ students, initialEntries }: ProgressManagerProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [form, setForm] = useState({
    studentId: students[0]?.id ?? "",
    pullups: "0",
    pushups: "0",
    muscle_ups: "0",
    handstand_seconds: "0",
    date: new Date().toISOString().slice(0, 10)
  });
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentsById = useMemo(() => Object.fromEntries(students.map((student) => [student.id, student.name])), [students]);

  const chartData = useMemo(
    () =>
      entries
        .filter((entry) => (selectedStudentId ? entry.student_id === selectedStudentId : true))
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((entry) => ({
          date: entry.date,
          pullups: entry.pullups,
          pushups: entry.pushups,
          muscle_ups: entry.muscle_ups,
          handstand_seconds: entry.handstand_seconds
        })),
    [entries, selectedStudentId]
  );

  const registerProgress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: form.studentId,
          pullups: Number(form.pullups),
          pushups: Number(form.pushups),
          muscle_ups: Number(form.muscle_ups),
          handstand_seconds: Number(form.handstand_seconds),
          date: form.date
        })
      });
      if (!response.ok) {
        throw new Error("No se pudo registrar el progreso.");
      }
      const created = (await response.json()) as ProgressEntry;
      setEntries((prev) => [created, ...prev]);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <article className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900">Registrar progreso</h2>
        <form onSubmit={registerProgress} className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            value={form.studentId}
            onChange={(event) => setForm((prev) => ({ ...prev, studentId: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={form.pullups}
            onChange={(event) => setForm((prev) => ({ ...prev, pullups: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Dominadas"
          />
          <input
            type="number"
            min={0}
            value={form.pushups}
            onChange={(event) => setForm((prev) => ({ ...prev, pushups: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Flexiones"
          />
          <input
            type="number"
            min={0}
            value={form.muscle_ups}
            onChange={(event) => setForm((prev) => ({ ...prev, muscle_ups: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Muscle up"
          />
          <input
            type="number"
            min={0}
            value={form.handstand_seconds}
            onChange={(event) => setForm((prev) => ({ ...prev, handstand_seconds: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Handstand (seg)"
          />
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="md:col-span-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Registrar
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </article>

      <article className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Gráfico por alumno</h2>
          <select
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <ProgressChart data={chartData} />
        </div>
      </article>

      <article className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900">Historial reciente</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-2 pr-4">Alumno</th>
                <th className="pb-2 pr-4">Fecha</th>
                <th className="pb-2 pr-4">Dominadas</th>
                <th className="pb-2 pr-4">Flexiones</th>
                <th className="pb-2 pr-4">Muscle up</th>
                <th className="pb-2 pr-4">Handstand</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 20).map((entry) => (
                <tr key={entry.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4">{studentsById[entry.student_id] ?? "Alumno desconocido"}</td>
                  <td className="py-2 pr-4">{entry.date}</td>
                  <td className="py-2 pr-4">{entry.pullups}</td>
                  <td className="py-2 pr-4">{entry.pushups}</td>
                  <td className="py-2 pr-4">{entry.muscle_ups}</td>
                  <td className="py-2 pr-4">{entry.handstand_seconds}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

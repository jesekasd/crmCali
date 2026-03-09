"use client";

import { useMemo, useState } from "react";
import { Student } from "@/types/domain";
import { StudentCard } from "@/components/StudentCard";

interface StudentsManagerProps {
  initialStudents: Student[];
}

type StudentInput = {
  name: string;
  level: string;
  goal: string;
  start_date: string;
  status: string;
};

const defaultForm = (): StudentInput => ({
  name: "",
  level: "beginner",
  goal: "",
  start_date: new Date().toISOString().slice(0, 10),
  status: "active"
});

export function StudentsManager({ initialStudents }: StudentsManagerProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [form, setForm] = useState<StudentInput>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStudents = useMemo(() => students.filter((student) => student.status === "active").length, [students]);

  const createStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!response.ok) {
        throw new Error("No se pudo crear el alumno.");
      }
      const created = (await response.json()) as Student;
      setStudents((prev) => [created, ...prev]);
      setForm(defaultForm());
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  };

  const updateStudent = async (
    id: string,
    payload: Partial<Pick<Student, "name" | "level" | "goal" | "start_date" | "status">>
  ) => {
    const response = await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error("No se pudo actualizar el alumno.");
    }
    const updated = (await response.json()) as Student;
    setStudents((prev) => prev.map((student) => (student.id === id ? updated : student)));
  };

  const deleteStudent = async (id: string) => {
    const response = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error("No se pudo eliminar el alumno.");
    }
    setStudents((prev) => prev.filter((student) => student.id !== id));
  };

  return (
    <section className="space-y-6">
      <article className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900">Nuevo alumno</h2>
        <p className="mt-1 text-sm text-slate-500">
          Total: {students.length} alumnos · Activos: {activeStudents}
        </p>
        <form onSubmit={createStudent} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Nombre completo"
            required
          />
          <select
            value={form.level}
            onChange={(event) => setForm((prev) => ({ ...prev, level: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <input
            value={form.goal}
            onChange={(event) => setForm((prev) => ({ ...prev, goal: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Objetivo"
          />
          <input
            type="date"
            value={form.start_date}
            onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Crear alumno"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </article>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {students.map((student) => (
          <StudentCard key={student.id} student={student} onSave={updateStudent} onDelete={deleteStudent} />
        ))}
      </div>
    </section>
  );
}

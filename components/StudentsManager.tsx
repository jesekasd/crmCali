"use client";

import { useMemo, useState } from "react";
import { Student } from "@/types/domain";
import { StudentCard } from "@/components/StudentCard";
import { apiRequest } from "@/lib/client/api";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStudents = useMemo(() => students.filter((student) => student.status === "active").length, [students]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return students.filter((student) => {
      const matchesStatus = statusFilter === "all" ? true : student.status === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        student.name.toLowerCase().includes(normalizedSearch) ||
        (student.goal ?? "").toLowerCase().includes(normalizedSearch) ||
        student.level.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [students, searchTerm, statusFilter]);

  const createStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await apiRequest<Student>("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
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
    const updated = await apiRequest<Student>(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setStudents((prev) => prev.map((student) => (student.id === id ? updated : student)));
  };

  const deleteStudent = async (id: string) => {
    await apiRequest<{ ok: true }>(`/api/students/${id}`, { method: "DELETE" });
    setStudents((prev) => prev.filter((student) => student.id !== id));
  };

  return (
    <section className="space-y-6">
      <article className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900">Nuevo alumno</h2>
        <p className="mt-1 text-sm text-slate-500">
          Total: {students.length} alumnos - Activos: {activeStudents}
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

      <article className="card p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_200px]">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Buscar por nombre, nivel u objetivo"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
          </select>
        </div>
        <p className="mt-3 text-sm text-slate-500">Resultados: {filteredStudents.length}</p>
      </article>

      {filteredStudents.length === 0 ? (
        <article className="card p-6">
          <p className="text-sm text-slate-600">No hay alumnos que coincidan con el filtro actual.</p>
        </article>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredStudents.map((student) => (
            <StudentCard key={student.id} student={student} onSave={updateStudent} onDelete={deleteStudent} />
          ))}
        </div>
      )}
    </section>
  );
}

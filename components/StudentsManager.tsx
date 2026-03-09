"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Student } from "@/types/domain";
import { StudentCard } from "@/components/StudentCard";
import { PaginationControls } from "@/components/PaginationControls";
import { apiRequest } from "@/lib/client/api";
import { buildUrlWithUpdatedSearchParams } from "@/lib/client/search-params";

interface StudentsManagerProps {
  students: Student[];
  filters: {
    search: string;
    status: "all" | "active" | "inactive";
    page: number;
  };
  pageSize: number;
  hasNextPage: boolean;
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

export function StudentsManager({ students, filters, pageSize, hasNextPage }: StudentsManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<StudentInput>(defaultForm);
  const [searchInput, setSearchInput] = useState(filters.search);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const navigateWithUpdates = (updates: Record<string, string | null | undefined>) => {
    startTransition(() => {
      router.replace(buildUrlWithUpdatedSearchParams(pathname, searchParams, updates), { scroll: false });
    });
  };

  const createStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiRequest<Student>("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      setForm(defaultForm());
      startTransition(() => {
        router.refresh();
      });
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
    await apiRequest<Student>(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    startTransition(() => {
      router.refresh();
    });
  };

  const deleteStudent = async (id: string) => {
    await apiRequest<{ ok: true }>(`/api/students/${id}`, { method: "DELETE" });
    startTransition(() => {
      const shouldMoveToPreviousPage = students.length === 1 && filters.page > 1;
      if (shouldMoveToPreviousPage) {
        router.replace(buildUrlWithUpdatedSearchParams(pathname, searchParams, { page: String(filters.page - 1) }), {
          scroll: false
        });
        return;
      }

      router.refresh();
    });
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateWithUpdates({
      q: searchInput || null,
      page: null
    });
  };

  return (
    <section className="space-y-6">
      <article className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900">Nuevo alumno</h2>
        <p className="mt-1 text-sm text-slate-500">Vista actual: {students.length} alumnos en esta página.</p>
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
            disabled={saving || isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Crear alumno"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </article>

      <article className="card p-5">
        <form onSubmit={submitSearch} className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Buscar por nombre, nivel u objetivo"
          />
          <select
            value={filters.status}
            onChange={(event) =>
              navigateWithUpdates({
                status: event.target.value === "all" ? null : event.target.value,
                page: null
              })
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            disabled={isPending}
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
          >
            Aplicar
          </button>
        </form>
        <p className="mt-3 text-sm text-slate-500">
          Filtros: búsqueda {filters.search ? `"${filters.search}"` : "vacía"} | estado {filters.status}
        </p>
        <PaginationControls
          page={filters.page}
          hasNextPage={hasNextPage}
          itemCount={students.length}
          pageSize={pageSize}
          itemLabel="alumnos"
          disabled={isPending}
          onPageChange={(nextPage) => navigateWithUpdates({ page: String(nextPage) })}
        />
      </article>

      {students.length === 0 ? (
        <article className="card p-6">
          <p className="text-sm text-slate-600">No hay alumnos que coincidan con el filtro actual.</p>
        </article>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <StudentCard key={student.id} student={student} onSave={updateStudent} onDelete={deleteStudent} />
          ))}
        </div>
      )}
    </section>
  );
}

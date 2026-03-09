"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProgressEntry, Student } from "@/types/domain";
import { ProgressChart } from "@/components/ProgressChart";
import { PaginationControls } from "@/components/PaginationControls";
import { apiRequest } from "@/lib/client/api";
import { buildUrlWithUpdatedSearchParams } from "@/lib/client/search-params";
import { getDateOffset } from "@/lib/dashboard/reporting";

interface ProgressManagerProps {
  students: Student[];
  entries: ProgressEntry[];
  chartData: Array<{
    date: string;
    pullups: number;
    pushups: number;
    muscle_ups: number;
    handstand_seconds: number;
  }>;
  filters: {
    selectedStudentId: string;
    startDate: string;
    endDate: string;
    page: number;
  };
  pageSize: number;
  hasNextPage: boolean;
}

export function ProgressManager({ students, entries, chartData, filters, pageSize, hasNextPage }: ProgressManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    studentId: filters.selectedStudentId || students[0]?.id || "",
    pullups: "0",
    pushups: "0",
    muscle_ups: "0",
    handstand_seconds: "0",
    date: new Date().toISOString().slice(0, 10)
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentsById = Object.fromEntries(students.map((student) => [student.id, student.name]));

  useEffect(() => {
    if (filters.selectedStudentId) {
      setForm((current) => ({ ...current, studentId: filters.selectedStudentId }));
    }
  }, [filters.selectedStudentId]);

  const navigateWithUpdates = (updates: Record<string, string | null | undefined>) => {
    startTransition(() => {
      router.replace(buildUrlWithUpdatedSearchParams(pathname, searchParams, updates), { scroll: false });
    });
  };

  const registerProgress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiRequest<ProgressEntry>("/api/progress", {
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

      startTransition(() => {
        router.replace(
          buildUrlWithUpdatedSearchParams(pathname, searchParams, {
            student: form.studentId,
            page: null
          }),
          { scroll: false }
        );
      });
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
            disabled={loading || isPending || !form.studentId}
            className="md:col-span-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Registrar
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </article>

      <article className="card p-5">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
          <select
            value={filters.selectedStudentId}
            onChange={(event) =>
              navigateWithUpdates({
                student: event.target.value,
                page: null
              })
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            disabled={isPending}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => navigateWithUpdates({ start: event.target.value || "all", page: null })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            disabled={isPending}
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => navigateWithUpdates({ end: event.target.value || null, page: null })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() => navigateWithUpdates({ start: null, end: null, page: null })}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            disabled={isPending}
          >
            Resetear
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigateWithUpdates({ start: getDateOffset(30), page: null })}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
            disabled={isPending}
          >
            30 días
          </button>
          <button
            type="button"
            onClick={() => navigateWithUpdates({ start: getDateOffset(90), page: null })}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
            disabled={isPending}
          >
            90 días
          </button>
          <button
            type="button"
            onClick={() => navigateWithUpdates({ start: "all", page: null })}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
            disabled={isPending}
          >
            Todo
          </button>
        </div>
      </article>

      <article className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900">Gráfico por alumno</h2>
        <div className="mt-4">
          {chartData.length > 0 ? (
            <ProgressChart title="Evolución filtrada del alumno" data={chartData} />
          ) : (
            <p className="text-sm text-slate-600">No hay registros en la ventana seleccionada.</p>
          )}
        </div>
      </article>

      <article className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Historial reciente</h2>
          <p className="text-sm text-slate-500">{entries.length} registros en esta página</p>
        </div>
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
              {entries.map((entry) => (
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
        <PaginationControls
          page={filters.page}
          hasNextPage={hasNextPage}
          itemCount={entries.length}
          pageSize={pageSize}
          itemLabel="registros"
          disabled={isPending}
          onPageChange={(nextPage) => navigateWithUpdates({ page: String(nextPage) })}
        />
      </article>
    </section>
  );
}

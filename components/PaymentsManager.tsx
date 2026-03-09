"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Payment, Student } from "@/types/domain";
import { PaymentTable } from "@/components/PaymentTable";
import { PaginationControls } from "@/components/PaginationControls";
import { StatCard } from "@/components/StatCard";
import { apiRequest } from "@/lib/client/api";
import { buildUrlWithUpdatedSearchParams } from "@/lib/client/search-params";
import { getDateOffset } from "@/lib/dashboard/reporting";

interface PaymentsManagerProps {
  students: Student[];
  payments: Payment[];
  summary: {
    monthlyRevenue: number;
    pendingCount: number;
    overdueCount: number;
  };
  filters: {
    selectedStudentId: string;
    status: "all" | "pending" | "paid" | "overdue";
    startDate: string;
    endDate: string;
    page: number;
  };
  pageSize: number;
  hasNextPage: boolean;
}

export function PaymentsManager({ students, payments, summary, filters, pageSize, hasNextPage }: PaymentsManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    studentId: filters.selectedStudentId !== "all" ? filters.selectedStudentId : (students[0]?.id ?? ""),
    amount: "0",
    status: "pending",
    date: new Date().toISOString().slice(0, 10)
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentsById = Object.fromEntries(students.map((student) => [student.id, student.name]));

  useEffect(() => {
    if (filters.selectedStudentId !== "all") {
      setForm((current) => ({ ...current, studentId: filters.selectedStudentId }));
    }
  }, [filters.selectedStudentId]);

  const navigateWithUpdates = (updates: Record<string, string | null | undefined>) => {
    startTransition(() => {
      router.replace(buildUrlWithUpdatedSearchParams(pathname, searchParams, updates), { scroll: false });
    });
  };

  const createPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiRequest<Payment>("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: form.studentId,
          amount: Number(form.amount),
          status: form.status,
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
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (paymentId: string, status: "paid" | "pending" | "overdue") => {
    await apiRequest<Payment>("/api/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: paymentId, status })
    });
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Ingresos del mes" value={`$${summary.monthlyRevenue.toFixed(2)}`} />
        <StatCard title="Pagos pendientes" value={String(summary.pendingCount)} />
        <StatCard title="Pagos vencidos" value={String(summary.overdueCount)} />
      </div>

      <article className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900">Registrar pago</h2>
        <form onSubmit={createPayment} className="mt-4 grid gap-3 md:grid-cols-4">
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
            value={form.amount}
            onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Monto"
            required
          />
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
            <option value="overdue">Vencido</option>
          </select>
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading || isPending || !form.studentId}
            className="md:col-span-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Guardar pago
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </article>

      <article className="card p-5">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
          <select
            value={filters.selectedStudentId}
            onChange={(event) =>
              navigateWithUpdates({
                student: event.target.value === "all" ? null : event.target.value,
                page: null
              })
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            disabled={isPending}
          >
            <option value="all">Todos los alumnos</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
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
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
            <option value="overdue">Vencido</option>
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
            onClick={() => navigateWithUpdates({ student: null, status: null, start: null, end: null, page: null })}
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
        <div className="mt-4">
          <PaymentTable payments={payments} studentsById={studentsById} onUpdateStatus={updatePaymentStatus} />
        </div>
        <PaginationControls
          page={filters.page}
          hasNextPage={hasNextPage}
          itemCount={payments.length}
          pageSize={pageSize}
          itemLabel="pagos"
          disabled={isPending}
          onPageChange={(nextPage) => navigateWithUpdates({ page: String(nextPage) })}
        />
      </article>
    </section>
  );
}

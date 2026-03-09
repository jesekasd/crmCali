"use client";

import { useMemo, useState } from "react";
import { Payment, Student } from "@/types/domain";
import { PaymentTable } from "@/components/PaymentTable";
import { StatCard } from "@/components/StatCard";
import { apiRequest } from "@/lib/client/api";

interface PaymentsManagerProps {
  students: Student[];
  initialPayments: Payment[];
}

export function PaymentsManager({ students, initialPayments }: PaymentsManagerProps) {
  const [payments, setPayments] = useState(initialPayments);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [form, setForm] = useState({
    studentId: students[0]?.id ?? "",
    amount: "0",
    status: "pending",
    date: new Date().toISOString().slice(0, 10)
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentsById = useMemo(() => Object.fromEntries(students.map((student) => [student.id, student.name])), [students]);

  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    return payments
      .filter((payment) => payment.status === "paid" && payment.date.startsWith(month))
      .reduce((acc, payment) => acc + Number(payment.amount), 0);
  }, [payments]);

  const pendingCount = useMemo(() => payments.filter((payment) => payment.status === "pending").length, [payments]);
  const overdueCount = useMemo(() => payments.filter((payment) => payment.status === "overdue").length, [payments]);

  const filteredPayments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesStatus = statusFilter === "all" ? true : payment.status === statusFilter;
      const studentName = (studentsById[payment.student_id] ?? "").toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 ||
        studentName.includes(normalizedSearch) ||
        payment.status.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [payments, searchTerm, statusFilter, studentsById]);

  const createPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const created = await apiRequest<Payment>("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: form.studentId,
          amount: Number(form.amount),
          status: form.status,
          date: form.date
        })
      });
      setPayments((prev) => [created, ...prev]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (paymentId: string, status: "paid" | "pending" | "overdue") => {
    const updated = await apiRequest<Payment>("/api/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: paymentId, status })
    });
    setPayments((prev) => prev.map((payment) => (payment.id === updated.id ? updated : payment)));
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Ingresos del mes" value={`$${monthlyRevenue.toFixed(2)}`} />
        <StatCard title="Pagos pendientes" value={String(pendingCount)} />
        <StatCard title="Pagos vencidos" value={String(overdueCount)} />
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
            disabled={loading}
            className="md:col-span-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Guardar pago
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </article>

      <article className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Tabla de pagos</h2>
          <p className="text-sm text-slate-500">Resultados: {filteredPayments.length}</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Buscar por alumno o estado"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "pending" | "paid" | "overdue")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
            <option value="overdue">Vencido</option>
          </select>
        </div>
        <div className="mt-4">
          <PaymentTable payments={filteredPayments} studentsById={studentsById} onUpdateStatus={updatePaymentStatus} />
        </div>
      </article>
    </section>
  );
}

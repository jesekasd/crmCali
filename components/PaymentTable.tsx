"use client";

import { Payment } from "@/types/domain";

interface PaymentTableProps {
  payments: Payment[];
  studentsById: Record<string, string>;
  onUpdateStatus: (paymentId: string, status: "paid" | "pending" | "overdue") => Promise<void>;
}

export function PaymentTable({ payments, studentsById, onUpdateStatus }: PaymentTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="pb-2 pr-4">Alumno</th>
            <th className="pb-2 pr-4">Monto</th>
            <th className="pb-2 pr-4">Estado</th>
            <th className="pb-2 pr-4">Fecha</th>
            <th className="pb-2 pr-4">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const amount = Number(payment.amount);
            return (
              <tr key={payment.id} className="border-t border-slate-100">
                <td className="py-2 pr-4">{studentsById[payment.student_id] ?? "Alumno desconocido"}</td>
                <td className="py-2 pr-4">${amount.toFixed(2)}</td>
                <td className="py-2 pr-4">
                  <span
                    className={
                      payment.status === "paid"
                        ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
                        : payment.status === "overdue"
                          ? "rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700"
                          : "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700"
                    }
                  >
                    {payment.status}
                  </span>
                </td>
                <td className="py-2 pr-4">{payment.date}</td>
                <td className="py-2 pr-4">
                  <div className="flex flex-wrap gap-2">
                    {payment.status !== "paid" ? (
                      <button
                        onClick={() => onUpdateStatus(payment.id, "paid")}
                        className="rounded-lg border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700"
                      >
                        Marcar pagado
                      </button>
                    ) : null}
                    {payment.status !== "pending" ? (
                      <button
                        onClick={() => onUpdateStatus(payment.id, "pending")}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        Marcar pendiente
                      </button>
                    ) : null}
                    {payment.status !== "overdue" ? (
                      <button
                        onClick={() => onUpdateStatus(payment.id, "overdue")}
                        className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700"
                      >
                        Marcar vencido
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

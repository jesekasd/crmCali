"use client";

import { Payment } from "@/types/domain";

interface PaymentTableProps {
  payments: Payment[];
  studentsById: Record<string, string>;
  onMarkPaid: (paymentId: string) => Promise<void>;
}

export function PaymentTable({ payments, studentsById, onMarkPaid }: PaymentTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="pb-2 pr-4">Alumno</th>
            <th className="pb-2 pr-4">Monto</th>
            <th className="pb-2 pr-4">Estado</th>
            <th className="pb-2 pr-4">Fecha</th>
            <th className="pb-2 pr-4">Accion</th>
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
                        : "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700"
                    }
                  >
                    {payment.status}
                  </span>
                </td>
                <td className="py-2 pr-4">{payment.date}</td>
                <td className="py-2 pr-4">
                  {payment.status === "paid" ? null : (
                    <button
                      onClick={() => onMarkPaid(payment.id)}
                      className="rounded-lg border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700"
                    >
                      Marcar pagado
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

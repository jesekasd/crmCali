"use client";

import { DashboardStudentRow } from "@/lib/dashboard/types";

interface DashboardStudentSummaryProps {
  rows: DashboardStudentRow[];
}

export function DashboardStudentSummary({ rows }: DashboardStudentSummaryProps) {
  return (
    <article className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Resumen por alumno</h3>
        <span className="text-sm text-slate-500">{rows.length} filas</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-2 pr-4">Alumno</th>
              <th className="pb-2 pr-4">Nivel</th>
              <th className="pb-2 pr-4">Registros</th>
              <th className="pb-2 pr-4">Ultimo</th>
              <th className="pb-2 pr-4">Mejor pullups</th>
              <th className="pb-2 pr-4">Cobrado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="py-2 pr-4 font-medium text-slate-900">{row.name}</td>
                <td className="py-2 pr-4 text-slate-600">{row.level}</td>
                <td className="py-2 pr-4">{row.records}</td>
                <td className="py-2 pr-4">{row.latestDate}</td>
                <td className="py-2 pr-4">{row.bestPullups}</td>
                <td className="py-2 pr-4">${row.paidForStudent.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

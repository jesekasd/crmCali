"use client";

import { DashboardAlert } from "@/lib/dashboard/types";
import { getMetricLabel } from "@/lib/dashboard/reporting";

interface DashboardAlertsPanelProps {
  alerts: DashboardAlert[];
}

export function DashboardAlertsPanel({ alerts }: DashboardAlertsPanelProps) {
  return (
    <article className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Alertas del coach</h3>
          <p className="mt-1 text-sm text-slate-500">Derivadas en lectura para evitar cron jobs y costo extra.</p>
        </div>
        <span className="text-sm text-slate-500">{alerts.length} activas</span>
      </div>

      <div className="mt-4 space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-600">No hay alertas activas con el dataset actual.</p>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border p-4 ${
                alert.severity === "critical" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{alert.title}</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {alert.studentName} | {getMetricLabel(alert.metric)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    alert.severity === "critical" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {alert.severity}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-700">{alert.description}</p>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

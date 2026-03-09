"use client";

import { DashboardTrendMetric } from "@/lib/dashboard/types";

interface DashboardTrendGridProps {
  metrics: DashboardTrendMetric[];
}

function formatMetricValue(metric: DashboardTrendMetric, value: number) {
  if (metric.format === "currency") {
    return `$${value.toFixed(2)}`;
  }

  if (metric.format === "seconds") {
    return `${Math.round(value)}s`;
  }

  return `${Math.round(value)}`;
}

function formatDelta(deltaPercentage: number | null) {
  if (deltaPercentage === null) {
    return "n/a";
  }

  const prefix = deltaPercentage > 0 ? "+" : "";
  return `${prefix}${deltaPercentage.toFixed(1)}%`;
}

export function DashboardTrendGrid({ metrics }: DashboardTrendGridProps) {
  return (
    <section className="space-y-4">
      <header>
        <h3 className="text-lg font-semibold text-slate-900">Comparativas mensuales</h3>
        <p className="mt-1 text-sm text-slate-500">Comparacion del mes actual contra el anterior para el alumno o grupo filtrado.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="card p-5">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatMetricValue(metric, metric.currentValue)}</p>
            <p className="mt-1 text-xs text-slate-500">Mes anterior: {formatMetricValue(metric, metric.previousValue)}</p>
            <p
              className={`mt-2 text-xs font-medium ${
                metric.deltaPercentage === null
                  ? "text-slate-500"
                  : metric.deltaPercentage >= 0
                    ? "text-emerald-700"
                    : "text-rose-700"
              }`}
            >
              Tendencia: {formatDelta(metric.deltaPercentage)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

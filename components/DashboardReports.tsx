"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProgressChart } from "@/components/ProgressChart";
import { StatCard } from "@/components/StatCard";
import { DashboardAlertsPanel } from "@/components/dashboard/DashboardAlertsPanel";
import { DashboardExportActions } from "@/components/dashboard/DashboardExportActions";
import { DashboardGoalsPanel } from "@/components/dashboard/DashboardGoalsPanel";
import { DashboardRecentActivity } from "@/components/dashboard/DashboardRecentActivity";
import { DashboardStudentSummary } from "@/components/dashboard/DashboardStudentSummary";
import { DashboardTrendGrid } from "@/components/dashboard/DashboardTrendGrid";
import { apiRequest } from "@/lib/client/api";
import { printDashboardReport } from "@/lib/dashboard/export";
import { getDateOffset, getTodayIso } from "@/lib/dashboard/reporting";
import { DashboardFilterState, DashboardViewModel } from "@/lib/dashboard/types";
import { GoalMetric, ProgressEntry, Student, StudentGoal } from "@/types/domain";

interface DashboardReportsProps {
  students: Student[];
  recentEntries: ProgressEntry[];
  viewModel: DashboardViewModel;
}

function buildDashboardUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function DashboardReports({
  students,
  recentEntries,
  viewModel
}: DashboardReportsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const studentsById = useMemo(() => Object.fromEntries(students.map((student) => [student.id, student])), [students]);
  const { filters, summary, chartData, trendMetrics, goalSnapshots, alerts, studentRows } = viewModel;

  const updateFilters = (updates: Partial<DashboardFilterState>) => {
    const params = new URLSearchParams(searchParams.toString());

    if ("selectedStudentId" in updates) {
      const value = updates.selectedStudentId;
      if (!value || value === "all") {
        params.delete("student");
      } else {
        params.set("student", value);
      }
    }

    if ("startDate" in updates) {
      const value = updates.startDate;
      if (!value) {
        params.set("start", "all");
      } else if (value === getDateOffset(30)) {
        params.delete("start");
      } else {
        params.set("start", value);
      }
    }

    if ("endDate" in updates) {
      const value = updates.endDate;
      if (!value || value === getTodayIso()) {
        params.delete("end");
      } else {
        params.set("end", value);
      }
    }

    startTransition(() => {
      router.replace(buildDashboardUrl(pathname, params), { scroll: false });
    });
  };

  const resetFilters = () => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  const activeFilterLabel =
    filters.selectedStudentId === "all" ? "Todos los alumnos" : (studentsById[filters.selectedStudentId]?.name ?? "Alumno");

  const createGoal = async (payload: {
    studentId: string;
    metric: GoalMetric;
    targetValue: number;
    targetDate: string;
    notes: string;
  }) => {
    await apiRequest<StudentGoal>("/api/student-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    startTransition(() => {
      router.refresh();
    });
  };

  const updateGoal = async (goalId: string, payload: Partial<Pick<StudentGoal, "status">>) => {
    await apiRequest<StudentGoal>(`/api/student-goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    startTransition(() => {
      router.refresh();
    });
  };

  const deleteGoal = async (goalId: string) => {
    await apiRequest<{ ok: true }>(`/api/student-goals/${goalId}`, { method: "DELETE" });
    startTransition(() => {
      router.refresh();
    });
  };

  const exportCsv = () => {
    const exportUrl = buildDashboardUrl("/api/dashboard/export", new URLSearchParams(searchParams.toString()));
    const anchor = document.createElement("a");
    anchor.href = exportUrl;
    anchor.click();
  };

  const exportPdf = () => {
    printDashboardReport(`CalisTrack report - ${activeFilterLabel}`);
  };

  return (
    <section id="dashboard-report-root" className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">
            Reportes modulares por alumno y rango de fechas, pensados para free tier y crecimiento sin monolitos.
          </p>
        </div>
        <DashboardExportActions onExportCsv={exportCsv} onExportPdf={exportPdf} />
      </header>

      <article className="card p-5">
        <div data-export-hidden="true" className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
          <select
            value={filters.selectedStudentId}
            onChange={(event) => updateFilters({ selectedStudentId: event.target.value })}
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
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => updateFilters({ startDate: event.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            disabled={isPending}
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => updateFilters({ endDate: event.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            disabled={isPending}
          />
          <button
            onClick={resetFilters}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            disabled={isPending}
          >
            Resetear
          </button>
        </div>
        <div data-export-hidden="true" className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => updateFilters({ startDate: getDateOffset(7) })}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
            disabled={isPending}
          >
            7 dias
          </button>
          <button
            onClick={() => updateFilters({ startDate: getDateOffset(30) })}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
            disabled={isPending}
          >
            30 dias
          </button>
          <button
            onClick={() => updateFilters({ startDate: getDateOffset(90) })}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
            disabled={isPending}
          >
            90 dias
          </button>
          <button
            onClick={() => updateFilters({ startDate: "" })}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
            disabled={isPending}
          >
            Todo el historial
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Filtro activo: {activeFilterLabel} | Ventana: {filters.startDate || "inicio"} a {filters.endDate || "hoy"}
        </p>
        {isPending ? <p className="mt-2 text-xs text-slate-400">Actualizando reporte...</p> : null}
      </article>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Alumnos activos" value={String(summary.activeStudentCount)} hint={`En reporte: ${summary.coverageCount}`} />
        <StatCard
          title="Ingresos cobrados"
          value={`$${summary.paidRevenue.toFixed(2)}`}
          hint={`Pendiente o vencido: $${summary.pendingRevenue.toFixed(2)}`}
        />
        <StatCard
          title="Registros de progreso"
          value={String(summary.progressCount)}
          hint={`Alertas activas: ${summary.alertCount}`}
        />
        <StatCard
          title="Mejor marca"
          value={summary.performance.pullups > 0 ? `${summary.performance.pullups} pullups` : "Sin datos"}
          hint={`Metas activas: ${summary.activeGoalsCount}`}
        />
      </div>

      <DashboardTrendGrid metrics={trendMetrics} />

      {chartData.length > 0 ? (
        <ProgressChart title="Evolucion filtrada del rendimiento" data={chartData} />
      ) : (
        <article className="card p-5">
          <p className="text-sm text-slate-600">No hay registros de progreso para el filtro seleccionado.</p>
        </article>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardGoalsPanel
          students={students}
          selectedStudentId={filters.selectedStudentId}
          goals={goalSnapshots}
          onCreateGoal={createGoal}
          onUpdateGoal={updateGoal}
          onDeleteGoal={deleteGoal}
        />
        <DashboardAlertsPanel alerts={alerts} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardStudentSummary rows={studentRows} />
        <DashboardRecentActivity entries={recentEntries} studentsById={studentsById} />
      </div>
    </section>
  );
}

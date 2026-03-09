"use client";

import { useMemo, useState } from "react";
import { ProgressChart } from "@/components/ProgressChart";
import { StatCard } from "@/components/StatCard";
import { DashboardAlertsPanel } from "@/components/dashboard/DashboardAlertsPanel";
import { DashboardExportActions } from "@/components/dashboard/DashboardExportActions";
import { DashboardGoalsPanel } from "@/components/dashboard/DashboardGoalsPanel";
import { DashboardRecentActivity } from "@/components/dashboard/DashboardRecentActivity";
import { DashboardStudentSummary } from "@/components/dashboard/DashboardStudentSummary";
import { DashboardTrendGrid } from "@/components/dashboard/DashboardTrendGrid";
import { downloadDashboardCsv, printDashboardReport } from "@/lib/dashboard/export";
import {
  buildChartData,
  buildCoverageCount,
  buildGoalAlerts,
  buildGoalSnapshots,
  buildMonthlyTrendMetrics,
  buildPerformanceSummary,
  buildStudentRows,
  filterGoals,
  filterPayments,
  filterProgressEntries,
  getDateOffset
} from "@/lib/dashboard/reporting";
import { GoalMetric, Payment, ProgressEntry, Student, StudentGoal } from "@/types/domain";

interface DashboardReportsProps {
  students: Student[];
  progressEntries: ProgressEntry[];
  payments: Payment[];
  goals: StudentGoal[];
  activeStudentCount: number;
}

export function DashboardReports({
  students,
  progressEntries,
  payments,
  goals: initialGoals,
  activeStudentCount
}: DashboardReportsProps) {
  const [selectedStudentId, setSelectedStudentId] = useState("all");
  const [startDate, setStartDate] = useState(getDateOffset(30));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [goals, setGoals] = useState<StudentGoal[]>(initialGoals);

  const studentsById = useMemo(() => Object.fromEntries(students.map((student) => [student.id, student])), [students]);

  const studentScopedProgress = useMemo(() => {
    return selectedStudentId === "all"
      ? progressEntries
      : progressEntries.filter((entry) => entry.student_id === selectedStudentId);
  }, [progressEntries, selectedStudentId]);

  const studentScopedPayments = useMemo(() => {
    return selectedStudentId === "all" ? payments : payments.filter((payment) => payment.student_id === selectedStudentId);
  }, [payments, selectedStudentId]);

  const studentScopedGoals = useMemo(() => filterGoals(goals, selectedStudentId), [goals, selectedStudentId]);

  const filteredProgress = useMemo(() => {
    return filterProgressEntries(progressEntries, selectedStudentId, startDate, endDate);
  }, [progressEntries, selectedStudentId, startDate, endDate]);

  const filteredPayments = useMemo(() => {
    return filterPayments(payments, selectedStudentId, startDate, endDate);
  }, [payments, selectedStudentId, startDate, endDate]);

  const chartData = useMemo(() => buildChartData(filteredProgress), [filteredProgress]);
  const performanceSummary = useMemo(() => buildPerformanceSummary(filteredProgress), [filteredProgress]);
  const coverageCount = useMemo(() => {
    return buildCoverageCount(filteredProgress, filteredPayments, selectedStudentId, studentsById);
  }, [filteredPayments, filteredProgress, selectedStudentId, studentsById]);
  const studentRows = useMemo(() => {
    return buildStudentRows(students, filteredProgress, filteredPayments, selectedStudentId);
  }, [filteredPayments, filteredProgress, selectedStudentId, students]);

  const recentEntries = useMemo(() => {
    return filteredProgress
      .slice()
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 10);
  }, [filteredProgress]);

  const paidRevenue = useMemo(() => {
    return filteredPayments
      .filter((payment) => payment.status === "paid")
      .reduce((total, payment) => total + Number(payment.amount), 0);
  }, [filteredPayments]);

  const pendingRevenue = useMemo(() => {
    return filteredPayments
      .filter((payment) => payment.status !== "paid")
      .reduce((total, payment) => total + Number(payment.amount), 0);
  }, [filteredPayments]);

  const monthlyTrendMetrics = useMemo(() => {
    return buildMonthlyTrendMetrics(studentScopedProgress, studentScopedPayments);
  }, [studentScopedPayments, studentScopedProgress]);

  const goalSnapshots = useMemo(() => {
    return buildGoalSnapshots(studentScopedGoals, studentScopedProgress, studentsById);
  }, [studentScopedGoals, studentScopedProgress, studentsById]);

  const alerts = useMemo(() => {
    return buildGoalAlerts(studentScopedGoals, studentScopedProgress, studentsById);
  }, [studentScopedGoals, studentScopedProgress, studentsById]);

  const activeFilterLabel =
    selectedStudentId === "all" ? "Todos los alumnos" : (studentsById[selectedStudentId]?.name ?? "Alumno");

  const createGoal = async (payload: {
    studentId: string;
    metric: GoalMetric;
    targetValue: number;
    targetDate: string;
    notes: string;
  }) => {
    const response = await fetch("/api/student-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("No se pudo crear la meta.");
    }

    const created = (await response.json()) as StudentGoal;
    setGoals((current) => [...current, created]);
  };

  const updateGoal = async (goalId: string, payload: Partial<Pick<StudentGoal, "status">>) => {
    const response = await fetch(`/api/student-goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("No se pudo actualizar la meta.");
    }

    const updated = (await response.json()) as StudentGoal;
    setGoals((current) => current.map((goal) => (goal.id === goalId ? updated : goal)));
  };

  const deleteGoal = async (goalId: string) => {
    const response = await fetch(`/api/student-goals/${goalId}`, { method: "DELETE" });

    if (!response.ok) {
      throw new Error("No se pudo eliminar la meta.");
    }

    setGoals((current) => current.filter((goal) => goal.id !== goalId));
  };

  const exportCsv = () => {
    downloadDashboardCsv({
      studentRows,
      progressEntries: filteredProgress,
      payments: filteredPayments,
      trendMetrics: monthlyTrendMetrics,
      studentNames: Object.fromEntries(students.map((student) => [student.id, student.name])),
      fileName: `calistrack-report-${selectedStudentId}-${endDate || "current"}.csv`
    });
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
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              setSelectedStudentId("all");
              setStartDate(getDateOffset(30));
              setEndDate(new Date().toISOString().slice(0, 10));
            }}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Resetear
          </button>
        </div>
        <div data-export-hidden="true" className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setStartDate(getDateOffset(7))}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
          >
            7 dias
          </button>
          <button
            onClick={() => setStartDate(getDateOffset(30))}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
          >
            30 dias
          </button>
          <button
            onClick={() => setStartDate(getDateOffset(90))}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
          >
            90 dias
          </button>
          <button
            onClick={() => setStartDate("")}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
          >
            Todo el historial
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Filtro activo: {activeFilterLabel} | Ventana: {startDate || "inicio"} a {endDate || "hoy"}
        </p>
      </article>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Alumnos activos" value={String(activeStudentCount)} hint={`En reporte: ${coverageCount}`} />
        <StatCard
          title="Ingresos cobrados"
          value={`$${paidRevenue.toFixed(2)}`}
          hint={`Pendiente o vencido: $${pendingRevenue.toFixed(2)}`}
        />
        <StatCard
          title="Registros de progreso"
          value={String(filteredProgress.length)}
          hint={`Alertas activas: ${alerts.length}`}
        />
        <StatCard
          title="Mejor marca"
          value={performanceSummary.pullups > 0 ? `${performanceSummary.pullups} pullups` : "Sin datos"}
          hint={`Metas activas: ${goalSnapshots.filter((goal) => goal.status === "active").length}`}
        />
      </div>

      <DashboardTrendGrid metrics={monthlyTrendMetrics} />

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
          selectedStudentId={selectedStudentId}
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

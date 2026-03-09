"use client";

import { useMemo, useState } from "react";
import { ProgressChart } from "@/components/ProgressChart";
import { StatCard } from "@/components/StatCard";
import { Payment, ProgressEntry, Student } from "@/types/domain";

interface DashboardReportsProps {
  students: Student[];
  progressEntries: ProgressEntry[];
  payments: Payment[];
  activeStudentCount: number;
}

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function inDateRange(value: string, startDate: string, endDate: string) {
  if (startDate && value < startDate) {
    return false;
  }

  if (endDate && value > endDate) {
    return false;
  }

  return true;
}

export function DashboardReports({
  students,
  progressEntries,
  payments,
  activeStudentCount
}: DashboardReportsProps) {
  const [selectedStudentId, setSelectedStudentId] = useState("all");
  const [startDate, setStartDate] = useState(getDateOffset(30));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const studentsById = useMemo(() => Object.fromEntries(students.map((student) => [student.id, student])), [students]);

  const filteredProgress = useMemo(() => {
    return progressEntries.filter((entry) => {
      const matchesStudent = selectedStudentId === "all" ? true : entry.student_id === selectedStudentId;
      return matchesStudent && inDateRange(entry.date, startDate, endDate);
    });
  }, [progressEntries, selectedStudentId, startDate, endDate]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesStudent = selectedStudentId === "all" ? true : payment.student_id === selectedStudentId;
      return matchesStudent && inDateRange(payment.date, startDate, endDate);
    });
  }, [payments, selectedStudentId, startDate, endDate]);

  const chartData = useMemo(() => {
    return filteredProgress
      .slice()
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((entry) => ({
        date: entry.date,
        pullups: entry.pullups,
        pushups: entry.pushups,
        muscle_ups: entry.muscle_ups,
        handstand_seconds: entry.handstand_seconds
      }));
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

  const coverageCount = useMemo(() => {
    if (selectedStudentId !== "all") {
      return studentsById[selectedStudentId] ? 1 : 0;
    }

    const ids = new Set<string>();
    filteredProgress.forEach((entry) => ids.add(entry.student_id));
    filteredPayments.forEach((payment) => ids.add(payment.student_id));
    return ids.size;
  }, [filteredPayments, filteredProgress, selectedStudentId, studentsById]);

  const performanceSummary = useMemo(() => {
    return filteredProgress.reduce(
      (summary, entry) => ({
        pullups: Math.max(summary.pullups, entry.pullups),
        pushups: Math.max(summary.pushups, entry.pushups),
        muscleUps: Math.max(summary.muscleUps, entry.muscle_ups),
        handstand: Math.max(summary.handstand, entry.handstand_seconds)
      }),
      { pullups: 0, pushups: 0, muscleUps: 0, handstand: 0 }
    );
  }, [filteredProgress]);

  const recentEntries = useMemo(() => {
    return filteredProgress
      .slice()
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 10);
  }, [filteredProgress]);

  const studentRows = useMemo(() => {
    return students
      .map((student) => {
        const progressForStudent = filteredProgress.filter((entry) => entry.student_id === student.id);
        const paymentsForStudent = filteredPayments.filter((payment) => payment.student_id === student.id);

        if (selectedStudentId === "all" && progressForStudent.length === 0 && paymentsForStudent.length === 0) {
          return null;
        }

        if (selectedStudentId !== "all" && student.id !== selectedStudentId) {
          return null;
        }

        const paidForStudent = paymentsForStudent
          .filter((payment) => payment.status === "paid")
          .reduce((total, payment) => total + Number(payment.amount), 0);

        const latestEntry = progressForStudent
          .slice()
          .sort((left, right) => right.date.localeCompare(left.date))[0];

        const bestPullups = progressForStudent.reduce((best, entry) => Math.max(best, entry.pullups), 0);

        return {
          id: student.id,
          name: student.name,
          level: student.level,
          records: progressForStudent.length,
          latestDate: latestEntry?.date ?? "-",
          bestPullups,
          paidForStudent
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
      .sort((left, right) => right.records - left.records || right.paidForStudent - left.paidForStudent);
  }, [filteredPayments, filteredProgress, selectedStudentId, students]);

  const activeFilterLabel =
    selectedStudentId === "all" ? "Todos los alumnos" : (studentsById[selectedStudentId]?.name ?? "Alumno");

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">
          Reportes por alumno y rango de fechas para seguimiento operativo y rendimiento.
        </p>
      </header>

      <article className="card p-5">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
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
        <div className="mt-3 flex flex-wrap gap-2">
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
        <StatCard
          title="Alumnos activos"
          value={String(activeStudentCount)}
          hint={`En reporte: ${coverageCount}`}
        />
        <StatCard
          title="Ingresos cobrados"
          value={`$${paidRevenue.toFixed(2)}`}
          hint={`Pendiente o vencido: $${pendingRevenue.toFixed(2)}`}
        />
        <StatCard
          title="Registros de progreso"
          value={String(filteredProgress.length)}
          hint={`Pagos en ventana: ${filteredPayments.length}`}
        />
        <StatCard
          title="Mejor marca"
          value={performanceSummary.pullups > 0 ? `${performanceSummary.pullups} pullups` : "Sin datos"}
          hint={`Handstand max: ${performanceSummary.handstand}s | Muscle up max: ${performanceSummary.muscleUps}`}
        />
      </div>

      {chartData.length > 0 ? (
        <ProgressChart title="Evolucion filtrada del rendimiento" data={chartData} />
      ) : (
        <article className="card p-5">
          <p className="text-sm text-slate-600">No hay registros de progreso para el filtro seleccionado.</p>
        </article>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Resumen por alumno</h3>
            <span className="text-sm text-slate-500">{studentRows.length} filas</span>
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
                {studentRows.map((row) => (
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

        <article className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Actividad reciente</h3>
            <span className="text-sm text-slate-500">{recentEntries.length} registros</span>
          </div>
          <div className="mt-4 space-y-3">
            {recentEntries.length === 0 ? (
              <p className="text-sm text-slate-600">No hay actividad reciente en la ventana seleccionada.</p>
            ) : (
              recentEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900">
                      {studentsById[entry.student_id]?.name ?? "Alumno desconocido"}
                    </span>
                    <span className="text-xs text-slate-500">{entry.date}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Pullups: {entry.pullups} | Pushups: {entry.pushups} | Muscle up: {entry.muscle_ups} | Handstand:{" "}
                    {entry.handstand_seconds}s
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

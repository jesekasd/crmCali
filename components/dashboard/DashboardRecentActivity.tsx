"use client";

import { ProgressEntry, Student } from "@/types/domain";

interface DashboardRecentActivityProps {
  entries: ProgressEntry[];
  studentsById: Record<string, Student>;
}

export function DashboardRecentActivity({ entries, studentsById }: DashboardRecentActivityProps) {
  return (
    <article className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Actividad reciente</h3>
        <span className="text-sm text-slate-500">{entries.length} registros</span>
      </div>
      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-600">No hay actividad reciente en la ventana seleccionada.</p>
        ) : (
          entries.map((entry) => (
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
  );
}

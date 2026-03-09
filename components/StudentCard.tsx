"use client";

import { useState } from "react";
import { Student, StudentStatus } from "@/types/domain";

type StudentUpdatePayload = Partial<Pick<Student, "name" | "level" | "goal" | "start_date" | "status">>;

interface StudentCardProps {
  student: Student;
  onSave: (id: string, payload: StudentUpdatePayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function StudentCard({ student, onSave, onDelete }: StudentCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: student.name,
    level: student.level,
    goal: student.goal ?? "",
    start_date: student.start_date,
    status: student.status as StudentStatus
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(student.id, draft);
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete(student.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setLoading(true);
    try {
      await onSave(student.id, { status: "active" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="card p-4">
      {editing ? (
        <div className="space-y-3">
          <input
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Nombre"
          />
          <select
            value={draft.level}
            onChange={(event) => setDraft((prev) => ({ ...prev, level: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <textarea
            value={draft.goal}
            onChange={(event) => setDraft((prev) => ({ ...prev, goal: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Objetivo"
            rows={2}
          />
          <input
            type="date"
            value={draft.start_date}
            onChange={(event) => setDraft((prev) => ({ ...prev, start_date: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={draft.status}
            onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value as StudentStatus }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="archived">Archivado</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || !draft.name}
              className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{student.name}</h3>
              <p className="text-sm text-slate-500">{student.level}</p>
            </div>
            <span
              className={
                student.status === "active"
                  ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
                  : student.status === "archived"
                    ? "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700"
                    : "rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
              }
            >
              {student.status}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-600">{student.goal || "Sin objetivo definido"}</p>
          <p className="mt-2 text-xs text-slate-500">Inicio: {student.start_date}</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
            >
              Editar
            </button>
            {student.status === "archived" ? (
              <button
                type="button"
                onClick={handleReactivate}
                disabled={loading}
                className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700"
              >
                Reactivar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700"
              >
                Archivar
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

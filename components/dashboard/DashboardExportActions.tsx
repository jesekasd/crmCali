"use client";

interface DashboardExportActionsProps {
  onExportCsv: () => void;
  onExportPdf: () => void;
}

export function DashboardExportActions({ onExportCsv, onExportPdf }: DashboardExportActionsProps) {
  return (
    <div data-export-hidden="true" className="flex flex-wrap gap-2">
      <button
        onClick={onExportCsv}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
      >
        Exportar CSV
      </button>
      <button
        onClick={onExportPdf}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Exportar PDF
      </button>
    </div>
  );
}

import { DashboardStudentRow, DashboardTrendMetric } from "@/lib/dashboard/types";
import { Payment, ProgressEntry } from "@/types/domain";

function escapeCsv(value: string | number) {
  const serialized = String(value);
  if (serialized.includes(",") || serialized.includes('"') || serialized.includes("\n")) {
    return `"${serialized.replace(/"/g, '""')}"`;
  }

  return serialized;
}

export function downloadDashboardCsv(params: {
  studentRows: DashboardStudentRow[];
  progressEntries: ProgressEntry[];
  payments: Payment[];
  trendMetrics: DashboardTrendMetric[];
  studentNames: Record<string, string>;
  fileName: string;
}) {
  const csv = buildDashboardCsv(params);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = params.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildDashboardCsv(params: {
  studentRows: DashboardStudentRow[];
  progressEntries: ProgressEntry[];
  payments: Payment[];
  trendMetrics: DashboardTrendMetric[];
  studentNames: Record<string, string>;
}) {
  const sections = [
    ["Resumen por alumno"],
    ["Alumno", "Nivel", "Registros", "Ultimo", "Mejor pullups", "Cobrado"],
    ...params.studentRows.map((row) => [
      row.name,
      row.level,
      row.records,
      row.latestDate,
      row.bestPullups,
      row.paidForStudent.toFixed(2)
    ]),
    [],
    ["Comparativas mensuales"],
    ["Metrica", "Actual", "Anterior", "Delta %"],
    ...params.trendMetrics.map((metric) => [
      metric.label,
      metric.currentValue.toFixed(2),
      metric.previousValue.toFixed(2),
      metric.deltaPercentage === null ? "n/a" : metric.deltaPercentage.toFixed(1)
    ]),
    [],
    ["Actividad reciente"],
    ["Fecha", "Alumno", "Pullups", "Pushups", "Muscle up", "Handstand seconds"],
    ...params.progressEntries.map((entry) => [
      entry.date,
      params.studentNames[entry.student_id] ?? entry.student_id,
      entry.pullups,
      entry.pushups,
      entry.muscle_ups,
      entry.handstand_seconds
    ]),
    [],
    ["Pagos"],
    ["Fecha", "Alumno", "Monto", "Estado"],
    ...params.payments.map((payment) => [
      payment.date,
      params.studentNames[payment.student_id] ?? payment.student_id,
      Number(payment.amount).toFixed(2),
      payment.status
    ])
  ];

  return sections.map((row) => row.map((value) => escapeCsv(value)).join(",")).join("\n");
}

export function printDashboardReport(reportTitle: string) {
  const root = document.getElementById("dashboard-report-root");
  if (!root) {
    return;
  }

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
  if (!printWindow) {
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1, h2, h3 { margin: 0 0 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
          .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
          [data-export-hidden="true"] { display: none !important; }
        </style>
      </head>
      <body>
        <h1>${reportTitle}</h1>
        ${root.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function getDashboardExportFileName(selectedStudentId: string, endDate: string) {
  return `calistrack-report-${selectedStudentId}-${endDate || "current"}.csv`;
}

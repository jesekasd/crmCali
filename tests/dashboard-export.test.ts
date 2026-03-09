import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardCsv, getDashboardExportFileName } from "@/lib/dashboard/export";

test("buildDashboardCsv serializes sections and escapes values", () => {
  const csv = buildDashboardCsv({
    studentRows: [
      {
        id: "student-1",
        name: 'Alicia "Coach"',
        level: "advanced",
        records: 4,
        latestDate: "2026-03-09",
        bestPullups: 20,
        paidForStudent: 120
      }
    ],
    progressEntries: [
      {
        id: "progress-1",
        student_id: "student-1",
        pullups: 20,
        pushups: 35,
        muscle_ups: 2,
        handstand_seconds: 40,
        date: "2026-03-09",
        created_at: "2026-03-09T00:00:00.000Z"
      }
    ],
    payments: [
      {
        id: "payment-1",
        student_id: "student-1",
        amount: 120,
        status: "paid",
        date: "2026-03-08",
        created_at: "2026-03-08T00:00:00.000Z"
      }
    ],
    trendMetrics: [
      {
        label: "Ingresos del mes",
        currentValue: 120,
        previousValue: 80,
        deltaPercentage: 50,
        format: "currency"
      }
    ],
    studentNames: {
      "student-1": 'Alicia "Coach"'
    }
  });

  assert.match(csv, /Resumen por alumno/);
  assert.match(csv, /"Alicia ""Coach"""/);
  assert.match(csv, /Pagos/);
});

test("getDashboardExportFileName uses the selected student and range end", () => {
  assert.equal(getDashboardExportFileName("student-1", "2026-03-09"), "calistrack-report-student-1-2026-03-09.csv");
  assert.equal(getDashboardExportFileName("all", ""), "calistrack-report-all-current.csv");
});

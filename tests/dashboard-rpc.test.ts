import test from "node:test";
import assert from "node:assert/strict";
import {
  getDashboardStudentRowsFromRpc,
  getDashboardTrendMetricsFromRpc,
  mapDashboardSummaryStats
} from "@/lib/dashboard/rpc";
import { Payment, ProgressEntry, Student } from "@/types/domain";

const student: Student = {
  id: "student-1",
  coach_id: "coach-1",
  name: "Bruno",
  level: "advanced",
  goal: "Planche",
  start_date: "2026-01-01",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z"
};

test("getDashboardTrendMetricsFromRpc maps rpc rows into UI metrics", async () => {
  const result = await getDashboardTrendMetricsFromRpc({
    supabase: {
      rpc: async () => ({
        data: [
          {
            sort_order: 2,
            label: "Registros del mes",
            current_value: "8",
            previous_value: "4",
            delta_percentage: "100",
            format: "integer"
          },
          {
            sort_order: 1,
            label: "Ingresos del mes",
            current_value: "120",
            previous_value: "100",
            delta_percentage: "20",
            format: "currency"
          }
        ],
        error: null
      })
    },
    studentIds: [student.id],
    referenceDate: "2026-03-09",
    fallbackProgress: [],
    fallbackPayments: []
  });

  assert.equal(result[0]?.label, "Ingresos del mes");
  assert.equal(result[0]?.currentValue, 120);
  assert.equal(result[1]?.deltaPercentage, 100);
});

test("getDashboardTrendMetricsFromRpc falls back when rpc is unavailable", async () => {
  const fallbackProgress: ProgressEntry[] = [
    {
      id: "progress-1",
      student_id: student.id,
      pullups: 10,
      pushups: 20,
      muscle_ups: 1,
      handstand_seconds: 30,
      date: "2026-03-02",
      created_at: "2026-03-02T00:00:00.000Z"
    }
  ];

  const fallbackPayments: Payment[] = [
    {
      id: "payment-1",
      student_id: student.id,
      amount: 50,
      status: "paid",
      date: "2026-03-03",
      created_at: "2026-03-03T00:00:00.000Z"
    }
  ];

  const result = await getDashboardTrendMetricsFromRpc({
    supabase: {
      rpc: async () => ({
        data: null,
        error: { message: "Could not find the function public.dashboard_trend_metrics" }
      })
    },
    studentIds: [student.id],
    referenceDate: "2026-03-09",
    fallbackProgress,
    fallbackPayments
  });

  assert.equal(result[0]?.currentValue, 50);
});

test("getDashboardStudentRowsFromRpc maps rpc summaries and respects selected student", async () => {
  const result = await getDashboardStudentRowsFromRpc({
    supabase: {
      rpc: async () => ({
        data: [
          {
            student_id: student.id,
            records: 5,
            latest_date: "2026-03-08",
            best_pullups: 18,
            paid_for_student: "150"
          }
        ],
        error: null
      })
    },
    students: [student],
    studentIds: [student.id],
    startDate: "2026-03-01",
    endDate: "2026-03-09",
    selectedStudentId: student.id,
    fallbackProgress: [],
    fallbackPayments: []
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.bestPullups, 18);
  assert.equal(result[0]?.paidForStudent, 150);
});

test("mapDashboardSummaryStats maps numeric strings into dashboard summary shape", () => {
  const summary = mapDashboardSummaryStats({
    row: {
      progress_count: "12",
      paid_revenue: "140",
      pending_revenue: "30",
      best_pullups: "18",
      best_pushups: "40",
      best_muscle_ups: "3",
      best_handstand: "45",
      coverage_count: "4"
    },
    activeStudentCount: 6,
    alertCount: 2,
    activeGoalsCount: 5
  });

  assert.equal(summary.activeStudentCount, 6);
  assert.equal(summary.coverageCount, 4);
  assert.equal(summary.paidRevenue, 140);
  assert.equal(summary.performance.handstand, 45);
});

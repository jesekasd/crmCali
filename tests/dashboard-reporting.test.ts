import test from "node:test";
import assert from "node:assert/strict";
import { buildGoalAlerts, buildMonthlyTrendMetrics, getGoalEffectiveStatus } from "@/lib/dashboard/reporting";
import { Payment, ProgressEntry, Student, StudentGoal } from "@/types/domain";

const student: Student = {
  id: "student-1",
  coach_id: "coach-1",
  name: "Alicia",
  level: "intermediate",
  goal: "Muscle up",
  start_date: "2026-01-01",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z"
};

const studentsById = { [student.id]: student };

test("buildMonthlyTrendMetrics returns null delta when current month exists but previous is zero", () => {
  const progressEntries: ProgressEntry[] = [
    {
      id: "progress-1",
      student_id: student.id,
      pullups: 12,
      pushups: 30,
      muscle_ups: 1,
      handstand_seconds: 25,
      date: "2026-03-05",
      created_at: "2026-03-05T00:00:00.000Z"
    }
  ];

  const payments: Payment[] = [
    {
      id: "payment-1",
      student_id: student.id,
      amount: 40,
      status: "paid",
      date: "2026-03-04",
      created_at: "2026-03-04T00:00:00.000Z"
    }
  ];

  const [revenueMetric] = buildMonthlyTrendMetrics(progressEntries, payments, "2026-03-09");
  assert.equal(revenueMetric.currentValue, 40);
  assert.equal(revenueMetric.previousValue, 0);
  assert.equal(revenueMetric.deltaPercentage, null);
});

test("getGoalEffectiveStatus prefers archived and completed states", () => {
  const activeGoal: StudentGoal = {
    id: "goal-active",
    student_id: student.id,
    metric: "pullups",
    target_value: 15,
    target_date: "2026-03-20",
    status: "active",
    notes: null,
    created_at: "2026-03-01T00:00:00.000Z"
  };

  const archivedGoal = { ...activeGoal, id: "goal-archived", status: "archived" };

  assert.equal(getGoalEffectiveStatus(activeGoal, 10), "active");
  assert.equal(getGoalEffectiveStatus(activeGoal, 15), "completed");
  assert.equal(getGoalEffectiveStatus(archivedGoal, 20), "archived");
});

test("buildGoalAlerts surfaces overdue and stagnant goals", () => {
  const goals: StudentGoal[] = [
    {
      id: "goal-overdue",
      student_id: student.id,
      metric: "pullups",
      target_value: 20,
      target_date: "2026-03-01",
      status: "active",
      notes: null,
      created_at: "2026-02-01T00:00:00.000Z"
    },
    {
      id: "goal-stagnant",
      student_id: student.id,
      metric: "handstand_seconds",
      target_value: 45,
      target_date: "2026-04-01",
      status: "active",
      notes: null,
      created_at: "2026-02-01T00:00:00.000Z"
    }
  ];

  const entries: ProgressEntry[] = [
    {
      id: "progress-1",
      student_id: student.id,
      pullups: 10,
      pushups: 20,
      muscle_ups: 0,
      handstand_seconds: 20,
      date: "2026-02-10",
      created_at: "2026-02-10T00:00:00.000Z"
    },
    {
      id: "progress-2",
      student_id: student.id,
      pullups: 12,
      pushups: 22,
      muscle_ups: 0,
      handstand_seconds: 20,
      date: "2026-02-20",
      created_at: "2026-02-20T00:00:00.000Z"
    },
    {
      id: "progress-3",
      student_id: student.id,
      pullups: 12,
      pushups: 23,
      muscle_ups: 0,
      handstand_seconds: 20,
      date: "2026-03-01",
      created_at: "2026-03-01T00:00:00.000Z"
    },
    {
      id: "progress-4",
      student_id: student.id,
      pullups: 12,
      pushups: 24,
      muscle_ups: 0,
      handstand_seconds: 20,
      date: "2026-03-05",
      created_at: "2026-03-05T00:00:00.000Z"
    }
  ];

  const alerts = buildGoalAlerts(goals, entries, studentsById, "2026-03-09");
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0]?.severity, "critical");
  assert.match(alerts[0]?.title ?? "", /Meta vencida/);
  assert.equal(alerts[1]?.severity, "warning");
  assert.match(alerts[1]?.title ?? "", /Progreso estancado/);
});

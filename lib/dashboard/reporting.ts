import { Payment, ProgressEntry, Student, StudentGoal, GoalMetric } from "@/types/domain";
import {
  DashboardAlert,
  DashboardChartPoint,
  DashboardGoalSnapshot,
  DashboardPerformanceSummary,
  DashboardStudentRow,
  DashboardTrendMetric
} from "@/lib/dashboard/types";

export function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function getDateOffset(days: number, referenceDate = new Date()) {
  const date = new Date(referenceDate);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function inDateRange(value: string, startDate: string, endDate: string) {
  if (startDate && value < startDate) {
    return false;
  }

  if (endDate && value > endDate) {
    return false;
  }

  return true;
}

export function filterProgressEntries(
  entries: ProgressEntry[],
  selectedStudentId: string,
  startDate: string,
  endDate: string
) {
  return entries.filter((entry) => {
    const matchesStudent = selectedStudentId === "all" ? true : entry.student_id === selectedStudentId;
    return matchesStudent && inDateRange(entry.date, startDate, endDate);
  });
}

export function filterPayments(payments: Payment[], selectedStudentId: string, startDate: string, endDate: string) {
  return payments.filter((payment) => {
    const matchesStudent = selectedStudentId === "all" ? true : payment.student_id === selectedStudentId;
    return matchesStudent && inDateRange(payment.date, startDate, endDate);
  });
}

export function filterGoals(goals: StudentGoal[], selectedStudentId: string) {
  return goals.filter((goal) => (selectedStudentId === "all" ? true : goal.student_id === selectedStudentId));
}

export function buildChartData(filteredProgress: ProgressEntry[]): DashboardChartPoint[] {
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
}

export function buildPerformanceSummary(filteredProgress: ProgressEntry[]): DashboardPerformanceSummary {
  return filteredProgress.reduce(
    (summary, entry) => ({
      pullups: Math.max(summary.pullups, entry.pullups),
      pushups: Math.max(summary.pushups, entry.pushups),
      muscleUps: Math.max(summary.muscleUps, entry.muscle_ups),
      handstand: Math.max(summary.handstand, entry.handstand_seconds)
    }),
    { pullups: 0, pushups: 0, muscleUps: 0, handstand: 0 }
  );
}

export function buildCoverageCount(
  filteredProgress: ProgressEntry[],
  filteredPayments: Payment[],
  selectedStudentId: string,
  studentsById: Record<string, Student>
) {
  if (selectedStudentId !== "all") {
    return studentsById[selectedStudentId] ? 1 : 0;
  }

  const ids = new Set<string>();
  filteredProgress.forEach((entry) => ids.add(entry.student_id));
  filteredPayments.forEach((payment) => ids.add(payment.student_id));
  return ids.size;
}

export function buildStudentRows(
  students: Student[],
  filteredProgress: ProgressEntry[],
  filteredPayments: Payment[],
  selectedStudentId: string
): DashboardStudentRow[] {
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
    .filter((value): value is DashboardStudentRow => Boolean(value))
    .sort((left, right) => right.records - left.records || right.paidForStudent - left.paidForStudent);
}

function getMonthKey(dateValue: string) {
  return dateValue.slice(0, 7);
}

function getPreviousMonthKey(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (month === 1) {
    return `${year - 1}-12`;
  }

  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function calculateDeltaPercentage(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : null;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
}

export function buildMonthlyTrendMetrics(
  progressEntries: ProgressEntry[],
  payments: Payment[],
  referenceDate = getTodayIso()
): DashboardTrendMetric[] {
  const currentMonthKey = referenceDate.slice(0, 7);
  const previousMonthKey = getPreviousMonthKey(currentMonthKey);

  const currentMonthPayments = payments.filter(
    (payment) => getMonthKey(payment.date) === currentMonthKey && payment.status === "paid"
  );
  const previousMonthPayments = payments.filter(
    (payment) => getMonthKey(payment.date) === previousMonthKey && payment.status === "paid"
  );

  const currentMonthProgress = progressEntries.filter((entry) => getMonthKey(entry.date) === currentMonthKey);
  const previousMonthProgress = progressEntries.filter((entry) => getMonthKey(entry.date) === previousMonthKey);

  const currentRevenue = currentMonthPayments.reduce((total, payment) => total + Number(payment.amount), 0);
  const previousRevenue = previousMonthPayments.reduce((total, payment) => total + Number(payment.amount), 0);

  const currentAvgPullups = average(currentMonthProgress.map((entry) => entry.pullups));
  const previousAvgPullups = average(previousMonthProgress.map((entry) => entry.pullups));

  const currentAvgHandstand = average(currentMonthProgress.map((entry) => entry.handstand_seconds));
  const previousAvgHandstand = average(previousMonthProgress.map((entry) => entry.handstand_seconds));

  return [
    {
      label: "Ingresos del mes",
      currentValue: currentRevenue,
      previousValue: previousRevenue,
      deltaPercentage: calculateDeltaPercentage(currentRevenue, previousRevenue),
      format: "currency"
    },
    {
      label: "Registros del mes",
      currentValue: currentMonthProgress.length,
      previousValue: previousMonthProgress.length,
      deltaPercentage: calculateDeltaPercentage(currentMonthProgress.length, previousMonthProgress.length),
      format: "integer"
    },
    {
      label: "Promedio pullups",
      currentValue: currentAvgPullups,
      previousValue: previousAvgPullups,
      deltaPercentage: calculateDeltaPercentage(currentAvgPullups, previousAvgPullups),
      format: "integer"
    },
    {
      label: "Promedio handstand",
      currentValue: currentAvgHandstand,
      previousValue: previousAvgHandstand,
      deltaPercentage: calculateDeltaPercentage(currentAvgHandstand, previousAvgHandstand),
      format: "seconds"
    }
  ];
}

function getMetricValue(entry: ProgressEntry, metric: GoalMetric) {
  if (metric === "pullups") {
    return entry.pullups;
  }

  if (metric === "pushups") {
    return entry.pushups;
  }

  if (metric === "muscle_ups") {
    return entry.muscle_ups;
  }

  return entry.handstand_seconds;
}

export function getMetricLabel(metric: GoalMetric) {
  if (metric === "pullups") {
    return "Pullups";
  }

  if (metric === "pushups") {
    return "Pushups";
  }

  if (metric === "muscle_ups") {
    return "Muscle up";
  }

  return "Handstand";
}

export function buildGoalSnapshots(
  goals: StudentGoal[],
  progressEntries: ProgressEntry[],
  studentsById: Record<string, Student>
): DashboardGoalSnapshot[] {
  return goals
    .map((goal) => {
      const entriesForStudent = progressEntries.filter((entry) => entry.student_id === goal.student_id);
      const currentValue = entriesForStudent.reduce((best, entry) => Math.max(best, getMetricValue(entry, goal.metric as GoalMetric)), 0);
      const achieved = currentValue >= goal.target_value;

      return {
        id: goal.id,
        studentId: goal.student_id,
        studentName: studentsById[goal.student_id]?.name ?? "Alumno desconocido",
        metric: goal.metric as GoalMetric,
        targetValue: goal.target_value,
        targetDate: goal.target_date,
        status: goal.status,
        notes: goal.notes,
        currentValue,
        progressRatio: goal.target_value === 0 ? 1 : Math.min(currentValue / goal.target_value, 1),
        achieved
      };
    })
    .sort((left, right) => left.targetDate.localeCompare(right.targetDate));
}

function hasStagnated(entriesForStudent: ProgressEntry[], metric: GoalMetric, referenceDate: string) {
  const recentStartDate = getDateOffset(21, new Date(`${referenceDate}T00:00:00`));
  const recentEntries = entriesForStudent
    .filter((entry) => entry.date >= recentStartDate)
    .sort((left, right) => left.date.localeCompare(right.date));

  if (recentEntries.length < 3) {
    return false;
  }

  const previousEntries = entriesForStudent.filter((entry) => entry.date < recentStartDate);
  const recentBest = recentEntries.reduce((best, entry) => Math.max(best, getMetricValue(entry, metric)), 0);
  const previousBest = previousEntries.reduce((best, entry) => Math.max(best, getMetricValue(entry, metric)), 0);

  if (previousEntries.length > 0) {
    return recentBest <= previousBest;
  }

  const distinctRecentValues = new Set(recentEntries.map((entry) => getMetricValue(entry, metric)));
  return distinctRecentValues.size === 1;
}

export function buildGoalAlerts(
  goals: StudentGoal[],
  progressEntries: ProgressEntry[],
  studentsById: Record<string, Student>,
  referenceDate = getTodayIso()
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  goals
    .filter((goal) => goal.status === "active")
    .forEach((goal) => {
      const metric = goal.metric as GoalMetric;
      const entriesForStudent = progressEntries
        .filter((entry) => entry.student_id === goal.student_id)
        .sort((left, right) => right.date.localeCompare(left.date));

      const bestValue = entriesForStudent.reduce((best, entry) => Math.max(best, getMetricValue(entry, metric)), 0);
      const studentName = studentsById[goal.student_id]?.name ?? "Alumno desconocido";

      if (goal.target_date < referenceDate && bestValue < goal.target_value) {
        alerts.push({
          id: `overdue-${goal.id}`,
          studentId: goal.student_id,
          studentName,
          metric,
          severity: "critical",
          title: "Meta vencida",
          description: `${studentName} no alcanzo ${goal.target_value} ${getMetricLabel(metric)} antes de ${goal.target_date}.`
        });
        return;
      }

      if (hasStagnated(entriesForStudent, metric, referenceDate) && bestValue < goal.target_value) {
        alerts.push({
          id: `stagnation-${goal.id}`,
          studentId: goal.student_id,
          studentName,
          metric,
          severity: "warning",
          title: "Progreso estancado",
          description: `${studentName} no mejoro ${getMetricLabel(metric)} en los ultimos 21 dias.`
        });
      }
    });

  return alerts.sort((left, right) => {
    if (left.severity === right.severity) {
      return left.studentName.localeCompare(right.studentName);
    }

    return left.severity === "critical" ? -1 : 1;
  });
}

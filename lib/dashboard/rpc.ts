import { buildMonthlyTrendMetrics, buildStudentRows } from "@/lib/dashboard/reporting";
import { DashboardPerformanceSummary, DashboardStudentRow, DashboardSummaryStats, DashboardTrendMetric } from "@/lib/dashboard/types";
import { Payment, ProgressEntry, Student } from "@/types/domain";

interface DashboardStudentSummaryRow {
  student_id: string;
  records: number;
  latest_date: string | null;
  best_pullups: number;
  paid_for_student: number | string;
}

interface DashboardTrendMetricRow {
  sort_order: number;
  label: string;
  current_value: number | string;
  previous_value: number | string;
  delta_percentage: number | string | null;
  format: string;
}

interface DashboardSummaryStatsRow {
  progress_count: number | string;
  paid_revenue: number | string;
  pending_revenue: number | string;
  best_pullups: number | string;
  best_pushups: number | string;
  best_muscle_ups: number | string;
  best_handstand: number | string;
  coverage_count: number | string;
}

export function isFunctionMissingError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      (error.message.includes("Could not find the function") || error.message.includes("function") || error.message.includes("PGRST"))
  );
}

export function mapDashboardTrendMetrics(rows: DashboardTrendMetricRow[]) {
  return rows
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map(
      (row): DashboardTrendMetric => ({
        label: row.label,
        currentValue: Number(row.current_value),
        previousValue: Number(row.previous_value),
        deltaPercentage: row.delta_percentage === null ? null : Number(row.delta_percentage),
        format: row.format as DashboardTrendMetric["format"]
      })
    );
}

export function mapDashboardStudentRows(
  rows: DashboardStudentSummaryRow[],
  students: Student[],
  selectedStudentId: string
) {
  const rowsByStudentId = new Map(
    rows.map((row) => [
      row.student_id,
      {
        records: Number(row.records),
        latestDate: row.latest_date ?? "-",
        bestPullups: Number(row.best_pullups),
        paidForStudent: Number(row.paid_for_student)
      }
    ])
  );

  return students
    .map((student) => {
      const summary = rowsByStudentId.get(student.id);

      if (selectedStudentId !== "all" && student.id !== selectedStudentId) {
        return null;
      }

      if (selectedStudentId === "all" && !summary) {
        return null;
      }

      return {
        id: student.id,
        name: student.name,
        level: student.level,
        records: summary?.records ?? 0,
        latestDate: summary?.latestDate ?? "-",
        bestPullups: summary?.bestPullups ?? 0,
        paidForStudent: summary?.paidForStudent ?? 0
      };
    })
    .filter((value): value is DashboardStudentRow => Boolean(value))
    .sort((left, right) => right.records - left.records || right.paidForStudent - left.paidForStudent);
}

export function mapDashboardSummaryStats(params: {
  row: DashboardSummaryStatsRow;
  activeStudentCount: number;
  alertCount: number;
  activeGoalsCount: number;
}) {
  const { row, activeStudentCount, alertCount, activeGoalsCount } = params;
  const performance: DashboardPerformanceSummary = {
    pullups: Number(row.best_pullups),
    pushups: Number(row.best_pushups),
    muscleUps: Number(row.best_muscle_ups),
    handstand: Number(row.best_handstand)
  };

  return {
    activeStudentCount,
    coverageCount: Number(row.coverage_count),
    paidRevenue: Number(row.paid_revenue),
    pendingRevenue: Number(row.pending_revenue),
    progressCount: Number(row.progress_count),
    alertCount,
    activeGoalsCount,
    performance
  } satisfies DashboardSummaryStats;
}

export async function getDashboardTrendMetricsFromRpc(params: {
  supabase: any;
  studentIds: string[];
  referenceDate: string;
  fallbackProgress: ProgressEntry[];
  fallbackPayments: Payment[];
}) {
  const { supabase, studentIds, referenceDate, fallbackProgress, fallbackPayments } = params;

  if (studentIds.length === 0) {
    return buildMonthlyTrendMetrics([], [], referenceDate);
  }

  const { data, error } = await supabase.rpc("dashboard_trend_metrics", {
    p_student_ids: studentIds,
    p_reference_date: referenceDate
  });

  if (error || !Array.isArray(data)) {
    if (error && !isFunctionMissingError(error)) {
      console.error("dashboard_trend_metrics rpc failed", error);
    }

    return buildMonthlyTrendMetrics(fallbackProgress, fallbackPayments, referenceDate);
  }

  return mapDashboardTrendMetrics(data as DashboardTrendMetricRow[]);
}

export async function getDashboardStudentRowsFromRpc(params: {
  supabase: any;
  students: Student[];
  studentIds: string[];
  startDate: string;
  endDate: string;
  selectedStudentId: string;
  fallbackProgress: ProgressEntry[];
  fallbackPayments: Payment[];
}) {
  const { supabase, students, studentIds, startDate, endDate, selectedStudentId, fallbackProgress, fallbackPayments } = params;

  if (studentIds.length === 0) {
    return [] as DashboardStudentRow[];
  }

  const { data, error } = await supabase.rpc("dashboard_student_summary", {
    p_student_ids: studentIds,
    p_start_date: startDate || null,
    p_end_date: endDate || null
  });

  if (error || !Array.isArray(data)) {
    if (error && !isFunctionMissingError(error)) {
      console.error("dashboard_student_summary rpc failed", error);
    }

    return buildStudentRows(students, fallbackProgress, fallbackPayments, selectedStudentId);
  }

  return mapDashboardStudentRows(data as DashboardStudentSummaryRow[], students, selectedStudentId);
}

export async function getDashboardSummaryStatsFromRpc(params: {
  supabase: any;
  studentIds: string[];
  startDate: string;
  endDate: string;
  activeStudentCount: number;
  alertCount: number;
  activeGoalsCount: number;
  fallbackProgress: ProgressEntry[];
  fallbackPayments: Payment[];
  fallbackCoverageCount: number;
}) {
  const {
    supabase,
    studentIds,
    startDate,
    endDate,
    activeStudentCount,
    alertCount,
    activeGoalsCount,
    fallbackProgress,
    fallbackPayments,
    fallbackCoverageCount
  } = params;

  if (studentIds.length === 0) {
    return {
      activeStudentCount,
      coverageCount: 0,
      paidRevenue: 0,
      pendingRevenue: 0,
      progressCount: 0,
      alertCount,
      activeGoalsCount,
      performance: { pullups: 0, pushups: 0, muscleUps: 0, handstand: 0 }
    } satisfies DashboardSummaryStats;
  }

  const { data, error } = await supabase.rpc("dashboard_summary_stats", {
    p_student_ids: studentIds,
    p_start_date: startDate || null,
    p_end_date: endDate || null
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    if (error && !isFunctionMissingError(error)) {
      console.error("dashboard_summary_stats rpc failed", error);
    }

    const performance: DashboardPerformanceSummary = fallbackProgress.reduce(
      (summary, entry) => ({
        pullups: Math.max(summary.pullups, entry.pullups),
        pushups: Math.max(summary.pushups, entry.pushups),
        muscleUps: Math.max(summary.muscleUps, entry.muscle_ups),
        handstand: Math.max(summary.handstand, entry.handstand_seconds)
      }),
      { pullups: 0, pushups: 0, muscleUps: 0, handstand: 0 }
    );

    return {
      activeStudentCount,
      coverageCount: fallbackCoverageCount,
      paidRevenue: fallbackPayments
        .filter((payment) => payment.status === "paid")
        .reduce((total, payment) => total + Number(payment.amount), 0),
      pendingRevenue: fallbackPayments
        .filter((payment) => payment.status !== "paid")
        .reduce((total, payment) => total + Number(payment.amount), 0),
      progressCount: fallbackProgress.length,
      alertCount,
      activeGoalsCount,
      performance
    } satisfies DashboardSummaryStats;
  }

  return mapDashboardSummaryStats({
    row: data[0] as DashboardSummaryStatsRow,
    activeStudentCount,
    alertCount,
    activeGoalsCount
  });
}

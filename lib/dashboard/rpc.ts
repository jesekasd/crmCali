import { buildMonthlyTrendMetrics, buildStudentRows } from "@/lib/dashboard/reporting";
import { DashboardStudentRow, DashboardTrendMetric } from "@/lib/dashboard/types";
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

function isFunctionMissingError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      (error.message.includes("Could not find the function") || error.message.includes("function") || error.message.includes("PGRST"))
  );
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

  return (data as DashboardTrendMetricRow[])
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

  const rowsByStudentId = new Map(
    (data as DashboardStudentSummaryRow[]).map((row) => [
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

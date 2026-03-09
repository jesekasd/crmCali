import {
  buildChartData,
  buildCoverageCount,
  buildGoalAlerts,
  buildGoalSnapshots,
  buildMonthlyTrendMetrics,
  buildStudentRows,
  getDateOffset,
  getTodayIso
} from "@/lib/dashboard/reporting";
import {
  isFunctionMissingError,
  mapDashboardStudentRows,
  mapDashboardSummaryStats,
  mapDashboardTrendMetrics
} from "@/lib/dashboard/rpc";
import { normalizeDateParam, parseScalarParam } from "@/lib/search-params";
import { DashboardFilterState, DashboardViewModel } from "@/lib/dashboard/types";
import { Payment, ProgressEntry, Student, StudentGoal } from "@/types/domain";

const DASHBOARD_RECENT_ENTRIES_LIMIT = 10;
const DASHBOARD_CHART_POINTS_LIMIT = 180;

interface DashboardDataParams {
  supabase: any;
  students: Student[];
  searchParams?: { [key: string]: string | string[] | undefined };
}

interface DashboardScope {
  today: string;
  filters: DashboardFilterState;
  selectedStudentId: string;
  scopedStudentIds: string[];
  activeStudentCount: number;
  studentsById: Record<string, Student>;
}

type DashboardSummaryRpcRow = {
  progress_count: number | string;
  paid_revenue: number | string;
  pending_revenue: number | string;
  best_pullups: number | string;
  best_pushups: number | string;
  best_muscle_ups: number | string;
  best_handstand: number | string;
  coverage_count: number | string;
};

type DashboardTrendRpcRow = {
  sort_order: number;
  label: string;
  current_value: number | string;
  previous_value: number | string;
  delta_percentage: number | string | null;
  format: string;
};

type DashboardStudentSummaryRpcRow = {
  student_id: string;
  records: number;
  latest_date: string | null;
  best_pullups: number;
  paid_for_student: number | string;
};

function applyDateRange(query: any, startDate: string, endDate: string) {
  let scopedQuery = query;

  if (startDate) {
    scopedQuery = scopedQuery.gte("date", startDate);
  }

  if (endDate) {
    scopedQuery = scopedQuery.lte("date", endDate);
  }

  return scopedQuery;
}

function getPreviousMonthStart(dateValue: string) {
  const [yearText, monthText] = dateValue.slice(0, 7).split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (month === 1) {
    return `${year - 1}-12-01`;
  }

  return `${year}-${String(month - 1).padStart(2, "0")}-01`;
}

function resolveDashboardScope(students: Student[], searchParams?: { [key: string]: string | string[] | undefined }): DashboardScope {
  const today = getTodayIso();
  const defaultStartDate = getDateOffset(30);
  const selectedStudentParam = parseScalarParam(searchParams?.student);
  const startDate = normalizeDateParam(searchParams?.start, defaultStartDate);
  const endDate = normalizeDateParam(searchParams?.end, today);

  const selectedStudentId =
    selectedStudentParam && students.some((student) => student.id === selectedStudentParam) ? selectedStudentParam : "all";

  return {
    today,
    filters: {
      selectedStudentId,
      startDate,
      endDate
    },
    selectedStudentId,
    scopedStudentIds:
      selectedStudentId === "all"
        ? students.map((student) => student.id)
        : students.filter((student) => student.id === selectedStudentId).map((student) => student.id),
    activeStudentCount: students.filter((student) => student.status === "active").length,
    studentsById: Object.fromEntries(students.map((student) => [student.id, student]))
  };
}

function buildEmptyViewModel(scope: DashboardScope): DashboardViewModel {
  return {
    filters: scope.filters,
    chartData: [],
    studentRows: [],
    recentEntriesCount: 0,
    trendMetrics: [],
    goalSnapshots: [],
    alerts: [],
    summary: {
      activeStudentCount: scope.activeStudentCount,
      coverageCount: 0,
      paidRevenue: 0,
      pendingRevenue: 0,
      progressCount: 0,
      alertCount: 0,
      activeGoalsCount: 0,
      performance: { pullups: 0, pushups: 0, muscleUps: 0, handstand: 0 }
    }
  };
}

async function getGoalProgress(supabase: any, goalStudentIds: string[]) {
  if (goalStudentIds.length === 0) {
    return [] as ProgressEntry[];
  }

  const { data } = await supabase
    .from("progress")
    .select("*")
    .in("student_id", goalStudentIds)
    .order("date", { ascending: false });

  return (data ?? []) as ProgressEntry[];
}

export async function getDashboardData({ supabase, students, searchParams }: DashboardDataParams): Promise<{
  filteredPayments: Payment[];
  filteredProgress: ProgressEntry[];
  recentEntries: ProgressEntry[];
  viewModel: DashboardViewModel;
}> {
  const scope = resolveDashboardScope(students, searchParams);

  if (scope.scopedStudentIds.length === 0) {
    return {
      filteredPayments: [],
      filteredProgress: [],
      recentEntries: [],
      viewModel: buildEmptyViewModel(scope)
    };
  }

  const [filteredProgressResult, filteredPaymentsResult, scopedGoalsResult] = await Promise.all([
    applyDateRange(
      supabase.from("progress").select("*").in("student_id", scope.scopedStudentIds).order("date", { ascending: false }),
      scope.filters.startDate,
      scope.filters.endDate
    ),
    applyDateRange(
      supabase.from("payments").select("*").in("student_id", scope.scopedStudentIds).order("date", { ascending: false }),
      scope.filters.startDate,
      scope.filters.endDate
    ),
    supabase.from("student_goals").select("*").in("student_id", scope.scopedStudentIds).order("target_date", { ascending: true })
  ]);

  const filteredProgress = (filteredProgressResult.data ?? []) as ProgressEntry[];
  const filteredPayments = (filteredPaymentsResult.data ?? []) as Payment[];
  const scopedGoals = (scopedGoalsResult.data ?? []) as StudentGoal[];
  const goalProgress = await getGoalProgress(
    supabase,
    [...new Set(scopedGoals.map((goal) => goal.student_id))]
  );

  const recentEntries = filteredProgress
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, DASHBOARD_RECENT_ENTRIES_LIMIT);
  const chartData = buildChartData(
    filteredProgress
      .slice()
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, DASHBOARD_CHART_POINTS_LIMIT)
  );
  const paidRevenue = filteredPayments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const pendingRevenue = filteredPayments
    .filter((payment) => payment.status !== "paid")
    .reduce((total, payment) => total + Number(payment.amount), 0);

  const [trendMetricsRpcResult, studentRowsRpcResult, summaryRpcResult] = await Promise.all([
    supabase.rpc("dashboard_trend_metrics", {
      p_student_ids: scope.scopedStudentIds,
      p_reference_date: scope.today
    }),
    supabase.rpc("dashboard_student_summary", {
      p_student_ids: scope.scopedStudentIds,
      p_start_date: scope.filters.startDate || null,
      p_end_date: scope.filters.endDate || null
    }),
    supabase.rpc("dashboard_summary_stats", {
      p_student_ids: scope.scopedStudentIds,
      p_start_date: scope.filters.startDate || null,
      p_end_date: scope.filters.endDate || null
    })
  ]);

  const trendMetrics =
    !trendMetricsRpcResult.error && Array.isArray(trendMetricsRpcResult.data)
      ? mapDashboardTrendMetrics(trendMetricsRpcResult.data as DashboardTrendRpcRow[])
      : buildMonthlyTrendMetrics(filteredProgress, filteredPayments, scope.today);

  const studentRows =
    !studentRowsRpcResult.error && Array.isArray(studentRowsRpcResult.data)
      ? mapDashboardStudentRows(
          studentRowsRpcResult.data as DashboardStudentSummaryRpcRow[],
          students,
          scope.selectedStudentId
        )
      : buildStudentRows(students, filteredProgress, filteredPayments, scope.selectedStudentId);

  const coverageCount =
    scope.selectedStudentId === "all"
      ? studentRows.length
      : buildCoverageCount(filteredProgress, filteredPayments, scope.selectedStudentId, scope.studentsById);

  const goalSnapshots = buildGoalSnapshots(scopedGoals, goalProgress, scope.studentsById);
  const alerts = buildGoalAlerts(scopedGoals, goalProgress, scope.studentsById, scope.today);

  const summary =
    !summaryRpcResult.error && Array.isArray(summaryRpcResult.data) && summaryRpcResult.data.length > 0
      ? mapDashboardSummaryStats({
          row: summaryRpcResult.data[0] as DashboardSummaryRpcRow,
          activeStudentCount: scope.activeStudentCount,
          alertCount: alerts.length,
          activeGoalsCount: goalSnapshots.filter((goal) => goal.status === "active").length
        })
      : {
          activeStudentCount: scope.activeStudentCount,
          coverageCount,
          paidRevenue,
          pendingRevenue,
          progressCount: filteredProgress.length,
          alertCount: alerts.length,
          activeGoalsCount: goalSnapshots.filter((goal) => goal.status === "active").length,
          performance: filteredProgress.reduce(
            (performance, entry) => ({
              pullups: Math.max(performance.pullups, entry.pullups),
              pushups: Math.max(performance.pushups, entry.pushups),
              muscleUps: Math.max(performance.muscleUps, entry.muscle_ups),
              handstand: Math.max(performance.handstand, entry.handstand_seconds)
            }),
            { pullups: 0, pushups: 0, muscleUps: 0, handstand: 0 }
          )
        };

  return {
    filteredPayments,
    filteredProgress,
    recentEntries,
    viewModel: {
      filters: scope.filters,
      chartData,
      studentRows,
      recentEntriesCount: recentEntries.length,
      trendMetrics,
      goalSnapshots,
      alerts,
      summary
    }
  };
}

export async function getDashboardViewData({ supabase, students, searchParams }: DashboardDataParams): Promise<{
  recentEntries: ProgressEntry[];
  viewModel: DashboardViewModel;
}> {
  const scope = resolveDashboardScope(students, searchParams);

  if (scope.scopedStudentIds.length === 0) {
    return {
      recentEntries: [],
      viewModel: buildEmptyViewModel(scope)
    };
  }

  const trendStartDate = getPreviousMonthStart(scope.today);

  const [
    recentEntriesResult,
    chartEntriesResult,
    scopedGoalsResult,
    trendMetricsRpcResult,
    studentRowsRpcResult,
    summaryRpcResult
  ] = await Promise.all([
    applyDateRange(
      supabase
        .from("progress")
        .select("id,student_id,pullups,pushups,muscle_ups,handstand_seconds,date,created_at")
        .in("student_id", scope.scopedStudentIds)
        .order("date", { ascending: false })
        .range(0, DASHBOARD_RECENT_ENTRIES_LIMIT - 1),
      scope.filters.startDate,
      scope.filters.endDate
    ),
    applyDateRange(
      supabase
        .from("progress")
        .select("date,pullups,pushups,muscle_ups,handstand_seconds")
        .in("student_id", scope.scopedStudentIds)
        .order("date", { ascending: false })
        .range(0, DASHBOARD_CHART_POINTS_LIMIT - 1),
      scope.filters.startDate,
      scope.filters.endDate
    ),
    supabase.from("student_goals").select("*").in("student_id", scope.scopedStudentIds).order("target_date", { ascending: true }),
    supabase.rpc("dashboard_trend_metrics", {
      p_student_ids: scope.scopedStudentIds,
      p_reference_date: scope.today
    }),
    supabase.rpc("dashboard_student_summary", {
      p_student_ids: scope.scopedStudentIds,
      p_start_date: scope.filters.startDate || null,
      p_end_date: scope.filters.endDate || null
    }),
    supabase.rpc("dashboard_summary_stats", {
      p_student_ids: scope.scopedStudentIds,
      p_start_date: scope.filters.startDate || null,
      p_end_date: scope.filters.endDate || null
    })
  ]);

  const recentEntries = (recentEntriesResult.data ?? []) as ProgressEntry[];
  const chartSourceEntries = (chartEntriesResult.data ?? []) as Array<
    Pick<ProgressEntry, "date" | "pullups" | "pushups" | "muscle_ups" | "handstand_seconds">
  >;
  const scopedGoals = (scopedGoalsResult.data ?? []) as StudentGoal[];
  const goalProgress = await getGoalProgress(
    supabase,
    [...new Set(scopedGoals.map((goal) => goal.student_id))]
  );

  const goalSnapshots = buildGoalSnapshots(scopedGoals, goalProgress, scope.studentsById);
  const alerts = buildGoalAlerts(scopedGoals, goalProgress, scope.studentsById, scope.today);

  const needsSummaryFallback = summaryRpcResult.error || !Array.isArray(summaryRpcResult.data) || summaryRpcResult.data.length === 0;
  const needsStudentRowsFallback = studentRowsRpcResult.error || !Array.isArray(studentRowsRpcResult.data);
  const needsTrendFallback = trendMetricsRpcResult.error || !Array.isArray(trendMetricsRpcResult.data);

  let fallbackFilteredProgress: ProgressEntry[] = [];
  let fallbackFilteredPayments: Payment[] = [];

  if (needsSummaryFallback || needsStudentRowsFallback) {
    const [filteredProgressResult, filteredPaymentsResult] = await Promise.all([
      applyDateRange(
        supabase
          .from("progress")
          .select("id,student_id,pullups,pushups,muscle_ups,handstand_seconds,date,created_at")
          .in("student_id", scope.scopedStudentIds)
          .order("date", { ascending: false }),
        scope.filters.startDate,
        scope.filters.endDate
      ),
      applyDateRange(
        supabase
          .from("payments")
          .select("id,student_id,amount,status,date,created_at")
          .in("student_id", scope.scopedStudentIds)
          .order("date", { ascending: false }),
        scope.filters.startDate,
        scope.filters.endDate
      )
    ]);

    fallbackFilteredProgress = (filteredProgressResult.data ?? []) as ProgressEntry[];
    fallbackFilteredPayments = (filteredPaymentsResult.data ?? []) as Payment[];
  }

  let fallbackTrendProgress: ProgressEntry[] = [];
  let fallbackTrendPayments: Payment[] = [];

  if (needsTrendFallback) {
    const [trendProgressResult, trendPaymentsResult] = await Promise.all([
      supabase
        .from("progress")
        .select("id,student_id,pullups,pushups,muscle_ups,handstand_seconds,date,created_at")
        .in("student_id", scope.scopedStudentIds)
        .gte("date", trendStartDate)
        .order("date", { ascending: false }),
      supabase
        .from("payments")
        .select("id,student_id,amount,status,date,created_at")
        .in("student_id", scope.scopedStudentIds)
        .gte("date", trendStartDate)
        .order("date", { ascending: false })
    ]);

    fallbackTrendProgress = (trendProgressResult.data ?? []) as ProgressEntry[];
    fallbackTrendPayments = (trendPaymentsResult.data ?? []) as Payment[];
  }

  if (trendMetricsRpcResult.error && !isFunctionMissingError(trendMetricsRpcResult.error)) {
    console.error("dashboard_trend_metrics rpc failed", trendMetricsRpcResult.error);
  }

  if (studentRowsRpcResult.error && !isFunctionMissingError(studentRowsRpcResult.error)) {
    console.error("dashboard_student_summary rpc failed", studentRowsRpcResult.error);
  }

  if (summaryRpcResult.error && !isFunctionMissingError(summaryRpcResult.error)) {
    console.error("dashboard_summary_stats rpc failed", summaryRpcResult.error);
  }

  const trendMetrics =
    !needsTrendFallback
      ? mapDashboardTrendMetrics(trendMetricsRpcResult.data as DashboardTrendRpcRow[])
      : buildMonthlyTrendMetrics(fallbackTrendProgress, fallbackTrendPayments, scope.today);

  const studentRows =
    !needsStudentRowsFallback
      ? mapDashboardStudentRows(studentRowsRpcResult.data as DashboardStudentSummaryRpcRow[], students, scope.selectedStudentId)
      : buildStudentRows(students, fallbackFilteredProgress, fallbackFilteredPayments, scope.selectedStudentId);

  const fallbackCoverageCount =
    scope.selectedStudentId === "all"
      ? studentRows.length
      : buildCoverageCount(fallbackFilteredProgress, fallbackFilteredPayments, scope.selectedStudentId, scope.studentsById);

  const summary =
    !needsSummaryFallback
      ? mapDashboardSummaryStats({
          row: (summaryRpcResult.data as DashboardSummaryRpcRow[])[0],
          activeStudentCount: scope.activeStudentCount,
          alertCount: alerts.length,
          activeGoalsCount: goalSnapshots.filter((goal) => goal.status === "active").length
        })
      : {
          activeStudentCount: scope.activeStudentCount,
          coverageCount: fallbackCoverageCount,
          paidRevenue: fallbackFilteredPayments
            .filter((payment) => payment.status === "paid")
            .reduce((total, payment) => total + Number(payment.amount), 0),
          pendingRevenue: fallbackFilteredPayments
            .filter((payment) => payment.status !== "paid")
            .reduce((total, payment) => total + Number(payment.amount), 0),
          progressCount: fallbackFilteredProgress.length,
          alertCount: alerts.length,
          activeGoalsCount: goalSnapshots.filter((goal) => goal.status === "active").length,
          performance: fallbackFilteredProgress.reduce(
            (performance, entry) => ({
              pullups: Math.max(performance.pullups, entry.pullups),
              pushups: Math.max(performance.pushups, entry.pushups),
              muscleUps: Math.max(performance.muscleUps, entry.muscle_ups),
              handstand: Math.max(performance.handstand, entry.handstand_seconds)
            }),
            { pullups: 0, pushups: 0, muscleUps: 0, handstand: 0 }
          )
        };

  return {
    recentEntries,
    viewModel: {
      filters: scope.filters,
      chartData: buildChartData(chartSourceEntries),
      studentRows,
      recentEntriesCount: recentEntries.length,
      trendMetrics,
      goalSnapshots,
      alerts,
      summary
    }
  };
}

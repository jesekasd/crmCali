import {
  buildChartData,
  buildCoverageCount,
  buildGoalAlerts,
  buildGoalSnapshots,
  buildMonthlyTrendMetrics,
  buildPerformanceSummary,
  buildStudentRows,
  getDateOffset,
  getTodayIso
} from "@/lib/dashboard/reporting";
import { DashboardFilterState, DashboardViewModel } from "@/lib/dashboard/types";
import { Payment, ProgressEntry, Student, StudentGoal } from "@/types/domain";

interface DashboardDataParams {
  supabase: any;
  students: Student[];
  searchParams?: { [key: string]: string | string[] | undefined };
}

function parseScalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeDate(value: string | undefined, fallback: string) {
  if (value === "all") {
    return "";
  }

  if (!value) {
    return fallback;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return fallback;
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

export async function getDashboardData({ supabase, students, searchParams }: DashboardDataParams): Promise<{
  filteredPayments: Payment[];
  filteredProgress: ProgressEntry[];
  recentEntries: ProgressEntry[];
  viewModel: DashboardViewModel;
}> {
  const today = getTodayIso();
  const defaultStartDate = getDateOffset(30);
  const selectedStudentParam = parseScalar(searchParams?.student);
  const startDate = normalizeDate(parseScalar(searchParams?.start), defaultStartDate);
  const endDate = normalizeDate(parseScalar(searchParams?.end), today);

  const selectedStudentId =
    selectedStudentParam && students.some((student) => student.id === selectedStudentParam) ? selectedStudentParam : "all";

  const scopedStudentIds =
    selectedStudentId === "all" ? students.map((student) => student.id) : students.filter((student) => student.id === selectedStudentId).map((student) => student.id);

  const filters: DashboardFilterState = {
    selectedStudentId,
    startDate,
    endDate
  };

  if (scopedStudentIds.length === 0) {
    return {
      filteredPayments: [],
      filteredProgress: [],
      recentEntries: [],
      viewModel: {
        filters,
        chartData: [],
        studentRows: [],
        recentEntriesCount: 0,
        trendMetrics: [],
        goalSnapshots: [],
        alerts: [],
        summary: {
          activeStudentCount: students.filter((student) => student.status === "active").length,
          coverageCount: 0,
          paidRevenue: 0,
          pendingRevenue: 0,
          progressCount: 0,
          alertCount: 0,
          activeGoalsCount: 0,
          performance: { pullups: 0, pushups: 0, muscleUps: 0, handstand: 0 }
        }
      }
    };
  }

  const trendStartDate = getPreviousMonthStart(today);

  const [filteredProgressResult, filteredPaymentsResult, scopedGoalsResult, trendProgressResult, trendPaymentsResult] =
    await Promise.all([
      applyDateRange(
        supabase.from("progress").select("*").in("student_id", scopedStudentIds).order("date", { ascending: false }),
        startDate,
        endDate
      ),
      applyDateRange(
        supabase.from("payments").select("*").in("student_id", scopedStudentIds).order("date", { ascending: false }),
        startDate,
        endDate
      ),
      supabase.from("student_goals").select("*").in("student_id", scopedStudentIds).order("target_date", { ascending: true }),
      supabase
        .from("progress")
        .select("*")
        .in("student_id", scopedStudentIds)
        .gte("date", trendStartDate)
        .order("date", { ascending: false }),
      supabase
        .from("payments")
        .select("*")
        .in("student_id", scopedStudentIds)
        .gte("date", trendStartDate)
        .order("date", { ascending: false })
    ]);

  const filteredProgress = (filteredProgressResult.data ?? []) as ProgressEntry[];
  const filteredPayments = (filteredPaymentsResult.data ?? []) as Payment[];
  const scopedGoals = (scopedGoalsResult.data ?? []) as StudentGoal[];
  const trendProgress = (trendProgressResult.data ?? []) as ProgressEntry[];
  const trendPayments = (trendPaymentsResult.data ?? []) as Payment[];

  const goalStudentIds = [...new Set(scopedGoals.map((goal) => goal.student_id))];
  let goalProgress: ProgressEntry[] = [];

  if (goalStudentIds.length > 0) {
    const { data } = await supabase
      .from("progress")
      .select("*")
      .in("student_id", goalStudentIds)
      .order("date", { ascending: false });

    goalProgress = (data ?? []) as ProgressEntry[];
  }

  const studentsById = Object.fromEntries(students.map((student) => [student.id, student]));
  const recentEntries = filteredProgress
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 10);
  const chartData = buildChartData(filteredProgress);
  const performance = buildPerformanceSummary(filteredProgress);
  const coverageCount = buildCoverageCount(filteredProgress, filteredPayments, selectedStudentId, studentsById);
  const studentRows = buildStudentRows(students, filteredProgress, filteredPayments, selectedStudentId);
  const paidRevenue = filteredPayments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const pendingRevenue = filteredPayments
    .filter((payment) => payment.status !== "paid")
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const trendMetrics = buildMonthlyTrendMetrics(trendProgress, trendPayments, today);
  const goalSnapshots = buildGoalSnapshots(scopedGoals, goalProgress, studentsById);
  const alerts = buildGoalAlerts(scopedGoals, goalProgress, studentsById, today);

  return {
    filteredPayments,
    filteredProgress,
    recentEntries,
    viewModel: {
      filters,
      chartData,
      studentRows,
      recentEntriesCount: recentEntries.length,
      trendMetrics,
      goalSnapshots,
      alerts,
      summary: {
        activeStudentCount: students.filter((student) => student.status === "active").length,
        coverageCount,
        paidRevenue,
        pendingRevenue,
        progressCount: filteredProgress.length,
        alertCount: alerts.length,
        activeGoalsCount: goalSnapshots.filter((goal) => goal.status === "active").length,
        performance
      }
    }
  };
}

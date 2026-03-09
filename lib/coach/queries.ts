import { getTodayIso } from "@/lib/dashboard/reporting";
import { getPaginationRange } from "@/lib/search-params";
import { Payment, ProgressEntry, Student, StudentStatus } from "@/types/domain";

export type StudentStatusFilter = "all" | StudentStatus;
export type PaymentStatusFilter = "all" | "pending" | "paid" | "overdue";

interface SupabaseQueryBuilder {
  gte: (column: string, value: string) => SupabaseQueryBuilder;
  lte: (column: string, value: string) => SupabaseQueryBuilder;
}

function applyDateRange<T extends SupabaseQueryBuilder>(query: T, startDate: string, endDate: string) {
  let scopedQuery = query;

  if (startDate) {
    scopedQuery = scopedQuery.gte("date", startDate) as T;
  }

  if (endDate) {
    scopedQuery = scopedQuery.lte("date", endDate) as T;
  }

  return scopedQuery;
}

function splitPaginatedRows<T>(rows: T[], pageSize: number) {
  return {
    items: rows.slice(0, pageSize),
    hasNextPage: rows.length > pageSize
  };
}

export async function listCoachStudentsPage(params: {
  supabase: any;
  coachId: string;
  page: number;
  pageSize: number;
  search: string;
  status: StudentStatusFilter;
}) {
  const { supabase, coachId, page, pageSize, search, status } = params;
  const { from, to } = getPaginationRange(page, pageSize);

  let query = supabase
    .from("students")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status === "all") {
    query = query.neq("status", "archived");
  } else {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,goal.ilike.%${search}%,level.ilike.%${search}%`);
  }

  const { data } = await query;
  const rows = (data ?? []) as Student[];

  return splitPaginatedRows(rows, pageSize);
}

export async function listCoachProgressPage(params: {
  supabase: any;
  studentId: string;
  page: number;
  pageSize: number;
  startDate: string;
  endDate: string;
  chartLimit?: number;
}) {
  const { supabase, studentId, page, pageSize, startDate, endDate, chartLimit = 60 } = params;
  const { from, to } = getPaginationRange(page, pageSize);

  let historyQuery = supabase
    .from("progress")
    .select("*")
    .eq("student_id", studentId)
    .order("date", { ascending: false })
    .range(from, to);

  let chartQuery = supabase
    .from("progress")
    .select("*")
    .eq("student_id", studentId)
    .order("date", { ascending: false })
    .range(0, chartLimit - 1);

  historyQuery = applyDateRange(historyQuery, startDate, endDate);
  chartQuery = applyDateRange(chartQuery, startDate, endDate);

  const [{ data: historyRows }, { data: chartRows }] = await Promise.all([historyQuery, chartQuery]);
  const paginatedRows = (historyRows ?? []) as ProgressEntry[];

  return {
    ...splitPaginatedRows(paginatedRows, pageSize),
    chartEntries: (chartRows ?? []) as ProgressEntry[]
  };
}

export async function listCoachPaymentsPage(params: {
  supabase: any;
  studentIds: string[];
  page: number;
  pageSize: number;
  startDate: string;
  endDate: string;
  status: PaymentStatusFilter;
  referenceDate?: string;
}) {
  const { supabase, studentIds, page, pageSize, startDate, endDate, status, referenceDate = getTodayIso() } = params;
  const { from, to } = getPaginationRange(page, pageSize);

  if (studentIds.length === 0) {
    return {
      items: [] as Payment[],
      hasNextPage: false,
      summary: {
        monthlyRevenue: 0,
        pendingCount: 0,
        overdueCount: 0
      }
    };
  }

  let pageQuery = supabase
    .from("payments")
    .select("*")
    .in("student_id", studentIds)
    .order("date", { ascending: false })
    .range(from, to);

  let summaryQuery = supabase
    .from("payments")
    .select("*")
    .in("student_id", studentIds)
    .order("date", { ascending: false });

  if (status !== "all") {
    pageQuery = pageQuery.eq("status", status);
  }

  pageQuery = applyDateRange(pageQuery, startDate, endDate);
  summaryQuery = applyDateRange(summaryQuery, startDate, endDate);

  const [{ data: pageRows }, { data: summaryRows }] = await Promise.all([pageQuery, summaryQuery]);
  const paginatedRows = (pageRows ?? []) as Payment[];
  const summaryPayments = (summaryRows ?? []) as Payment[];
  const monthKey = referenceDate.slice(0, 7);

  return {
    ...splitPaginatedRows(paginatedRows, pageSize),
    summary: {
      monthlyRevenue: summaryPayments
        .filter((payment) => payment.status === "paid" && payment.date.startsWith(monthKey))
        .reduce((total, payment) => total + Number(payment.amount), 0),
      pendingCount: summaryPayments.filter((payment) => payment.status === "pending").length,
      overdueCount: summaryPayments.filter((payment) => payment.status === "overdue").length
    }
  };
}

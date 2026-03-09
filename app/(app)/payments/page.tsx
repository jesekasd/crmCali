import { PaymentsManager } from "@/components/PaymentsManager";
import { getDateOffset, getTodayIso } from "@/lib/dashboard/reporting";
import { getCoachContext, getCoachStudents } from "@/lib/supabase/api";
import { getPaginationRange, normalizeDateParam, normalizeEnumParam, parsePageParam, parseScalarParam } from "@/lib/search-params";
import { Payment, Student } from "@/types/domain";

const PAYMENTS_PAGE_SIZE = 20;
const PAYMENT_STATUS_FILTERS = ["all", "pending", "paid", "overdue"] as const;

interface PaymentsPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const students = (await getCoachStudents(supabase, coachId)) as Student[];
  const today = getTodayIso();
  const defaultStartDate = getDateOffset(90);
  const page = parsePageParam(searchParams?.page);
  const startDate = normalizeDateParam(searchParams?.start, defaultStartDate);
  const endDate = normalizeDateParam(searchParams?.end, today);
  const status = normalizeEnumParam(searchParams?.status, PAYMENT_STATUS_FILTERS, "all");
  const requestedStudentId = parseScalarParam(searchParams?.student);
  const selectedStudentId =
    requestedStudentId && students.some((student) => student.id === requestedStudentId) ? requestedStudentId : "all";
  const scopedStudentIds =
    selectedStudentId === "all" ? students.map((student) => student.id) : students.filter((student) => student.id === selectedStudentId).map((student) => student.id);

  let payments: Payment[] = [];
  let summaryPayments: Payment[] = [];
  let hasNextPage = false;

  if (scopedStudentIds.length > 0) {
    const { from, to } = getPaginationRange(page, PAYMENTS_PAGE_SIZE);

    let pageQuery = supabase
      .from("payments")
      .select("*")
      .in("student_id", scopedStudentIds)
      .order("date", { ascending: false })
      .range(from, to);

    let summaryQuery = supabase
      .from("payments")
      .select("*")
      .in("student_id", scopedStudentIds)
      .order("date", { ascending: false });

    if (status !== "all") {
      pageQuery = pageQuery.eq("status", status);
    }

    if (startDate) {
      pageQuery = pageQuery.gte("date", startDate);
      summaryQuery = summaryQuery.gte("date", startDate);
    }

    if (endDate) {
      pageQuery = pageQuery.lte("date", endDate);
      summaryQuery = summaryQuery.lte("date", endDate);
    }

    const [{ data: pageRows }, { data: summaryRows }] = await Promise.all([pageQuery, summaryQuery]);
    const paginatedRows = (pageRows ?? []) as Payment[];

    payments = paginatedRows.slice(0, PAYMENTS_PAGE_SIZE);
    hasNextPage = paginatedRows.length > PAYMENTS_PAGE_SIZE;
    summaryPayments = (summaryRows ?? []) as Payment[];
  }

  const monthKey = today.slice(0, 7);
  const monthlyRevenue = summaryPayments
    .filter((payment) => payment.status === "paid" && payment.date.startsWith(monthKey))
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const pendingCount = summaryPayments.filter((payment) => payment.status === "pending").length;
  const overdueCount = summaryPayments.filter((payment) => payment.status === "overdue").length;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Pagos</h2>
        <p className="mt-1 text-sm text-slate-500">Tabla paginada y acotada por ventana temporal para evitar lecturas completas.</p>
      </header>
      <PaymentsManager
        students={students}
        payments={payments}
        summary={{ monthlyRevenue, pendingCount, overdueCount }}
        filters={{ selectedStudentId, status, startDate, endDate, page }}
        pageSize={PAYMENTS_PAGE_SIZE}
        hasNextPage={hasNextPage}
      />
    </section>
  );
}

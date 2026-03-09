import { PaymentsManager } from "@/components/PaymentsManager";
import { getDateOffset, getTodayIso } from "@/lib/dashboard/reporting";
import { listCoachPaymentsPage, PaymentStatusFilter } from "@/lib/coach/queries";
import { getCoachContext, getCoachStudents } from "@/lib/supabase/api";
import { normalizeDateParam, normalizeEnumParam, parsePageParam, parseScalarParam } from "@/lib/search-params";
import { Student } from "@/types/domain";

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
  const status = normalizeEnumParam(searchParams?.status, PAYMENT_STATUS_FILTERS, "all") as PaymentStatusFilter;
  const requestedStudentId = parseScalarParam(searchParams?.student);
  const selectedStudentId =
    requestedStudentId && students.some((student) => student.id === requestedStudentId) ? requestedStudentId : "all";
  const scopedStudentIds =
    selectedStudentId === "all" ? students.map((student) => student.id) : students.filter((student) => student.id === selectedStudentId).map((student) => student.id);
  const paymentPage = await listCoachPaymentsPage({
    supabase,
    studentIds: scopedStudentIds,
    page,
    pageSize: PAYMENTS_PAGE_SIZE,
    startDate,
    endDate,
    status,
    referenceDate: today
  });

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Pagos</h2>
        <p className="mt-1 text-sm text-slate-500">Tabla paginada y acotada por ventana temporal para evitar lecturas completas.</p>
      </header>
      <PaymentsManager
        students={students}
        payments={paymentPage.items}
        summary={paymentPage.summary}
        filters={{ selectedStudentId, status, startDate, endDate, page }}
        pageSize={PAYMENTS_PAGE_SIZE}
        hasNextPage={paymentPage.hasNextPage}
      />
    </section>
  );
}

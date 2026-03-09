import { ProgressManager } from "@/components/ProgressManager";
import { buildChartData, getDateOffset, getTodayIso } from "@/lib/dashboard/reporting";
import { getCoachContext, getCoachStudents } from "@/lib/supabase/api";
import { getPaginationRange, normalizeDateParam, parsePageParam, parseScalarParam } from "@/lib/search-params";
import { ProgressEntry, Student } from "@/types/domain";

const PROGRESS_PAGE_SIZE = 20;

interface ProgressPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function ProgressPage({ searchParams }: ProgressPageProps) {
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
  const requestedStudentId = parseScalarParam(searchParams?.student);
  const selectedStudentId =
    requestedStudentId && students.some((student) => student.id === requestedStudentId)
      ? requestedStudentId
      : (students[0]?.id ?? "");

  let historyEntries: ProgressEntry[] = [];
  let chartEntries: ProgressEntry[] = [];
  let hasNextPage = false;

  if (selectedStudentId) {
    const { from, to } = getPaginationRange(page, PROGRESS_PAGE_SIZE);

    let historyQuery = supabase
      .from("progress")
      .select("*")
      .eq("student_id", selectedStudentId)
      .order("date", { ascending: false })
      .range(from, to);

    let chartQuery = supabase
      .from("progress")
      .select("*")
      .eq("student_id", selectedStudentId)
      .order("date", { ascending: false })
      .range(0, 59);

    if (startDate) {
      historyQuery = historyQuery.gte("date", startDate);
      chartQuery = chartQuery.gte("date", startDate);
    }

    if (endDate) {
      historyQuery = historyQuery.lte("date", endDate);
      chartQuery = chartQuery.lte("date", endDate);
    }

    const [{ data: historyRows }, { data: chartRows }] = await Promise.all([historyQuery, chartQuery]);
    const paginatedRows = (historyRows ?? []) as ProgressEntry[];

    historyEntries = paginatedRows.slice(0, PROGRESS_PAGE_SIZE);
    hasNextPage = paginatedRows.length > PROGRESS_PAGE_SIZE;
    chartEntries = (chartRows ?? []) as ProgressEntry[];
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Progreso físico</h2>
        <p className="mt-1 text-sm text-slate-500">Vista acotada por alumno y ventana temporal para no arrastrar historiales completos.</p>
      </header>
      <ProgressManager
        students={students}
        entries={historyEntries}
        chartData={buildChartData(chartEntries)}
        filters={{ selectedStudentId, startDate, endDate, page }}
        pageSize={PROGRESS_PAGE_SIZE}
        hasNextPage={hasNextPage}
      />
    </section>
  );
}

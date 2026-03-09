import { ProgressManager } from "@/components/ProgressManager";
import { buildChartData, getDateOffset, getTodayIso } from "@/lib/dashboard/reporting";
import { listCoachProgressPage } from "@/lib/coach/queries";
import { getCoachContext, getCoachStudents } from "@/lib/supabase/api";
import { normalizeDateParam, parsePageParam, parseScalarParam } from "@/lib/search-params";
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
    const paginatedProgress = await listCoachProgressPage({
      supabase,
      studentId: selectedStudentId,
      page,
      pageSize: PROGRESS_PAGE_SIZE,
      startDate,
      endDate
    });

    historyEntries = paginatedProgress.items;
    chartEntries = paginatedProgress.chartEntries;
    hasNextPage = paginatedProgress.hasNextPage;
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


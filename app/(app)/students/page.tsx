import { StudentsManager } from "@/components/StudentsManager";
import { listCoachStudentsPage, StudentStatusFilter } from "@/lib/coach/queries";
import { getCoachContext } from "@/lib/supabase/api";
import { normalizeEnumParam, normalizeTextParam, parsePageParam } from "@/lib/search-params";

const STUDENTS_PAGE_SIZE = 12;
const STUDENT_STATUS_FILTERS = ["all", "active", "inactive", "archived"] as const;

interface StudentsPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const page = parsePageParam(searchParams?.page);
  const search = normalizeTextParam(searchParams?.q);
  const status = normalizeEnumParam(searchParams?.status, STUDENT_STATUS_FILTERS, "all") as StudentStatusFilter;
  const { items: students, hasNextPage } = await listCoachStudentsPage({
    supabase,
    coachId,
    page,
    pageSize: STUDENTS_PAGE_SIZE,
    search,
    status
  });

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Gestión de alumnos</h2>
        <p className="mt-1 text-sm text-slate-500">Listado paginado y filtrado desde servidor para sostener mejor el free tier.</p>
      </header>
      <StudentsManager
        students={students}
        filters={{ search, status, page }}
        pageSize={STUDENTS_PAGE_SIZE}
        hasNextPage={hasNextPage}
      />
    </section>
  );
}


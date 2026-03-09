import { StudentsManager } from "@/components/StudentsManager";
import { getCoachContext } from "@/lib/supabase/api";
import { getPaginationRange, normalizeEnumParam, normalizeTextParam, parsePageParam } from "@/lib/search-params";
import { Student } from "@/types/domain";

const STUDENTS_PAGE_SIZE = 12;
const STUDENT_STATUS_FILTERS = ["all", "active", "inactive"] as const;

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
  const status = normalizeEnumParam(searchParams?.status, STUDENT_STATUS_FILTERS, "all");
  const { from, to } = getPaginationRange(page, STUDENTS_PAGE_SIZE);

  let query = supabase
    .from("students")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,goal.ilike.%${search}%,level.ilike.%${search}%`);
  }

  const { data } = await query;
  const rows = (data ?? []) as Student[];
  const students = rows.slice(0, STUDENTS_PAGE_SIZE);
  const hasNextPage = rows.length > STUDENTS_PAGE_SIZE;

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

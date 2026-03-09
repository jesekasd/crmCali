import { DashboardReports } from "@/components/DashboardReports";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Payment, ProgressEntry, Student } from "@/types/domain";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: coach } = await supabase.from("coaches").select("id").eq("user_id", user!.id).maybeSingle();

  if (!coach) {
    return (
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900">Configura tu perfil</h2>
        <p className="mt-2 text-sm text-slate-600">
          Tu cuenta fue creada, pero no se encontro un perfil de coach. Ejecuta el esquema SQL en Supabase para
          habilitar el flujo completo.
        </p>
      </section>
    );
  }

  const { data: studentRows } = await supabase
    .from("students")
    .select("*")
    .eq("coach_id", coach.id)
    .order("name", { ascending: true });

  const students = (studentRows ?? []) as Student[];
  const studentIds = students.map((student) => student.id);
  const activeStudentCount = students.filter((student) => student.status === "active").length;

  let payments: Payment[] = [];
  let progressEntries: ProgressEntry[] = [];

  if (studentIds.length > 0) {
    const [{ data: paymentRows }, { data: progressRows }] = await Promise.all([
      supabase.from("payments").select("*").in("student_id", studentIds).order("date", { ascending: false }),
      supabase.from("progress").select("*").in("student_id", studentIds).order("date", { ascending: false })
    ]);

    payments = (paymentRows ?? []) as Payment[];
    progressEntries = (progressRows ?? []) as ProgressEntry[];
  }

  return (
    <DashboardReports
      students={students}
      progressEntries={progressEntries}
      payments={payments}
      activeStudentCount={activeStudentCount}
    />
  );
}

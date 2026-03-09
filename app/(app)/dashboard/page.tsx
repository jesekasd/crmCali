import { ProgressChart } from "@/components/ProgressChart";
import { StatCard } from "@/components/StatCard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProgressEntry } from "@/types/domain";

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
          Tu cuenta fue creada, pero no se encontró un perfil de coach. Ejecuta el esquema SQL en Supabase para
          habilitar el flujo completo.
        </p>
      </section>
    );
  }

  const monthPrefix = new Date().toISOString().slice(0, 7);

  const [{ count: activeStudents }, { data: payments }, { data: students }] = await Promise.all([
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", coach.id)
      .eq("status", "active"),
    supabase.from("payments").select("amount, status, date, student_id"),
    supabase.from("students").select("id, name").eq("coach_id", coach.id)
  ]);

  const studentIds = (students ?? []).map((student) => student.id);
  let recentProgress: ProgressEntry[] = [];

  if (studentIds.length > 0) {
    const { data: progressRows } = await supabase
      .from("progress")
      .select("*")
      .in("student_id", studentIds)
      .order("date", { ascending: false })
      .limit(12);

    recentProgress = (progressRows ?? []) as ProgressEntry[];
  }

  const monthlyRevenue = (payments ?? [])
    .filter((payment) => payment.status === "paid" && payment.date.startsWith(monthPrefix))
    .reduce((acc, payment) => acc + Number(payment.amount), 0);

  const chartData = recentProgress
    .slice()
    .reverse()
    .map((entry) => ({
      date: entry.date,
      pullups: entry.pullups,
      pushups: entry.pushups,
      muscle_ups: entry.muscle_ups,
      handstand_seconds: entry.handstand_seconds
    }));

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">Resumen operativo de tu academia de calistenia.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Alumnos activos" value={String(activeStudents ?? 0)} />
        <StatCard title="Ingresos del mes" value={`$${monthlyRevenue.toFixed(2)}`} />
        <StatCard title="Registros recientes" value={String(recentProgress.length)} />
      </div>

      {chartData.length > 0 ? (
        <ProgressChart data={chartData} />
      ) : (
        <article className="card p-5">
          <p className="text-sm text-slate-600">Todavía no hay registros de progreso para mostrar.</p>
        </article>
      )}
    </section>
  );
}

import { PaymentsManager } from "@/components/PaymentsManager";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Payment, Student } from "@/types/domain";

export default async function PaymentsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: coach } = await supabase.from("coaches").select("id").eq("user_id", user!.id).maybeSingle();

  let students: Student[] = [];
  let payments: Payment[] = [];

  if (coach) {
    const { data: studentRows } = await supabase.from("students").select("*").eq("coach_id", coach.id).order("name", {
      ascending: true
    });
    students = (studentRows ?? []) as Student[];

    const studentIds = students.map((student) => student.id);
    if (studentIds.length > 0) {
      const { data: paymentRows } = await supabase
        .from("payments")
        .select("*")
        .in("student_id", studentIds)
        .order("date", { ascending: false });

      payments = (paymentRows ?? []) as Payment[];
    }
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Pagos</h2>
        <p className="mt-1 text-sm text-slate-500">Controla estados de pago e ingresos mensuales.</p>
      </header>
      <PaymentsManager students={students} initialPayments={payments} />
    </section>
  );
}

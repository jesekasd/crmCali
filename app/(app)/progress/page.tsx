import { ProgressManager } from "@/components/ProgressManager";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProgressEntry, Student } from "@/types/domain";

export default async function ProgressPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: coach } = await supabase.from("coaches").select("id").eq("user_id", user!.id).maybeSingle();

  let students: Student[] = [];
  let progress: ProgressEntry[] = [];

  if (coach) {
    const { data: studentRows } = await supabase.from("students").select("*").eq("coach_id", coach.id).order("name", {
      ascending: true
    });

    students = (studentRows ?? []) as Student[];
    const studentIds = students.map((student) => student.id);

    if (studentIds.length > 0) {
      const { data: progressRows } = await supabase
        .from("progress")
        .select("*")
        .in("student_id", studentIds)
        .order("date", { ascending: false });
      progress = (progressRows ?? []) as ProgressEntry[];
    }
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Progreso físico</h2>
        <p className="mt-1 text-sm text-slate-500">Registra dominadas, flexiones, muscle up y handstand.</p>
      </header>
      <ProgressManager students={students} initialEntries={progress} />
    </section>
  );
}

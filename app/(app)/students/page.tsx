import { StudentsManager } from "@/components/StudentsManager";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Student } from "@/types/domain";

export default async function StudentsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: coach } = await supabase.from("coaches").select("id").eq("user_id", user!.id).maybeSingle();

  let students: Student[] = [];
  if (coach) {
    const { data } = await supabase.from("students").select("*").eq("coach_id", coach.id).order("created_at", {
      ascending: false
    });
    students = (data ?? []) as Student[];
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Gestión de alumnos</h2>
        <p className="mt-1 text-sm text-slate-500">Crea, edita y elimina alumnos desde un solo panel.</p>
      </header>
      <StudentsManager initialStudents={students} />
    </section>
  );
}

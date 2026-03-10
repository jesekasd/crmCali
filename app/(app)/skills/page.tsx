import { SkillsManager } from "@/components/SkillsManager";
import { getCoachSkillsData } from "@/lib/skills/service";
import { getCoachContext, getCoachStudents } from "@/lib/supabase/api";
import { Student } from "@/types/domain";

export default async function SkillsPage() {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const students = (await getCoachStudents(supabase, coachId)) as Student[];
  const { assignments, logs, snapshots } = await getCoachSkillsData({ supabase, students });

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Skills y progresiones</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gestiona rutas de handstand, muscle-up, lever y planche con etapas, benchmarks e historial técnico.
        </p>
      </header>
      <SkillsManager students={students} assignments={assignments} logs={logs} snapshots={snapshots} />
    </section>
  );
}

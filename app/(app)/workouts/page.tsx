import { WorkoutEditor } from "@/components/WorkoutEditor";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Student, Workout, WorkoutAssignment } from "@/types/domain";

export default async function WorkoutsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: coach } = await supabase.from("coaches").select("id").eq("user_id", user!.id).maybeSingle();

  let students: Student[] = [];
  let workouts: Workout[] = [];
  let assignments: WorkoutAssignment[] = [];

  if (coach) {
    const [{ data: studentRows }, { data: workoutRows }, { data: assignmentRows }] = await Promise.all([
      supabase.from("students").select("*").eq("coach_id", coach.id).order("name", { ascending: true }),
      supabase.from("workouts").select("*").eq("coach_id", coach.id).order("created_at", { ascending: false }),
      supabase.from("workout_assignments").select("*").order("assigned_at", { ascending: false })
    ]);

    students = (studentRows ?? []) as Student[];
    workouts = (workoutRows ?? []) as Workout[];

    const allowedStudentIds = new Set(students.map((student) => student.id));
    assignments = (assignmentRows ?? []).filter((assignment) => allowedStudentIds.has(assignment.student_id)) as WorkoutAssignment[];
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Rutinas</h2>
        <p className="mt-1 text-sm text-slate-500">Diseña programas y asígnalos de forma inmediata.</p>
      </header>
      <WorkoutEditor students={students} initialWorkouts={workouts} initialAssignments={assignments} />
    </section>
  );
}

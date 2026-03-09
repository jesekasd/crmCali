import { WorkoutEditor } from "@/components/WorkoutEditor";
import { getCoachContext, getCoachStudents } from "@/lib/supabase/api";
import { Student, Workout, WorkoutAssignment } from "@/types/domain";

export default async function WorkoutsPage() {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;

  let students: Student[] = [];
  let workouts: Workout[] = [];
  let assignments: WorkoutAssignment[] = [];

  const [studentRows, workoutResult, assignmentResult] = await Promise.all([
    getCoachStudents(supabase, coachId),
    supabase.from("workouts").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }),
    supabase.from("workout_assignments").select("*").order("assigned_at", { ascending: false })
  ]);

  students = studentRows as Student[];
  workouts = (workoutResult.data ?? []) as Workout[];

  const allowedStudentIds = new Set(students.map((student) => student.id));
  assignments = (assignmentResult.data ?? []).filter((assignment) => allowedStudentIds.has(assignment.student_id)) as WorkoutAssignment[];

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


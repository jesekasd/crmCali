import { buildStudentSkillSnapshots } from "@/lib/skills/progress";
import { SkillProgressLog, Student, StudentSkill } from "@/types/domain";

export async function getCoachSkillsData(params: {
  supabase: any;
  students: Student[];
}) {
  const { supabase, students } = params;
  const studentIds = students.map((student) => student.id);

  if (studentIds.length === 0) {
    return {
      assignments: [] as StudentSkill[],
      logs: [] as SkillProgressLog[],
      snapshots: []
    };
  }

  const { data: assignmentRows } = await supabase
    .from("student_skills")
    .select("*")
    .in("student_id", studentIds)
    .order("updated_at", { ascending: false });

  const assignments = (assignmentRows ?? []) as StudentSkill[];
  const assignmentIds = assignments.map((assignment) => assignment.id);

  const { data: logRows } =
    assignmentIds.length > 0
      ? await supabase
          .from("skill_progress_logs")
          .select("*")
          .in("student_skill_id", assignmentIds)
          .order("created_at", { ascending: false })
      : { data: [] as SkillProgressLog[] };

  const logs = (logRows ?? []) as SkillProgressLog[];
  const studentsById = Object.fromEntries(students.map((student) => [student.id, student]));

  return {
    assignments,
    logs,
    snapshots: buildStudentSkillSnapshots(assignments, logs, studentsById)
  };
}

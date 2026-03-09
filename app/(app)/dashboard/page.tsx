import { DashboardReports } from "@/components/DashboardReports";
import { getDashboardViewData } from "@/lib/dashboard/server";
import { getCoachContext, getCoachStudents } from "@/lib/supabase/api";

interface DashboardPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const students = await getCoachStudents(supabase, coachId);

  const { recentEntries, viewModel } = await getDashboardViewData({
    supabase,
    students,
    searchParams
  });

  return <DashboardReports students={students} recentEntries={recentEntries} viewModel={viewModel} />;
}

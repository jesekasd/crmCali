import { NextRequest, NextResponse } from "next/server";
import { getDashboardExportFileName, buildDashboardCsv } from "@/lib/dashboard/export";
import { getDashboardData } from "@/lib/dashboard/server";
import { getCoachContext, getCoachStudents } from "@/lib/supabase/api";
import { Student } from "@/types/domain";

export async function GET(request: NextRequest) {
  const context = await getCoachContext();
  if ("error" in context) {
    return context.error;
  }

  const { supabase, coachId } = context;
  const students = (await getCoachStudents(supabase, coachId)) as Student[];
  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const { filteredPayments, filteredProgress, viewModel } = await getDashboardData({
    supabase,
    students,
    searchParams
  });

  const csv = buildDashboardCsv({
    studentRows: viewModel.studentRows,
    progressEntries: filteredProgress,
    payments: filteredPayments,
    trendMetrics: viewModel.trendMetrics,
    studentNames: Object.fromEntries(students.map((student) => [student.id, student.name]))
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${getDashboardExportFileName(
        viewModel.filters.selectedStudentId,
        viewModel.filters.endDate
      )}"`
    }
  });
}

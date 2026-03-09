import { GoalMetric } from "@/types/domain";

export interface DashboardChartPoint {
  date: string;
  pullups: number;
  pushups: number;
  muscle_ups: number;
  handstand_seconds: number;
}

export interface DashboardPerformanceSummary {
  pullups: number;
  pushups: number;
  muscleUps: number;
  handstand: number;
}

export interface DashboardStudentRow {
  id: string;
  name: string;
  level: string;
  records: number;
  latestDate: string;
  bestPullups: number;
  paidForStudent: number;
}

export interface DashboardTrendMetric {
  label: string;
  currentValue: number;
  previousValue: number;
  deltaPercentage: number | null;
  format: "currency" | "integer" | "seconds";
}

export interface DashboardAlert {
  id: string;
  studentId: string;
  studentName: string;
  metric: GoalMetric;
  severity: "warning" | "critical";
  title: string;
  description: string;
}

export interface DashboardGoalSnapshot {
  id: string;
  studentId: string;
  studentName: string;
  metric: GoalMetric;
  targetValue: number;
  targetDate: string;
  status: string;
  notes: string | null;
  currentValue: number;
  progressRatio: number;
  achieved: boolean;
}

export interface DashboardFilterState {
  selectedStudentId: string;
  startDate: string;
  endDate: string;
}

export interface DashboardSummaryStats {
  activeStudentCount: number;
  coverageCount: number;
  paidRevenue: number;
  pendingRevenue: number;
  progressCount: number;
  alertCount: number;
  activeGoalsCount: number;
  performance: DashboardPerformanceSummary;
}

export interface DashboardViewModel {
  filters: DashboardFilterState;
  chartData: DashboardChartPoint[];
  studentRows: DashboardStudentRow[];
  recentEntriesCount: number;
  trendMetrics: DashboardTrendMetric[];
  goalSnapshots: DashboardGoalSnapshot[];
  alerts: DashboardAlert[];
  summary: DashboardSummaryStats;
}

"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

interface ProgressChartProps {
  data: Array<{
    date: string;
    pullups: number;
    pushups: number;
    muscle_ups: number;
    handstand_seconds: number;
  }>;
}

export function ProgressChart({ data }: ProgressChartProps) {
  return (
    <div className="card h-[320px] p-4">
      <h3 className="mb-4 text-base font-semibold text-slate-900">Evolución del rendimiento</h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="pullups" stroke="#027a48" strokeWidth={2} />
          <Line type="monotone" dataKey="pushups" stroke="#0ea5e9" strokeWidth={2} />
          <Line type="monotone" dataKey="muscle_ups" stroke="#f97316" strokeWidth={2} />
          <Line type="monotone" dataKey="handstand_seconds" stroke="#7c3aed" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

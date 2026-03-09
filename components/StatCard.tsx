interface StatCardProps {
  title: string;
  value: string;
  hint?: string;
}

export function StatCard({ title, value, hint }: StatCardProps) {
  return (
    <article className="card p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </article>
  );
}

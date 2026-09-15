// Widget quick stats: Total / Done / Blocked / Overdue.
// stats: { total, done, blocked, overdue }
export default function ProjectStats({ stats }) {
  const s = stats || { total: 0, done: 0, blocked: 0, overdue: 0 };
  const cells = [
    { label: "Total", value: s.total, tone: "text-slate-900" },
    { label: "Done", value: s.done, tone: "text-green-600" },
    { label: "Blocked", value: s.blocked, tone: "text-red-600" },
    { label: "Overdue", value: s.overdue, tone: "text-amber-600" },
  ];
  return (
    <div className="grid grid-cols-4 divide-x divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
      {cells.map((c) => (
        <div key={c.label} className="flex flex-col items-center px-2 py-3">
          <span className={`text-xl font-bold ${c.tone}`}>{c.value}</span>
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

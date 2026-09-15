import { daysUntil } from "./timelineUtils";

// Banner cảnh báo milestone sắp tới / đã trễ, đặt trên cùng của Timeline.
export default function AlertsBanner({ milestones, today, onSelect }) {
  const alerts = milestones
    .map((m) => ({ m, days: daysUntil(m.date, today) }))
    .filter(({ m, days }) => m.status !== "done" && days !== null && days <= 30)
    .sort((a, b) => a.days - b.days);

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-amber-50/60 px-3 py-2">
      {alerts.map(({ m, days }) => {
        const missed = days < 0;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect?.(m)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition hover:opacity-80 ${
              missed
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {missed
              ? `🔴 ${m.name} đã miss ${Math.abs(days)} ngày`
              : `⚠️ ${m.name} còn ${days} ngày`}
          </button>
        );
      })}
    </div>
  );
}

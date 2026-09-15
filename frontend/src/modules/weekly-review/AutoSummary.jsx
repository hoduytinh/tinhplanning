import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Ban,
  Clock,
  CalendarDays,
  Bug,
  TrendingUp,
  ListChecks,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, tone = "text-slate-700", sub }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Icon size={13} /> {label}
      </div>
      <div className={`mt-0.5 text-xl font-bold ${tone}`}>{value}</div>
      {sub ? <div className="text-[11px] text-slate-400">{sub}</div> : null}
    </div>
  );
}

// Phần 1: Auto Summary — realtime, có thể thu gọn + nút refresh.
export default function AutoSummary({ summary, loading, onRefresh }) {
  const [open, setOpen] = useState(true);
  const t = summary?.tasks;
  const m = summary?.meetings;
  const b = summary?.bugs;
  const coverage = summary?.coverage_deltas || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-800"
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Tổng hợp tự động (realtime)
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Làm mới
        </button>
      </div>

      {open ? (
        <div className="space-y-3 px-4 pb-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard
              icon={CheckCircle2}
              label="Task hoàn thành"
              value={t?.completed_count ?? "—"}
              tone="text-emerald-600"
            />
            <StatCard
              icon={ListChecks}
              label="Task tạo mới"
              value={t?.created_count ?? "—"}
            />
            <StatCard
              icon={Ban}
              label="Blocked"
              value={t?.blocked_count ?? "—"}
              tone={t?.blocked_count ? "text-red-600" : "text-slate-700"}
            />
            <StatCard
              icon={Clock}
              label="Quá hạn"
              value={t?.overdue_count ?? "—"}
              tone={t?.overdue_count ? "text-amber-600" : "text-slate-700"}
            />
            <StatCard
              icon={CalendarDays}
              label="Cuộc họp"
              value={m?.count ?? "—"}
              sub={
                m ? `${m.action_items_open}/${m.action_items_total} action mở` : ""
              }
            />
            <StatCard
              icon={Bug}
              label="Bug đóng"
              value={b?.closed_count ?? "—"}
              tone="text-emerald-600"
              sub={b ? `${b.new_count} mới · ${b.open_count} mở` : ""}
            />
            <StatCard
              icon={TrendingUp}
              label="Coverage delta"
              value={coverage.length}
              sub="project có snapshot"
            />
          </div>

          {coverage.length > 0 ? (
            <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
              <div className="mb-1.5 text-xs font-medium text-slate-500">
                Pass-rate theo project
              </div>
              <div className="space-y-1">
                {coverage.map((c) => {
                  const up = c.pass_rate_delta >= 0;
                  return (
                    <div
                      key={c.project_id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium text-slate-700">{c.project}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-slate-600">{c.pass_rate_after}%</span>
                        <span
                          className={`text-xs font-medium ${
                            up ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {up ? "▲" : "▼"} {Math.abs(c.pass_rate_delta)}%
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {t?.completed?.length ? (
            <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
              <div className="mb-1 text-xs font-medium text-slate-500">
                Task hoàn thành trong tuần
              </div>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto text-sm text-slate-600">
                {t.completed.map((task) => (
                  <li key={task.id} className="truncate">
                    <span className="text-emerald-500">✓</span> {task.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

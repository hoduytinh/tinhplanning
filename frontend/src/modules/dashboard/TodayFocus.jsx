import { useState } from "react";
import { ChevronRight } from "lucide-react";
import Card from "../../shared/components/Card";
import StatusIcon from "../tasks/StatusIcon";
import { priorityMeta, splitPrefixDisplay } from "../tasks/taskConstants";

function dueText(task) {
  if (!task.due_date) return null;
  const due = new Date(task.due_date);
  const today = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfDay(due) - startOfDay(today)) / 86400000
  );
  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `${diffDays} days left`;
}

function PrefixBadges({ display, color }) {
  const parts = splitPrefixDisplay(display);
  if (parts.length === 0) return null;
  return (
    <span className="mr-1 inline-flex flex-wrap gap-0.5 align-middle">
      {parts.map((p, i) => (
        <span
          key={i}
          className="rounded px-1 text-[10px] font-semibold text-white"
          style={{ backgroundColor: color || "#94a3b8" }}
        >
          {p}
        </span>
      ))}
    </span>
  );
}

function TaskItem({ task, onOpen, onStatusChange, showNote }) {
  const pm = priorityMeta(task.priority);
  const due = dueText(task);
  return (
    <div className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
      <div className="mt-0.5 shrink-0">
        <StatusIcon
          status={task.status}
          onChange={(s) => onStatusChange(task, s)}
          size={16}
        />
      </div>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="block w-full truncate text-left text-sm text-slate-700 hover:text-brand"
          title={task.title}
        >
          <PrefixBadges display={task.prefix_display} color={task.prefix_color} />
          {task.title}
        </button>
        <div className="mt-0.5 flex items-center gap-2 text-[11px]">
          <span className={`rounded border px-1 ${pm.tone}`}>{pm.label}</span>
          {due && <span className="text-slate-500">· {due}</span>}
        </div>
        {showNote && task.first_note && (
          <p className="mt-1 truncate text-[11px] italic text-slate-500">
            → note: "{task.first_note}"
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, count, tasks, limit, onOpen, onStatusChange, showNote }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? tasks : tasks.slice(0, limit);
  const rest = tasks.length - shown.length;
  return (
    <div>
      <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <span>{icon}</span>
        {title} ({count})
      </h3>
      {tasks.length === 0 ? (
        <p className="px-2 py-1 text-xs text-slate-400">None</p>
      ) : (
        <div className="space-y-0.5">
          {shown.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              onOpen={onOpen}
              onStatusChange={onStatusChange}
              showNote={showNote}
            />
          ))}
          {rest > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="ml-2 mt-0.5 text-xs font-medium text-brand hover:underline"
            >
              +{rest} more · View all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Vùng A — Today's Focus.
export default function TodayFocus({
  focus,
  onOpenTask,
  onStatusChange,
  fullscreen = false,
}) {
  const f = focus || {
    urgent: [],
    blocked: [],
    due_this_week: [],
    done_today: [],
  };
  return (
    <Card className="flex h-full flex-col p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
        <ChevronRight size={16} className="text-brand" />
        Today's Focus
      </h2>
      <div
        className={`flex-1 space-y-4 overflow-y-auto pr-1 ${
          fullscreen ? "" : "max-h-[520px]"
        }`}
      >
        <Section
          icon="🔴"
          title="Urgent"
          count={f.urgent.length}
          tasks={f.urgent}
          limit={5}
          onOpen={onOpenTask}
          onStatusChange={onStatusChange}
        />
        <Section
          icon="⚠️"
          title="Blocked"
          count={f.blocked.length}
          tasks={f.blocked}
          limit={2}
          onOpen={onOpenTask}
          onStatusChange={onStatusChange}
          showNote
        />
        <Section
          icon="📅"
          title="Due This Week"
          count={f.due_this_week.length}
          tasks={f.due_this_week}
          limit={2}
          onOpen={onOpenTask}
          onStatusChange={onStatusChange}
        />
        <Section
          icon="✅"
          title="Done Today"
          count={f.done_today.length}
          tasks={f.done_today}
          limit={5}
          onOpen={onOpenTask}
          onStatusChange={onStatusChange}
        />
      </div>
    </Card>
  );
}

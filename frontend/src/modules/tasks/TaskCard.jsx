import { MoreHorizontal, Pencil, Trash2, Calendar, Tag } from "lucide-react";
import Badge from "../../shared/components/Badge";
import Dropdown from "../../shared/components/Dropdown";
import StatusIcon from "./StatusIcon";
import {
  formatDate,
  isOverdue,
  getUrgency,
  URGENCY_STYLES,
  priorityMeta,
  statusMeta,
} from "./taskConstants";
import { useAuth } from "../auth/useAuth";
import { hasPermission } from "../../shared/permissions";

export default function TaskCard({
  task,
  progress,
  onOpen,
  onEdit,
  onDelete,
  onStatusChange,
  showDescription = false,
}) {
  const { role } = useAuth();
  const p = priorityMeta(task.priority);
  const s = statusMeta(task.status);
  const overdue = isOverdue(task);
  const urgency = getUrgency(task);
  const urgencyStyle = urgency ? URGENCY_STYLES[urgency] : null;
  const hasProgress = progress && progress.total > 0;
  const pct = hasProgress
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <div
      className={`group flex flex-col rounded-xl border p-5 shadow-card transition-all duration-200 hover:shadow-cardHover ${
        urgencyStyle
          ? `${urgencyStyle.card} hover:border-current`
          : "border-slate-200 bg-white hover:border-brand"
      }`}
    >
      {/* Dòng 1: status icon + title + menu */}
      <div className="flex items-start gap-2.5">
        <div className="pt-0.5">
          <StatusIcon
            status={task.status}
            onChange={(s) => onStatusChange(task, { status: s })}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            onClick={() => onOpen(task)}
            className="line-clamp-2 cursor-pointer text-[15px] font-semibold leading-snug text-slate-900 hover:text-brand"
            title="Click to view details"
          >
            {task.prefix_display && (
              <span
                className="mr-1 font-bold"
                style={{ color: task.prefix_color || "#94a3b8" }}
              >
                {task.prefix_display}
              </span>
            )}
            {task.title}
          </h3>
          {urgencyStyle && (
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                urgency === "overdue"
                  ? "bg-red-600 text-white"
                  : urgency === "critical"
                    ? "bg-rose-500 text-white"
                    : "bg-amber-500 text-white"
              }`}
            >
              {urgencyStyle.label}
            </span>
          )}
          {showDescription && task.short_description && (
            <p className="mt-1 line-clamp-1 text-[13px] text-slate-500">
              {task.short_description}
            </p>
          )}
        </div>
        {(hasPermission(role, "tasks", "update") ||
          hasPermission(role, "tasks", "delete")) && (
          <Dropdown
            trigger={<MoreHorizontal size={16} />}
            items={[
              hasPermission(role, "tasks", "update") && {
                label: "Edit",
                icon: <Pencil size={14} />,
                onClick: () => onEdit(task),
              },
              hasPermission(role, "tasks", "delete") && {
                label: "Delete",
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => onDelete(task),
              },
            ].filter(Boolean)}
          />
        )}
      </div>

      {/* Dòng 2: priority + status + due date + tags */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-[30px]">
        <Badge tone={p.tone}>{p.label}</Badge>
        <Badge tone={s.tone}>
          <s.icon size={12} />
          {s.label}
        </Badge>
        <span
          className={`flex items-center gap-1.5 text-xs ${
            overdue ? "font-semibold text-red-600" : "text-slate-500"
          }`}
        >
          <Calendar size={13} />
          {formatDate(task.due_date)}
        </span>
        {(task.project_tag || task.sub_tag || task.tags?.length > 0) && (
          <div className="flex flex-wrap items-center gap-1">
            {/* Auto tags — sinh từ project/sub-block, style riêng có icon */}
            {[task.project_tag, task.sub_tag].filter(Boolean).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-500"
                title="Auto-tag"
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
            {/* Manual tags */}
            {task.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar nếu có sub-tasks */}
      {hasProgress && (
        <div className="mt-3 flex items-center gap-2 pl-[30px]">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] text-slate-500">
            {progress.done}/{progress.total} done
          </span>
        </div>
      )}
    </div>
  );
}

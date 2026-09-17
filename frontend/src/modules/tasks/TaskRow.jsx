import { MoreHorizontal, Pencil, Trash2, Calendar } from "lucide-react";
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
import { hasPermission, canOnObject } from "../../shared/permissions";

// Một hàng trong List view (table layout).
export default function TaskRow({
  task,
  onOpen,
  onEdit,
  onDelete,
  onStatusChange,
  showDescription = false,
}) {
  const { role, user } = useAuth();
  const p = priorityMeta(task.priority);
  const s = statusMeta(task.status);
  const overdue = isOverdue(task);
  const urgency = getUrgency(task);
  const urgencyStyle = urgency ? URGENCY_STYLES[urgency] : null;

  return (
    <tr
      className={`border-b border-slate-100 transition-colors last:border-0 ${
        urgencyStyle ? `${urgencyStyle.row} hover:brightness-95` : "hover:bg-slate-50"
      } ${urgency === "overdue" ? "border-l-[3px] border-l-red-600" : urgency === "critical" ? "border-l-[3px] border-l-rose-500" : urgency === "due_soon" ? "border-l-[3px] border-l-amber-500" : ""}`}
    >
      <td className="px-4 py-3">
        <StatusIcon
          status={task.status}
          onChange={(s) => onStatusChange(task, { status: s })}
        />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onOpen(task)}
          className="text-left font-medium text-slate-900 hover:text-brand"
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
        </button>
        {showDescription && task.short_description && (
          <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
            {task.short_description}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={p.tone}>{p.label}</Badge>
          <Badge tone={s.tone}>
            <s.icon size={12} />
            {s.label}
          </Badge>
        </div>
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <span
          className={`flex items-center gap-1.5 text-sm ${
            overdue ? "font-semibold text-red-600" : "text-slate-500"
          }`}
        >
          <Calendar size={13} />
          {formatDate(task.due_date)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end">
          {(hasPermission(role, "tasks", "update") ||
            canOnObject(role, "tasks", "delete", task, user?.id)) && (
            <Dropdown
              trigger={<MoreHorizontal size={16} />}
              items={[
                hasPermission(role, "tasks", "update") && {
                  label: "Edit",
                  icon: <Pencil size={14} />,
                  onClick: () => onEdit(task),
                },
                canOnObject(role, "tasks", "delete", task, user?.id) && {
                  label: "Delete",
                  icon: <Trash2 size={14} />,
                  danger: true,
                  onClick: () => onDelete(task),
                },
              ].filter(Boolean)}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

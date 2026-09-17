import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Badge from "../../shared/components/Badge";
import Dropdown from "../../shared/components/Dropdown";
import HealthBadge from "./HealthBadge";
import {
  formatShortDate,
  healthMeta,
  projectPriorityMeta,
  projectStatusMeta,
} from "./projectConstants";
import { useAuth } from "../auth/useAuth";
import { hasPermission } from "../../shared/permissions";

// Hàng trong List view.
// props: project, stats, onOpen, onEdit, onDelete
export default function ProjectRow({ project, stats, onOpen, onEdit, onDelete }) {
  const { role } = useAuth();
  const prio = projectPriorityMeta(project.priority);
  const status = projectStatusMeta(project.status);
  const health = healthMeta(project.health);
  const s = stats || { total: 0, done: 0, blocked: 0, overdue: 0 };
  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;

  return (
    <tr
      onClick={() => onOpen(project)}
      className="cursor-pointer border-b border-slate-100 text-sm transition hover:bg-slate-50"
    >
      <td className="px-4 py-3">
        <HealthBadge health={project.health} size="sm" />
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">{project.name}</div>
      </td>
      <td className="px-4 py-3">
        <Badge tone={status.tone}>{status.label}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge tone={prio.tone}>{prio.label}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${health.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">{pct}%</span>
        </div>
      </td>
      <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">
        {formatShortDate(project.start_date)} → {formatShortDate(project.end_date)}
      </td>
      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        {(hasPermission(role, "projects", "update") ||
          hasPermission(role, "projects", "delete")) && (
          <Dropdown
            trigger={<MoreHorizontal size={16} />}
            items={[
              hasPermission(role, "projects", "update") && {
                label: "Edit",
                icon: <Pencil size={14} />,
                onClick: () => onEdit(project),
              },
              hasPermission(role, "projects", "delete") && {
                label: "Delete",
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => onDelete(project),
              },
            ].filter(Boolean)}
          />
        )}
      </td>
    </tr>
  );
}

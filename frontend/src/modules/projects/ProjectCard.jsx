import { MoreHorizontal, Pencil, Trash2, Calendar, ArrowRight } from "lucide-react";
import Badge from "../../shared/components/Badge";
import Dropdown from "../../shared/components/Dropdown";
import HealthBadge from "./HealthBadge";
import {
  formatShortDate,
  healthMeta,
  projectPriorityMeta,
} from "./projectConstants";
import { useAuth } from "../auth/useAuth";
import { hasPermission } from "../../shared/permissions";

// Card 1 project trong list view. Click → mở detail page.
// props: project, stats {total,done,blocked,overdue}, onOpen, onEdit, onDelete
export default function ProjectCard({ project, stats, onOpen, onEdit, onDelete }) {
  const { role } = useAuth();
  const prio = projectPriorityMeta(project.priority);
  const health = healthMeta(project.health);
  const s = stats || { total: 0, done: 0, blocked: 0, overdue: 0 };
  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;

  return (
    <div
      onClick={() => onOpen(project)}
      className="group flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-all duration-200 hover:border-brand hover:shadow-cardHover"
    >
      {/* Dòng 1: health badge + menu */}
      <div className="flex items-center justify-between">
        <HealthBadge health={project.health} size="sm" />
        <div onClick={(e) => e.stopPropagation()}>
          {(hasPermission(role, "projects", "update") ||
            hasPermission(role, "projects", "delete")) && (
            <Dropdown
              trigger={<MoreHorizontal size={16} />}
              items={[
                hasPermission(role, "projects", "update") && {
                  label: "Sửa",
                  icon: <Pencil size={14} />,
                  onClick: () => onEdit(project),
                },
                hasPermission(role, "projects", "delete") && {
                  label: "Xóa",
                  icon: <Trash2 size={14} />,
                  danger: true,
                  onClick: () => onDelete(project),
                },
              ].filter(Boolean)}
            />
          )}
        </div>
      </div>

      {/* Tên */}
      <h3 className="mt-3 line-clamp-1 text-base font-bold text-slate-900 group-hover:text-brand">
        {project.name}
      </h3>

      {/* Progress bar màu theo health */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium text-slate-700">{pct}%</span>
          <span>
            {s.done}/{s.total} tasks done
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${health.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Quick stats hiện khi hover */}
        <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400 opacity-0 transition group-hover:opacity-100">
          <span className="text-green-600">✓{s.done}</span>
          <span className="text-red-600">⊘{s.blocked}</span>
          <span className="text-amber-600">⚠{s.overdue}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
        <Calendar size={13} />
        <span>{formatShortDate(project.start_date)}</span>
        <ArrowRight size={12} className="text-slate-300" />
        <span>{formatShortDate(project.end_date)}</span>
      </div>

      <div className="my-3 border-t border-slate-100" />

      {/* Priority + tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={prio.tone}>{prio.label}</Badge>
        {(project.tags || []).map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
          >
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
}

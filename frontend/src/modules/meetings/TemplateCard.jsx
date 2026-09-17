import { Pencil, Trash2, Lock, Layers } from "lucide-react";
import Card from "../../shared/components/Card";
import Badge from "../../shared/components/Badge";
import RoleGuard from "../../shared/RoleGuard";

export default function TemplateCard({ template, onEdit, onDelete }) {
  const sectionCount = template.config?.sections?.length || 0;

  return (
    <Card className="p-4" style={{ borderTop: `3px solid ${template.color}` }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{template.icon}</span>
          <div>
            <h3 className="font-semibold text-slate-900">{template.name}</h3>
            <p className="text-xs text-slate-400">{template.type}</p>
          </div>
        </div>
        {template.is_system && (
          <Badge tone="bg-slate-100 text-slate-500 border-slate-200">
            <Lock size={11} /> System
          </Badge>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Layers size={13} /> {sectionCount} section
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onEdit(template)}
          className="flex items-center gap-1 text-sm text-brand hover:text-brand-dark"
        >
          <Pencil size={14} /> {template.is_system ? "View" : "Edit"}
        </button>
        {!template.is_system && (
          <RoleGuard resource="meeting_templates" action="delete">
            <button
              onClick={() => onDelete(template)}
              className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
            >
              <Trash2 size={14} /> Delete
            </button>
          </RoleGuard>
        )}
      </div>
    </Card>
  );
}

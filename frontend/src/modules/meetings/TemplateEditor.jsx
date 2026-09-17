import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, Plus, Trash2, GripVertical, Lock } from "lucide-react";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import Select from "../../shared/components/Select";
import Badge from "../../shared/components/Badge";
import ToastProvider, { useToast } from "../dashboard/Toast";
import {
  SECTION_TYPES,
  TEMPLATE_TYPE_OPTIONS,
  TEMPLATE_ICONS,
  TEMPLATE_COLORS,
} from "./meetingConstants";
import {
  createTemplate,
  fetchTemplate,
  updateTemplate,
} from "./templateApi";

const EMPTY = {
  name: "",
  type: "custom",
  icon: "📅",
  color: "#6366f1",
  config: {
    sections: [],
    close_checklist: [],
    defaults: { agenda_items: [] },
    action_items: {
      enabled: true,
      has_assignee: true,
      has_due_date: true,
      has_priority: false,
      has_category: false,
      categories: [],
    },
  },
};

function SectionRow({ section, index, readOnly, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section._id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
    >
      {!readOnly && (
        <button {...attributes} {...listeners} className="cursor-grab text-slate-300">
          <GripVertical size={16} />
        </button>
      )}
      <span className="text-xs font-semibold text-slate-400">{index + 1}</span>
      <input
        value={section.title}
        disabled={readOnly}
        onChange={(e) => onChange({ ...section, title: e.target.value })}
        className="flex-1 rounded border border-transparent px-2 py-1 text-sm hover:border-slate-200 focus:border-brand focus:outline-none disabled:bg-transparent"
      />
      <Select
        value={section.type}
        onChange={(e) => onChange({ ...section, type: e.target.value })}
        options={SECTION_TYPES.map((s) => ({ value: s.value, label: s.label }))}
        className="w-44"
        disabled={readOnly}
        ariaLabel="Section type"
      />
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={!!section.is_required}
          disabled={readOnly}
          onChange={(e) => onChange({ ...section, is_required: e.target.checked })}
        />
        Required
      </label>
      {!readOnly && (
        <button onClick={() => onRemove(section)} className="text-slate-300 hover:text-red-500">
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

// Danh sách chuỗi đơn giản (checklist / agenda mặc định).
function StringList({ items, readOnly, onChange, placeholder }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={it}
            disabled={readOnly}
            onChange={(e) =>
              onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))
            }
            className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none disabled:bg-slate-50"
          />
          {!readOnly && (
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-slate-300 hover:text-red-500"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder={placeholder}
            className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
          />
          <Button size="sm" variant="ghost" onClick={add}>
            <Plus size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}

function EditorInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !id;
  const [tpl, setTpl] = useState(EMPTY);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const load = useCallback(async () => {
    if (isNew) return;
    try {
      const data = await fetchTemplate(id);
      const cfg = data.config || {};
      setTpl({
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
        config: {
          sections: (cfg.sections || []).map((s, i) => ({
            _id: `s${i}-${Math.random()}`,
            type: s.type || "notes",
            title: s.title || "",
            order: s.order ?? i + 1,
            is_required: !!s.is_required,
            config: s.config || {},
          })),
          close_checklist: cfg.close_checklist || [],
          defaults: { agenda_items: cfg.defaults?.agenda_items || [] },
          action_items: {
            enabled: cfg.action_items?.enabled ?? true,
            has_assignee: cfg.action_items?.has_assignee ?? true,
            has_due_date: cfg.action_items?.has_due_date ?? true,
            has_priority: cfg.action_items?.has_priority ?? false,
            has_category: cfg.action_items?.has_category ?? false,
            categories: cfg.action_items?.categories || [],
          },
        },
      });
      setReadOnly(data.is_system);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [id, isNew, toast]);

  useEffect(() => {
    if (isNew) {
      setTpl({ ...EMPTY, config: { ...EMPTY.config, sections: [] } });
    } else {
      load();
    }
  }, [isNew, load]);

  const setCfg = (patch) =>
    setTpl((t) => ({ ...t, config: { ...t.config, ...patch } }));

  const sections = tpl.config.sections;

  const onDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex((s) => s._id === active.id);
    const newIdx = sections.findIndex((s) => s._id === over.id);
    setCfg({ sections: arrayMove(sections, oldIdx, newIdx) });
  };

  const addSection = () =>
    setCfg({
      sections: [
        ...sections,
        {
          _id: `s-${Date.now()}`,
          type: "notes",
          title: "New section",
          order: sections.length + 1,
          is_required: false,
          config: {},
        },
      ],
    });

  const save = async () => {
    if (!tpl.name.trim()) {
      toast("Enter a template name.", "error");
      return;
    }
    setSaving(true);
    const config = {
      ...tpl.config,
      sections: sections.map((s, i) => ({
        type: s.type,
        title: s.title,
        order: i + 1,
        is_required: s.is_required,
        config: s.config || {},
      })),
    };
    const payload = {
      name: tpl.name.trim(),
      type: tpl.type,
      icon: tpl.icon,
      color: tpl.color,
      config,
    };
    try {
      if (isNew) await createTemplate(payload);
      else await updateTemplate(id, payload);
      toast("Template saved.");
      navigate("/meeting-templates");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading...</p>;

  const input =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30 disabled:bg-slate-50";
  const ai = tpl.config.action_items;

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate("/meeting-templates")}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> Templates
      </button>

      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          {isNew ? "Create Template" : readOnly ? "View Template" : "Edit Template"}
          {readOnly && (
            <Badge tone="bg-slate-100 text-slate-500 border-slate-200">
              <Lock size={12} /> System (read-only)
            </Badge>
          )}
        </h1>
        {!readOnly && (
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
      </div>

      <Card className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
            <input
              value={tpl.name}
              disabled={readOnly}
              onChange={(e) => setTpl((t) => ({ ...t, name: e.target.value }))}
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <Select
              value={tpl.type}
              onChange={(e) => setTpl((t) => ({ ...t, type: e.target.value }))}
              options={TEMPLATE_TYPE_OPTIONS}
              className="w-full"
              disabled={readOnly}
              ariaLabel="Type"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Icon</label>
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_ICONS.map((ic) => (
                <button
                  key={ic}
                  disabled={readOnly}
                  onClick={() => setTpl((t) => ({ ...t, icon: ic }))}
                  className={`h-8 w-8 rounded text-lg ${
                    tpl.icon === ic ? "bg-brand/10 ring-2 ring-brand" : "hover:bg-slate-100"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Color</label>
            <div className="flex gap-1">
              {TEMPLATE_COLORS.map((c) => (
                <button
                  key={c}
                  disabled={readOnly}
                  onClick={() => setTpl((t) => ({ ...t, color: c }))}
                  style={{ background: c }}
                  className={`h-7 w-7 rounded-full ${
                    tpl.color === c ? "ring-2 ring-offset-2 ring-slate-400" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Sections</h2>
          {!readOnly && (
            <Button size="sm" variant="secondary" onClick={addSection}>
              <Plus size={15} /> Add section
            </Button>
          )}
        </div>
        {sections.length === 0 ? (
          <p className="text-sm text-slate-400">No sections yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={sections.map((s) => s._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sections.map((s, i) => (
                  <SectionRow
                    key={s._id}
                    section={s}
                    index={i}
                    readOnly={readOnly}
                    onChange={(next) =>
                      setCfg({
                        sections: sections.map((x) => (x._id === next._id ? next : x)),
                      })
                    }
                    onRemove={(rm) =>
                      setCfg({ sections: sections.filter((x) => x._id !== rm._id) })
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Default agenda</h2>
          <StringList
            items={tpl.config.defaults.agenda_items}
            readOnly={readOnly}
            placeholder="Add agenda item..."
            onChange={(items) => setCfg({ defaults: { agenda_items: items } })}
          />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Closing checklist</h2>
          <StringList
            items={tpl.config.close_checklist}
            readOnly={readOnly}
            placeholder="Add checklist item..."
            onChange={(items) => setCfg({ close_checklist: items })}
          />
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-slate-800">Action Items</h2>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          {[
            ["has_assignee", "Assignee"],
            ["has_due_date", "Due date"],
            ["has_priority", "Priority"],
            ["has_category", "Category"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={!!ai[key]}
                disabled={readOnly}
                onChange={(e) =>
                  setCfg({ action_items: { ...ai, [key]: e.target.checked } })
                }
              />
              {label}
            </label>
          ))}
        </div>
        {ai.has_category && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category list</label>
            <StringList
              items={ai.categories}
              readOnly={readOnly}
              placeholder="Add category (e.g. DV, DE)..."
              onChange={(items) => setCfg({ action_items: { ...ai, categories: items } })}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

export default function TemplateEditor() {
  return (
    <ToastProvider>
      <EditorInner />
    </ToastProvider>
  );
}

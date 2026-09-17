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
import {
  ArrowLeft,
  Clock,
  MapPin,
  Repeat,
  Pencil,
  Trash2,
  Copy,
  CheckCircle2,
  Check,
  FileText,
  Plus,
  GripVertical,
} from "lucide-react";
import Button from "../../shared/components/Button";
import Badge from "../../shared/components/Badge";
import Card from "../../shared/components/Card";
import Select from "../../shared/components/Select";
import RoleGuard from "../../shared/RoleGuard";
import ToastProvider, { useToast } from "../dashboard/Toast";
import AttendeeList from "./AttendeeList";
import AgendaList from "./AgendaList";
import ActionItemList from "./ActionItemList";
import CloseDialog from "./CloseDialog";
import SummaryModal from "./SummaryModal";
import SectionConfigModal from "./SectionConfigModal";
import MeetingForm from "./MeetingForm";
import WidgetRenderer from "./widgets/WidgetRenderer";
import {
  MEETING_STATUSES,
  RECURRING_OPTIONS,
  SECTION_COLORS,
  metaFrom,
  fmtDate,
  fmtTime,
} from "./meetingConstants";
import {
  addSection,
  deleteMeeting,
  deleteSection,
  duplicateMeeting,
  fetchMeeting,
  updateMeeting,
  updateSection,
} from "./meetingApi";
import { fetchTemplate, fetchTemplates } from "./templateApi";

function SectionColorPicker({ value, onPick }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {SECTION_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onPick(c.value)}
          title={c.label}
          aria-label={c.label}
          style={{ backgroundColor: c.value }}
          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
            (value || "#ffffff") === c.value
              ? "border-brand ring-2 ring-brand/40"
              : "border-slate-300"
          }`}
        >
          {(value || "#ffffff") === c.value && (
            <Check size={11} className="text-slate-600" />
          )}
        </button>
      ))}
    </div>
  );
}

function SectionBlock({
  section,
  onSave,
  onSaveMeta,
  onCommitMeta,
  onDelete,
  editable = true,
  actionItemsProps,
}) {
  const isActionItems = section.section_type === "action_items";
  return (
    <Card className="p-4" style={{ backgroundColor: section.color || "#ffffff" }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editable ? (
            <input
              value={section.title}
              onChange={(e) => onSaveMeta?.(section, { title: e.target.value })}
              onBlur={(e) => onCommitMeta?.(section, { title: e.target.value })}
              className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-slate-800 hover:border-slate-200 focus:border-brand focus:bg-white focus:outline-none"
              placeholder="Section title"
            />
          ) : (
            <h3 className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-800">
              {section.title}
              {section.is_required && (
                <Badge tone="bg-slate-100 text-slate-500 border-slate-200">
                  required
                </Badge>
              )}
            </h3>
          )}
          {editable && (
            <div className="mt-2">
              <SectionColorPicker
                value={section.color}
                onPick={(color) => onCommitMeta?.(section, { color })}
              />
            </div>
          )}
        </div>
        {editable && !section.is_required && (
          <button
            onClick={() => onDelete(section)}
            className="mt-1 shrink-0 text-slate-300 hover:text-red-500"
            title="Delete section"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
      {isActionItems ? (
        <ActionItemList {...actionItemsProps} editable={editable} />
      ) : (
        <WidgetRenderer
          section={section}
          readOnly={!editable}
          onSave={(content) => onSave(section, content)}
        />
      )}
    </Card>
  );
}

// Bọc SectionBlock bằng useSortable để kéo-thả đổi thứ tự (chỉ dùng khi editMode).
function SortableSectionBlock({
  section,
  onSave,
  onSaveMeta,
  onCommitMeta,
  onDelete,
  actionItemsProps,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        {...attributes}
        {...listeners}
        className="mt-4 shrink-0 cursor-grab text-slate-300 hover:text-slate-500"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <SectionBlock
          section={section}
          onSave={onSave}
          onSaveMeta={onSaveMeta}
          onCommitMeta={onCommitMeta}
          onDelete={onDelete}
          actionItemsProps={actionItemsProps}
          editable
        />
      </div>
    </div>
  );
}

function DetailInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [meeting, setMeeting] = useState(null);
  const [template, setTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [closeOpen, setCloseOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const load = useCallback(async () => {
    try {
      const data = await fetchMeeting(id);
      setMeeting(data);
      if (data.template_id) {
        fetchTemplate(data.template_id).then(setTemplate).catch(() => setTemplate(null));
      }
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => {});
  }, []);

  const onError = (msg) => toast(msg, "error");

  const patchMeeting = async (changes) => {
    try {
      const updated = await updateMeeting(id, changes);
      setMeeting((m) => ({ ...m, ...updated }));
    } catch (err) {
      onError(err.message);
    }
  };

  const saveSection = async (section, content) => {
    try {
      await updateSection(id, section.id, { content });
      setMeeting((m) => ({
        ...m,
        sections: m.sections.map((s) => (s.id === section.id ? { ...s, content } : s)),
      }));
    } catch (err) {
      onError(err.message);
    }
  };

  // Cập nhật lạc quan meta (title/color) của section trong state, chưa gọi API.
  const saveSectionMeta = (section, changes) => {
    setMeeting((m) => ({
      ...m,
      sections: m.sections.map((s) =>
        s.id === section.id ? { ...s, ...changes } : s
      ),
    }));
  };

  // Lưu meta (title/color) xuống backend.
  const commitSectionMeta = async (section, changes) => {
    saveSectionMeta(section, changes);
    try {
      await updateSection(id, section.id, changes);
    } catch (err) {
      onError(err.message);
      load();
    }
  };

  const removeSection = async (section) => {
    if (!window.confirm(`Delete section "${section.title}"?`)) return;
    try {
      await deleteSection(id, section.id);
      load();
    } catch (err) {
      onError(err.message);
    }
  };

  // Kéo-thả đổi thứ tự section: cập nhật lạc quan trước, rồi persist order mới
  // qua PATCH cho từng section hiển thị.
  const handleSectionDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = meeting.sections || [];
    const oldIndex = current.findIndex((s) => s.id === active.id);
    const newIndex = current.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(current, oldIndex, newIndex).map((s, idx) => ({
      ...s,
      order: idx,
    }));
    setMeeting((m) => ({ ...m, sections: reordered }));
    Promise.all(
      reordered.map((s) => updateSection(id, s.id, { order: s.order }))
    ).catch((err) => {
      onError(err.message);
      load();
    });
  };

  const addNewSection = async (payload) => {
    try {
      await addSection(id, payload);
      load();
    } catch (err) {
      onError(err.message);
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await duplicateMeeting(id);
      toast("Meeting duplicated.");
      navigate(`/meetings/${copy.id}`);
    } catch (err) {
      onError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this meeting?")) return;
    try {
      await deleteMeeting(id);
      navigate("/meetings");
    } catch (err) {
      onError(err.message);
    }
  };

  const handleEdit = async (payload) => {
    await patchMeeting(payload);
    toast("Updated.");
  };

  const handleClosed = (result) => {
    setCloseOpen(false);
    let msg = "Meeting ended.";
    if (result.next_meeting_id) {
      msg += ` Next meeting created (carried over ${result.carried_over_count} action item(s)).`;
    }
    toast(msg);
    load();
  };

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (!meeting) return <p className="text-slate-500">Meeting not found.</p>;

  const status = metaFrom(MEETING_STATUSES, meeting.status, MEETING_STATUSES[0]);
  const categories = template?.config?.action_items?.categories || [];
  const recurring = meeting.recurring && meeting.recurring !== "none";
  const isDone = meeting.status === "done";

  // Tất cả section (kể cả action_items) render chung ở cột trái, có thể sắp xếp.
  const displaySections = meeting.sections || [];
  const actionItemsProps = {
    meetingId: meeting.id,
    items: meeting.action_items,
    categories,
    onChanged: load,
    onError,
    onToast: (m) => toast(m),
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate("/meetings")}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> Meetings list
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {template?.icon && <span className="text-2xl">{template.icon}</span>}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{meeting.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge tone={status.tone}>{status.label}</Badge>
              {template && (
                <span className="text-xs text-slate-400">{template.name}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSummaryOpen(true)}>
            <FileText size={15} /> Summary
          </Button>
          <RoleGuard resource="meetings" action="create">
            <Button variant="secondary" size="sm" onClick={handleDuplicate}>
              <Copy size={15} /> Duplicate
            </Button>
          </RoleGuard>
          {!isDone && (
            <RoleGuard resource="meetings" action="update">
              <Button size="sm" onClick={() => setCloseOpen(true)}>
                <CheckCircle2 size={15} /> End
              </Button>
            </RoleGuard>
          )}
          {editMode ? (
            <>
              <RoleGuard resource="meetings" action="update">
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil size={15} /> Edit details
                </Button>
              </RoleGuard>
              <RoleGuard resource="meetings" action="delete">
                <Button variant="danger" size="sm" onClick={handleDelete}>
                  <Trash2 size={15} /> Delete
                </Button>
              </RoleGuard>
              <Button size="sm" onClick={() => setEditMode(false)}>
                <Check size={15} /> Done
              </Button>
            </>
          ) : (
            <RoleGuard resource="meetings" action="update">
              <Button variant="secondary" size="sm" onClick={() => setEditMode(true)}>
                <Pencil size={15} /> Edit
              </Button>
            </RoleGuard>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[60%_40%]">
        {/* Cột trái: nội dung / widgets / action items */}
        <div className="space-y-4">
          {editMode && (
            <Button variant="secondary" size="sm" onClick={() => setSectionOpen(true)}>
              <Plus size={15} /> Add section
            </Button>
          )}

          {editMode ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext
                items={displaySections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {displaySections.map((s) => (
                    <SortableSectionBlock
                      key={s.id}
                      section={s}
                      onSave={saveSection}
                      onSaveMeta={saveSectionMeta}
                      onCommitMeta={commitSectionMeta}
                      onDelete={removeSection}
                      actionItemsProps={actionItemsProps}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            displaySections.map((s) => (
              <SectionBlock
                key={s.id}
                section={s}
                onSave={saveSection}
                onDelete={removeSection}
                actionItemsProps={actionItemsProps}
                editable={false}
              />
            ))
          )}
        </div>

        {/* Cột phải: metadata */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Information</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock size={15} className="text-slate-400" />
                {fmtDate(meeting.date)}
                {meeting.start_time && ` · ${fmtTime(meeting.start_time)}`}
                {meeting.end_time && `–${fmtTime(meeting.end_time)}`}
              </div>
              {meeting.location && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin size={15} className="text-slate-400" />
                  {meeting.location}
                </div>
              )}
              {recurring && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Repeat size={15} className="text-slate-400" />
                  {metaFrom(RECURRING_OPTIONS, meeting.recurring)?.label || meeting.recurring}
                </div>
              )}
              <div className="pt-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Status
                </label>
                {editMode ? (
                  <Select
                    value={meeting.status}
                    onChange={(e) => patchMeeting({ status: e.target.value })}
                    options={MEETING_STATUSES}
                    className="w-full"
                    ariaLabel="Status"
                  />
                ) : (
                  <Badge tone={status.tone}>{status.label}</Badge>
                )}
              </div>
            </dl>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Attendees</h3>
            <AttendeeList
              meetingId={meeting.id}
              attendees={meeting.attendees}
              onChanged={load}
              onError={onError}
              editable={editMode}
            />
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Agenda</h3>
            <AgendaList
              meetingId={meeting.id}
              items={meeting.agenda_items}
              onChanged={load}
              onError={onError}
              editable={editMode}
            />
          </Card>
        </div>
      </div>

      <CloseDialog
        open={closeOpen}
        meeting={meeting}
        onClose={() => setCloseOpen(false)}
        onDone={handleClosed}
        onError={onError}
      />
      <SummaryModal
        open={summaryOpen}
        meetingId={meeting.id}
        onClose={() => setSummaryOpen(false)}
        onError={onError}
      />
      <SectionConfigModal
        open={sectionOpen}
        onClose={() => setSectionOpen(false)}
        onSubmit={addNewSection}
      />
      <MeetingForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        templates={templates}
        initial={meeting}
      />
    </div>
  );
}

export default function MeetingDetailPage() {
  return (
    <ToastProvider>
      <DetailInner />
    </ToastProvider>
  );
}

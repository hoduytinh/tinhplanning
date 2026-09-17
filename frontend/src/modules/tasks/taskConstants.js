// Shared constants + label/color helpers for the Tasks module.
// `tone` là chuỗi class Tailwind theo đúng design system (bg/text/border).
import { Circle, PlayCircle, Ban, Eye, CheckCircle2, XCircle } from "lucide-react";

export const PRIORITIES = [
  {
    value: "critical",
    label: "🔴 Critical",
    description: "Block / tapeout risk",
    tone: "bg-red-50 text-red-600 border-red-200",
  },
  {
    value: "important",
    label: "🟠 Important",
    description: "Needs to be done this week",
    tone: "bg-amber-50 text-amber-600 border-amber-200",
  },
  {
    value: "normal",
    label: "🟢 Normal",
    description: "Everyday work",
    tone: "bg-green-50 text-green-600 border-green-200",
  },
  {
    value: "backlog",
    label: "⚪ Backlog",
    description: "Saved for later, not urgent",
    tone: "bg-slate-100 text-slate-500 border-slate-200",
  },
];

export const STATUSES = [
  {
    value: "not_started",
    label: "Not Started",
    icon: Circle,
    color: "#94a3b8",
    description: "Not started yet",
    tone: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    value: "in_progress",
    label: "In Progress",
    icon: PlayCircle,
    color: "#3b82f6",
    description: "In progress",
    tone: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    value: "blocked",
    label: "Blocked",
    icon: Ban,
    color: "#dc2626",
    description: "Blocked — waiting on someone / a tool / information",
    tone: "bg-red-50 text-red-600 border-red-200",
  },
  {
    value: "in_review",
    label: "In Review",
    icon: Eye,
    color: "#9333ea",
    description: "Completed, awaiting review / approval",
    tone: "bg-purple-50 text-purple-600 border-purple-200",
  },
  {
    value: "done",
    label: "Done",
    icon: CheckCircle2,
    color: "#16a34a",
    description: "Fully completed",
    tone: "bg-green-50 text-green-700 border-green-200",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    icon: XCircle,
    color: "#94a3b8",
    description: "No longer being worked on, for a reason",
    tone: "bg-slate-100 text-slate-400 border-slate-200",
  },
];

export const TYPES = [
  {
    value: "my_task",
    label: "My Task",
    tone: "bg-indigo-50 text-indigo-600 border-indigo-200",
  },
  {
    value: "delegated",
    label: "Delegated",
    tone: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    value: "waiting_for",
    label: "Waiting for Others",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
];

export const SORT_OPTIONS = [
  { value: "created_at", label: "Created date" },
  { value: "priority", label: "Priority" },
  { value: "due_date", label: "Due date" },
];

const _lookup = (list, value) => list.find((x) => x.value === value);

export const priorityMeta = (v) => _lookup(PRIORITIES, v) || PRIORITIES[2];
export const statusMeta = (v) => _lookup(STATUSES, v) || STATUSES[0];
export const typeMeta = (v) => _lookup(TYPES, v) || TYPES[0];

// Mô tả được lưu dạng HTML (Tiptap). Ở những chỗ chỉ cần xem trước dạng text
// thuần (task card, list row) phải bóc hết thẻ HTML, nếu không React sẽ hiển
// thị nguyên văn chuỗi "<p></p><p><mark ...>" thay vì nội dung.
export function htmlToPlainText(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function isOverdue(task) {
  if (!task.due_date || task.status === "done") return false;
  return new Date(task.due_date) < new Date();
}

const DUE_SOON_DAYS = 2;

// Sắp tới hạn: còn hạn (chưa overdue) nhưng due_date nằm trong DUE_SOON_DAYS
// ngày tới, và task chưa xong/không còn bị huỷ.
export function isDueSoon(task) {
  if (!task.due_date || task.status === "done" || task.status === "cancelled") {
    return false;
  }
  const due = new Date(task.due_date);
  const now = new Date();
  if (due < now) return false; // đã overdue — tính riêng, không tính là due-soon
  const diffDays = (due - now) / 86400000;
  return diffDays <= DUE_SOON_DAYS;
}

// Mức độ khẩn cấp để highlight nền task card/row. Ưu tiên theo thứ tự:
// quá hạn > priority Critical > sắp tới hạn. Trả về null nếu task bình thường.
export function getUrgency(task) {
  if (isOverdue(task)) return "overdue";
  if (
    task.priority === "critical" &&
    task.status !== "done" &&
    task.status !== "cancelled"
  ) {
    return "critical";
  }
  if (isDueSoon(task)) return "due_soon";
  return null;
}

// Style tương ứng từng mức khẩn cấp — dùng cho nền + viền trái nổi bật của
// TaskCard/TaskRow, và badge nhỏ đánh dấu mức độ (nếu cần).
export const URGENCY_STYLES = {
  overdue: {
    card: "border-red-300 bg-red-100/90 border-l-[4px] border-l-red-600",
    row: "bg-red-100/80",
    label: "Overdue",
  },
  critical: {
    card: "border-rose-300 bg-rose-100/80 border-l-[4px] border-l-rose-500",
    row: "bg-rose-100/70",
    label: "Critical",
  },
  due_soon: {
    card: "border-amber-300 bg-amber-100/80 border-l-[4px] border-l-amber-500",
    row: "bg-amber-100/70",
    label: "Due soon",
  },
};

// --- Prefix & Auto-tagging (client-side preview) --------------------------
// Backend là nguồn chân lý cho prefix_display/project_tag/sub_tag của task đã
// lưu. Các helper dưới đây chỉ dùng để xem trước realtime trong form khi user
// chưa bấm lưu (chọn project + sub-block).

// slug hoá 1 tên node giống backend generate_slug.
export function slugify(name) {
  const s = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "node";
}

export function projectTagFromPrefix(prefix) {
  return "#" + (prefix || "").toLowerCase().replace(/\s+/g, "");
}

// Tính prefix preview từ project (có .prefix/.name/.prefix_color) + path
// sub-block (mảng node root→leaf, mỗi node có .name/.slug). project = null
// → task Non-Proj (màu xám cố định).
export function computePrefixPreview(project, subblockPath = []) {
  if (!project) {
    return {
      prefix_display: "[Non-Proj]",
      project_tag: "#non-proj",
      sub_tag: null,
      parts: ["Non-Proj"],
      prefix_color: "#94a3b8",
    };
  }
  const prefix = (project.prefix || project.name || "proj").trim();
  const projectTag = projectTagFromPrefix(prefix);
  const parts = [prefix, ...subblockPath.map((n) => n.name)];
  let subTag = null;
  if (subblockPath.length > 0) {
    const slugs = subblockPath.map((n) => n.slug || slugify(n.name));
    subTag = projectTag + "-" + slugs.join("-");
  }
  return {
    prefix_display: parts.map((p) => `[${p}]`).join(""),
    project_tag: projectTag,
    sub_tag: subTag,
    parts,
    prefix_color: project.prefix_color || "#3b82f6",
  };
}

// Tách chuỗi prefix_display "[A][B][C]" → ["A","B","C"] để render badge.
export function splitPrefixDisplay(display) {
  if (!display) return [];
  const out = [];
  const re = /\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(display)) !== null) out.push(m[1]);
  return out;
}

// Tìm đường dẫn (mảng node root→leaf) tới subblockId trong tree lồng nhau.
export function findSubblockPath(tree, subblockId) {
  if (subblockId == null) return [];
  const walk = (nodes, trail) => {
    for (const n of nodes) {
      const next = [...trail, n];
      if (n.id === subblockId) return next;
      const found = walk(n.children || [], next);
      if (found) return found;
    }
    return null;
  };
  return walk(tree || [], []) || [];
}

// Shared constants + label/color helpers for the Tasks module.
// `tone` là chuỗi class Tailwind theo đúng design system (bg/text/border).

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
    description: "Cần xong tuần này",
    tone: "bg-amber-50 text-amber-600 border-amber-200",
  },
  {
    value: "normal",
    label: "🟢 Normal",
    description: "Việc thường ngày",
    tone: "bg-green-50 text-green-600 border-green-200",
  },
  {
    value: "backlog",
    label: "⚪ Backlog",
    description: "Để dành, chưa urgent",
    tone: "bg-slate-100 text-slate-500 border-slate-200",
  },
];

export const STATUSES = [
  {
    value: "not_started",
    label: "Not Started",
    icon: "○",
    color: "#94a3b8",
    description: "Chưa đụng vào",
    tone: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    value: "in_progress",
    label: "In Progress",
    icon: "◑",
    color: "#3b82f6",
    description: "Đang làm",
    tone: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    value: "blocked",
    label: "Blocked",
    icon: "⊘",
    color: "#dc2626",
    description: "Bị chặn — chờ người khác / chờ tool / chờ info",
    tone: "bg-red-50 text-red-600 border-red-200",
  },
  {
    value: "in_review",
    label: "In Review",
    icon: "◎",
    color: "#9333ea",
    description: "Đã làm xong, đang chờ review / approval",
    tone: "bg-purple-50 text-purple-600 border-purple-200",
  },
  {
    value: "done",
    label: "Done",
    icon: "✓",
    color: "#16a34a",
    description: "Hoàn thành hoàn toàn",
    tone: "bg-green-50 text-green-700 border-green-200",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    icon: "✕",
    color: "#94a3b8",
    description: "Không làm nữa, có lý do",
    tone: "bg-slate-100 text-slate-400 border-slate-200",
  },
];

export const TYPES = [
  {
    value: "my_task",
    label: "Việc của tôi",
    tone: "bg-indigo-50 text-indigo-600 border-indigo-200",
  },
  {
    value: "delegated",
    label: "Đã giao",
    tone: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    value: "waiting_for",
    label: "Chờ người khác",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
];

export const SORT_OPTIONS = [
  { value: "created_at", label: "Ngày tạo" },
  { value: "priority", label: "Độ ưu tiên" },
  { value: "due_date", label: "Hạn chót" },
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
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function isOverdue(task) {
  if (!task.due_date || task.status === "done") return false;
  return new Date(task.due_date) < new Date();
}

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

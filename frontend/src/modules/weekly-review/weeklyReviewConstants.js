// Hằng số dùng chung cho module Weekly Review.

export const MOODS = [
  { value: 1, emoji: "😫", label: "Kiệt sức" },
  { value: 2, emoji: "😔", label: "Mệt mỏi" },
  { value: 3, emoji: "😐", label: "Bình thường" },
  { value: 4, emoji: "😊", label: "Tốt" },
  { value: 5, emoji: "🚀", label: "Tuyệt vời" },
];

export const WORKLOADS = [
  { value: "light", label: "Nhẹ nhàng", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "normal", label: "Bình thường", tone: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "heavy", label: "Nặng", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "overloaded", label: "Quá tải", tone: "bg-red-50 text-red-700 border-red-200" },
];

export const PRIORITIES = [
  { value: "critical", label: "Critical", tone: "bg-red-50 text-red-700 border-red-200" },
  { value: "important", label: "Important", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "normal", label: "Normal", tone: "bg-slate-50 text-slate-600 border-slate-200" },
];

export function moodMeta(value) {
  return MOODS.find((m) => m.value === value) || null;
}

export function workloadMeta(value) {
  return WORKLOADS.find((w) => w.value === value) || null;
}

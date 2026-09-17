// Hằng số dùng chung cho module Weekly Review.

export const MOODS = [
  { value: 1, emoji: "😫", label: "Exhausted" },
  { value: 2, emoji: "😔", label: "Tired" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🚀", label: "Great" },
];

export const WORKLOADS = [
  { value: "light", label: "Light", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "normal", label: "Normal", tone: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "heavy", label: "Heavy", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "overloaded", label: "Overloaded", tone: "bg-red-50 text-red-700 border-red-200" },
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

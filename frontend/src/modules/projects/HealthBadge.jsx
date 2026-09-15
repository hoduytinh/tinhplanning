import { healthMeta } from "./projectConstants";

// Badge sức khỏe project: 🟢 On Track / 🟡 At Risk / 🔴 Off Track / ⚪ No Data.
// size: "sm" | "md"
export default function HealthBadge({ health, size = "md", className = "" }) {
  const meta = healthMeta(health);
  const pad = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${meta.tone} ${pad} ${className}`}
    >
      <span aria-hidden="true">{meta.dot}</span>
      {meta.label}
    </span>
  );
}

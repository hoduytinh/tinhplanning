import Modal from "../../../shared/components/Modal";
import Badge from "../../../shared/components/Badge";
import { fmtShortDate } from "./timelineUtils";

const STATUS_TONE = {
  done: "bg-green-50 text-green-700 border-green-200",
  upcoming: "bg-indigo-50 text-indigo-700 border-indigo-200",
  at_risk: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_LABEL = {
  done: "Done",
  upcoming: "Upcoming",
  at_risk: "At risk",
};

// Popover chi tiết milestone: exit criteria + liên kết tới Signoff Checklist.
export default function MilestoneTooltip({ milestone, open, onClose, onGotoSignoff }) {
  if (!milestone) return null;
  const criteria = (milestone.exit_criteria || "")
    .split(/\r?\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} title={milestone.name}>
      <div className="space-y-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[milestone.status] || STATUS_TONE.upcoming}>
            {STATUS_LABEL[milestone.status] || milestone.status}
          </Badge>
          <span>{fmtShortDate(milestone.date)}</span>
          {milestone.is_marvell_standard && (
            <Badge tone="bg-slate-50 text-slate-600 border-slate-200">
              Marvell Standard
            </Badge>
          )}
        </div>

        {criteria.length > 0 && (
          <div>
            <div className="mb-1 font-semibold text-slate-700">Exit Criteria</div>
            <ul className="list-inside list-disc space-y-1">
              {criteria.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {milestone.is_marvell_standard && (
          <button
            type="button"
            onClick={() => onGotoSignoff?.(milestone)}
            className="text-sm font-medium text-brand hover:underline"
          >
            View in Signoff Checklist →
          </button>
        )}
      </div>
    </Modal>
  );
}

import RichField from "./RichField";
import MoodTracker from "./MoodTracker";
import ShoutoutList from "./ShoutoutList";

// Phần 2: Reflection — 2 cột.
// Trái: highlights / challenges / lessons (rich text).
// Phải: mood tracker + workload + team notes + shoutouts.
export default function ReflectionPanel({
  review,
  editable = true,
  onFieldChange,
  onFieldCommit,
  onMoodChange,
  onAddShoutout,
  onRemoveShoutout,
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <RichField
          label="✨ Điểm nổi bật"
          hint="Thành tựu, tiến độ tốt"
          value={review.highlights}
          editable={editable}
          placeholder="Tuần này đã làm được gì nổi bật?"
          onChange={(html) => onFieldChange?.("highlights", html)}
          onCommit={(html) => onFieldCommit?.("highlights", html)}
        />
        <RichField
          label="⚠️ Khó khăn"
          hint="Vướng mắc, blocker"
          value={review.challenges}
          editable={editable}
          placeholder="Gặp khó khăn / trở ngại gì?"
          onChange={(html) => onFieldChange?.("challenges", html)}
          onCommit={(html) => onFieldCommit?.("challenges", html)}
        />
        <RichField
          label="💡 Bài học"
          hint="Rút ra được gì"
          value={review.lessons}
          editable={editable}
          placeholder="Bài học kinh nghiệm rút ra..."
          onChange={(html) => onFieldChange?.("lessons", html)}
          onCommit={(html) => onFieldCommit?.("lessons", html)}
        />
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <MoodTracker
            mood={review.mood}
            workload={review.workload}
            editable={editable}
            onChange={onMoodChange}
          />
        </div>

        <RichField
          label="👥 Ghi chú về team"
          value={review.team_notes}
          editable={editable}
          placeholder="Ghi chú về tinh thần, tương tác của team..."
          onChange={(html) => onFieldChange?.("team_notes", html)}
          onCommit={(html) => onFieldCommit?.("team_notes", html)}
        />

        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <ShoutoutList
            items={review.shoutouts || []}
            editable={editable}
            onAdd={onAddShoutout}
            onRemove={onRemoveShoutout}
          />
        </div>
      </div>
    </div>
  );
}

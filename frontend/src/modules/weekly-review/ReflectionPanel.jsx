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
          label="✨ Highlights"
          hint="Achievements, good progress"
          value={review.highlights}
          editable={editable}
          placeholder="What stood out this week?"
          onChange={(html) => onFieldChange?.("highlights", html)}
          onCommit={(html) => onFieldCommit?.("highlights", html)}
        />
        <RichField
          label="⚠️ Challenges"
          hint="Obstacles, blockers"
          value={review.challenges}
          editable={editable}
          placeholder="What challenges or obstacles did you face?"
          onChange={(html) => onFieldChange?.("challenges", html)}
          onCommit={(html) => onFieldCommit?.("challenges", html)}
        />
        <RichField
          label="💡 Lessons Learned"
          hint="Key takeaways"
          value={review.lessons}
          editable={editable}
          placeholder="Lessons learned..."
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
          label="👥 Team Notes"
          value={review.team_notes}
          editable={editable}
          placeholder="Notes about team morale and interactions..."
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

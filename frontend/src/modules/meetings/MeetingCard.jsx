import { Clock, MapPin, Users, ListChecks, Repeat } from "lucide-react";
import Card from "../../shared/components/Card";
import Badge from "../../shared/components/Badge";
import { MEETING_STATUSES, metaFrom, fmtDate, fmtTime } from "./meetingConstants";

export default function MeetingCard({ meeting, onOpen }) {
  const status = metaFrom(MEETING_STATUSES, meeting.status, MEETING_STATUSES[0]);
  const recurring = meeting.recurring && meeting.recurring !== "none";

  return (
    <Card hover className="cursor-pointer p-4" onClick={() => onOpen(meeting)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {meeting.template_icon && <span className="text-lg">{meeting.template_icon}</span>}
          <h3 className="truncate font-semibold text-slate-900">{meeting.title}</h3>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Clock size={13} />
          {fmtDate(meeting.date)}
          {meeting.start_time && ` · ${fmtTime(meeting.start_time)}`}
          {meeting.end_time && `–${fmtTime(meeting.end_time)}`}
        </span>
        {recurring && (
          <span className="flex items-center gap-1">
            <Repeat size={13} /> {meeting.recurring}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users size={13} /> {meeting.attendee_count}
        </span>
        <span className="flex items-center gap-1">
          <ListChecks size={13} /> {meeting.open_action_count}/{meeting.action_count} mở
        </span>
      </div>

      {meeting.attendee_names?.length > 0 && (
        <p className="mt-2 truncate text-xs text-slate-400">
          {meeting.attendee_names.join(", ")}
        </p>
      )}
    </Card>
  );
}

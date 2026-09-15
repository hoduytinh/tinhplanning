import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CalendarDays, BookTemplate } from "lucide-react";
import Button from "../../shared/components/Button";
import Select from "../../shared/components/Select";
import ToastProvider, { useToast } from "../dashboard/Toast";
import MeetingCard from "./MeetingCard";
import MeetingForm from "./MeetingForm";
import { MEETING_STATUSES } from "./meetingConstants";
import { createMeeting, fetchMeetings } from "./meetingApi";
import { fetchTemplates } from "./templateApi";
import RoleGuard from "../../shared/RoleGuard";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupMeetings(meetings) {
  const today = startOfDay(new Date());
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const groups = { today: [], week: [], later: [], noDate: [], done: [] };
  for (const m of meetings) {
    if (m.status === "done" || m.status === "cancelled") {
      groups.done.push(m);
      continue;
    }
    if (!m.date) {
      groups.noDate.push(m);
      continue;
    }
    const d = startOfDay(m.date);
    if (d.getTime() === today.getTime()) groups.today.push(m);
    else if (d > today && d <= weekEnd) groups.week.push(m);
    else groups.later.push(m);
  }
  return groups;
}

const GROUP_LABELS = {
  today: "Hôm nay",
  week: "Tuần này",
  later: "Sắp tới",
  noDate: "Chưa có ngày",
  done: "Đã xong / hủy",
};

function MeetingPageInner() {
  const navigate = useNavigate();
  const toast = useToast();
  const [meetings, setMeetings] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", template_id: "" });
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchMeetings(filters);
      setMeetings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => {});
  }, []);

  const handleCreate = async (payload) => {
    try {
      const created = await createMeeting(payload);
      toast("Đã tạo cuộc họp.");
      navigate(`/meetings/${created.id}`);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const groups = groupMeetings(meetings);
  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cuộc họp</h1>
          <p className="text-sm text-slate-500">Quản lý các cuộc họp & action items.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate("/meeting-templates")}>
            <BookTemplate size={16} /> Templates
          </Button>
          <RoleGuard resource="meetings" action="create">
            <Button onClick={() => setFormOpen(true)}>
              <Plus size={16} /> Tạo cuộc họp
            </Button>
          </RoleGuard>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.status}
          onChange={setFilter("status")}
          options={MEETING_STATUSES}
          placeholder="Tất cả trạng thái"
          ariaLabel="Lọc trạng thái"
        />
        <Select
          value={String(filters.template_id)}
          onChange={setFilter("template_id")}
          options={templates.map((t) => ({ value: String(t.id), label: `${t.icon} ${t.name}` }))}
          placeholder="Tất cả template"
          ariaLabel="Lọc template"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : meetings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          <CalendarDays className="mx-auto mb-3 text-slate-300" size={40} />
          Chưa có cuộc họp nào. Bấm “Tạo cuộc họp” để bắt đầu.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(GROUP_LABELS).map(([key, label]) =>
            groups[key].length ? (
              <section key={key}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {label} ({groups[key].length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groups[key].map((m) => (
                    <MeetingCard
                      key={m.id}
                      meeting={m}
                      onOpen={(mm) => navigate(`/meetings/${mm.id}`)}
                    />
                  ))}
                </div>
              </section>
            ) : null
          )}
        </div>
      )}

      <MeetingForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        templates={templates}
      />
    </div>
  );
}

export default function MeetingPage() {
  return (
    <ToastProvider>
      <MeetingPageInner />
    </ToastProvider>
  );
}

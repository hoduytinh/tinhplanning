import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  fetchTimeline,
  createTrack,
  updateTrack,
  deleteTrack,
  createBar,
  updateBar,
  deleteBar,
} from "./timelineApi";
import {
  buildTimelineRows,
  chartWidthFor,
  computeDomain,
} from "./timelineUtils";
import TimelineHeader from "./TimelineHeader";
import TrackPanel from "./TrackPanel";
import ChartPanel from "./ChartPanel";
import AlertsBanner from "./AlertsBanner";
import BarSidePanel from "./BarSidePanel";
import BarCreateForm from "./BarCreateForm";
import TrackCreateForm from "./TrackCreateForm";
import MilestoneTooltip from "./MilestoneTooltip";

// Tab 3 (Project Detail) — Timeline: Gantt-style view kết hợp tracks, bars
// và Marvell standard milestones. Thay thế tab danh sách milestone đơn giản.
export default function TimelineTab({ projectId, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState("month");

  // Cửa sổ thời gian hiển thị (override thủ công). null = auto theo domain.
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);

  const [activeBar, setActiveBar] = useState(null);
  const [createBarTrack, setCreateBarTrack] = useState(null);
  const [trackFormOpen, setTrackFormOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [activeMilestone, setActiveMilestone] = useState(null);
  const [toast, setToast] = useState("");

  const trackPanelRef = useRef(null);
  const chartPanelRef = useRef(null);
  const syncingRef = useRef(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const fresh = await fetchTimeline(projectId);
      setData(fresh);
      // Đồng bộ lại activeBar (nếu đang mở) với dữ liệu mới.
      setActiveBar((prev) =>
        prev ? fresh.bars.find((b) => b.id === prev.id) || null : null
      );
    } catch (err) {
      setError(err.message || "Không thể tải timeline.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 2500);
  };

  // Domain tự động bao trùm toàn bộ dữ liệu.
  const domain = useMemo(() => {
    if (!data) return { start: null, end: null };
    return computeDomain(data.project, data.bars, data.milestones);
  }, [data]);

  const syncScroll = (source, target) => (e) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (target.current) target.current.scrollTop = e.target.scrollTop;
    syncingRef.current = false;
  };

  if (loading) return <p className="text-sm text-slate-500">Đang tải...</p>;

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertCircle size={16} />
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { project, today, tracks, bars, milestones } = data;
  const effStart = rangeStart || domain.start;
  const effEnd = rangeEnd || domain.end;
  const rows = buildTimelineRows(tracks, bars, milestones);
  const chartWidth = chartWidthFor(effStart, effEnd, zoom);

  const handleToggleCollapse = async (track) => {
    await updateTrack(projectId, track.id, { is_collapsed: !track.is_collapsed });
    load();
  };

  const handleTrackCreate = async (payload) => {
    await createTrack(projectId, payload);
    setTrackFormOpen(false);
    load();
  };

  const handleTrackUpdate = async (payload) => {
    await updateTrack(projectId, editingTrack.id, payload);
    setEditingTrack(null);
    load();
    showToast("Đã cập nhật track");
  };

  const handleBarSave = async (payload) => {
    await updateBar(projectId, activeBar.id, payload);
    setActiveBar(null);
    load();
  };

  const handleBarDelete = async (bar) => {
    if (!window.confirm(`Xóa bar "${bar.name}"?`)) return;
    await deleteBar(projectId, bar.id);
    setActiveBar(null);
    load();
  };

  const handleBarCreate = async (payload) => {
    await createBar(projectId, payload);
    setCreateBarTrack(null);
    load();
  };

  const handleTrackDelete = async (track) => {
    if (!window.confirm(`Xóa track "${track.name}" và các bar bên trong?`)) return;
    await deleteTrack(projectId, track.id);
    load();
  };

  return (
    <div className="relative space-y-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <AlertsBanner
        milestones={milestones}
        today={today}
        onSelect={(m) => setActiveMilestone(m)}
      />
      <TimelineHeader
        zoom={zoom}
        onZoomChange={setZoom}
        onAddTrack={() => setTrackFormOpen(true)}
        rangeStart={effStart}
        rangeEnd={effEnd}
        onRangeStartChange={setRangeStart}
        onRangeEndChange={setRangeEnd}
        onResetRange={() => {
          setRangeStart(null);
          setRangeEnd(null);
        }}
      />
      <div className="flex" style={{ maxHeight: 520 }}>
        <TrackPanel
          ref={trackPanelRef}
          rows={rows}
          onToggleCollapse={handleToggleCollapse}
          onEditTrack={(track) => setEditingTrack(track)}
          onDeleteTrack={handleTrackDelete}
          onScroll={syncScroll("track", chartPanelRef)}
        />
        <ChartPanel
          ref={chartPanelRef}
          rows={rows}
          projectStart={effStart}
          projectEnd={effEnd}
          chartWidth={chartWidth}
          today={today}
          onBarClick={(bar) => setActiveBar(bar)}
          onMilestoneClick={(m) => setActiveMilestone(m)}
          onBarMilestoneClick={(bar) => setActiveBar(bar)}
          onEmptyClick={(track) => setCreateBarTrack(track)}
          onScroll={syncScroll("chart", trackPanelRef)}
        />
      </div>

      <BarSidePanel
        bar={activeBar}
        tracks={tracks}
        projectId={projectId}
        open={!!activeBar}
        onClose={() => setActiveBar(null)}
        onSave={handleBarSave}
        onDelete={handleBarDelete}
        onBarMilestonesChanged={load}
      />
      <BarCreateForm
        track={createBarTrack}
        open={!!createBarTrack}
        onClose={() => setCreateBarTrack(null)}
        onCreate={handleBarCreate}
      />
      <TrackCreateForm
        open={trackFormOpen}
        tracks={tracks}
        onClose={() => setTrackFormOpen(false)}
        onCreate={handleTrackCreate}
      />
      <TrackCreateForm
        open={!!editingTrack}
        tracks={tracks}
        initial={editingTrack}
        onClose={() => setEditingTrack(null)}
        onCreate={handleTrackUpdate}
      />
      <MilestoneTooltip
        milestone={activeMilestone}
        projectId={projectId}
        open={!!activeMilestone}
        onClose={() => setActiveMilestone(null)}
        onSaved={(msg) => {
          load();
          if (msg) showToast(msg);
        }}
        onGotoSignoff={() => {
          setActiveMilestone(null);
          onNavigate?.("signoff");
        }}
      />

      {toast && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

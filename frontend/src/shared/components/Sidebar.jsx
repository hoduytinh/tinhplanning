import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  CalendarDays,
  BarChart3,
  Layers,
  BookTemplate,
  Settings,
  Users,
  LogOut,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "../../modules/auth/useAuth";
import { listPending } from "../../modules/users/usersApi";
import { roleMeta, initials } from "../../modules/users/roleMeta";
import { fetchAppVersion, fetchChangelog } from "../systemApi";
import Modal from "./Modal";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/meetings", label: "Meetings", icon: CalendarDays },
  { to: "/meeting-templates", label: "Meeting Templates", icon: BookTemplate },
  { to: "/weekly-review", label: "Weekly Review", icon: BarChart3 },
];

export default function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const { user, logout, isAdmin, canApprove } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const menuRef = useRef(null);

  const rm = roleMeta(user?.role);

  // Version badge — visible to everyone; the changelog behind it can only be
  // opened by the actual admin ACCOUNT (username "admin"), not just anyone
  // with the admin role.
  const isAdminAccount = user?.username === "admin";
  const [appVersion, setAppVersion] = useState(null);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [changelogContent, setChangelogContent] = useState("");
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [changelogError, setChangelogError] = useState("");

  useEffect(() => {
    let active = true;
    fetchAppVersion()
      .then((data) => active && setAppVersion(data.version))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleVersionClick = async () => {
    if (!isAdminAccount) return;
    setChangelogOpen(true);
    setChangelogLoading(true);
    setChangelogError("");
    try {
      const data = await fetchChangelog();
      setChangelogContent(data.content);
    } catch (err) {
      setChangelogError(err.message || "Could not load changelog.");
    } finally {
      setChangelogLoading(false);
    }
  };

  // Đếm số yêu cầu chờ duyệt (chỉ với người có quyền duyệt).
  useEffect(() => {
    let active = true;
    if (!canApprove) {
      setPendingCount(0);
      return;
    }
    listPending()
      .then((data) => active && setPendingCount(data.length))
      .catch(() => active && setPendingCount(0));
    return () => {
      active = false;
    };
  }, [canApprove]);

  // Đóng menu khi click ra ngoài.
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
    <aside
      className={`flex h-full flex-col bg-sidebar text-slate-300 transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div
        className={`flex h-16 items-center gap-2 border-b border-white/5 px-4 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
          <Layers size={18} />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-white">LeadBoard</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "border-brand bg-sidebarItem text-white"
                  : "border-transparent text-slate-400 hover:bg-sidebarItem hover:text-white"
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + dropdown */}
      <div className="relative border-t border-white/5 p-3" ref={menuRef}>
        {menuOpen && (
          <div
            className={`absolute bottom-full mb-2 overflow-hidden rounded-lg border border-white/10 bg-sidebarItem shadow-xl ${
              collapsed ? "left-3 w-48" : "left-3 right-3"
            }`}
          >
            <MenuItem
              icon={<Settings size={16} />}
              label="Account Settings"
              onClick={() => {
                setMenuOpen(false);
                navigate("/settings/profile");
              }}
            />
            {isAdmin && (
              <MenuItem
                icon={<Users size={16} />}
                label="Manage Users"
                badge={pendingCount > 0 ? pendingCount : undefined}
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/settings/users");
                }}
              />
            )}
            <MenuItem
              icon={<LogOut size={16} />}
              label="Log Out"
              danger
              onClick={handleLogout}
            />
          </div>
        )}

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-sidebarItem ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <div className="relative">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="avatar"
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20 text-sm font-semibold text-brand">
                {initials(user?.full_name || user?.username)}
              </div>
            )}
            {canApprove && pendingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.full_name || user?.username}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {rm.icon} {rm.label}
                </p>
              </div>
              <ChevronUp
                size={16}
                className={`shrink-0 text-slate-500 transition-transform ${
                  menuOpen ? "" : "rotate-180"
                }`}
              />
            </>
          )}
        </button>
      </div>

      {/* Version badge — visible to all; changelog only opens for the admin
          account (username "admin"), not just the admin role. */}
      {appVersion && (
        <div
          className={`border-t border-white/5 px-3 py-2 ${
            collapsed ? "flex justify-center" : ""
          }`}
        >
          <button
            type="button"
            onClick={handleVersionClick}
            title={
              isAdminAccount
                ? "View changelog"
                : `LeadBoard v${appVersion}`
            }
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-500 transition ${
              isAdminAccount
                ? "cursor-pointer hover:bg-sidebarItem hover:text-white"
                : "cursor-default"
            }`}
          >
            V{appVersion}
          </button>
        </div>
      )}
    </aside>

    <Modal
      open={changelogOpen}
      onClose={() => setChangelogOpen(false)}
      title={`Changelog — V${appVersion}`}
    >
      {changelogLoading && (
        <p className="text-sm text-slate-500">Loading...</p>
      )}
      {!changelogLoading && changelogError && (
        <p className="text-sm text-red-600">{changelogError}</p>
      )}
      {!changelogLoading && !changelogError && (
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-700">
          {changelogContent}
        </pre>
      )}
    </Modal>
    </>
  );
}

function MenuItem({ icon, label, onClick, danger, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition hover:bg-white/5 ${
        danger ? "text-red-400" : "text-slate-300"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

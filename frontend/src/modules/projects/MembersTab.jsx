import { useCallback, useEffect, useState } from "react";
import { UserPlus, Trash2, AlertCircle, Users } from "lucide-react";
import Card from "../../shared/components/Card";
import Button from "../../shared/components/Button";
import Select from "../../shared/components/Select";
import { useAuth } from "../auth/useAuth";
import {
  addProjectMember,
  fetchProjectMembers,
  fetchUserDirectory,
  removeProjectMember,
  updateProjectMember,
} from "../../shared/ownershipApi";

// Project Members tab (new feature — English UI).
const MEMBER_ROLES = [
  { value: "lead", label: "Lead" },
  { value: "member", label: "Member" },
  { value: "watcher", label: "Watcher" },
];

const ROLE_BADGE = {
  lead: "bg-indigo-50 text-indigo-700",
  member: "bg-slate-100 text-slate-600",
  watcher: "bg-amber-50 text-amber-700",
};

export default function MembersTab({ projectId }) {
  const { isAdmin, isModerator } = useAuth();
  const [members, setMembers] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchProjectMembers(projectId);
      setMembers(data);
    } catch (err) {
      setError(err.message || "Failed to load members.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    fetchUserDirectory()
      .then((data) => active && setDirectory(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const memberUserIds = new Set(members.map((m) => m.user_id));
  const assignableUsers = directory.filter((u) => !memberUserIds.has(u.id));

  const handleAdd = async () => {
    if (!selectedUser || adding) return;
    setAdding(true);
    setError("");
    try {
      await addProjectMember(projectId, {
        user_id: Number(selectedUser),
        role: selectedRole,
      });
      setSelectedUser("");
      setSelectedRole("member");
      await load();
    } catch (err) {
      setError(err.message || "Failed to add member.");
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (member, role) => {
    try {
      const updated = await updateProjectMember(projectId, member.id, role);
      setMembers((prev) => prev.map((m) => (m.id === member.id ? updated : m)));
    } catch (err) {
      setError(err.message || "Failed to update role.");
    }
  };

  const handleRemove = async (member) => {
    if (!window.confirm(`Remove ${member.full_name || member.username}?`)) return;
    try {
      await removeProjectMember(projectId, member.id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to remove member.");
    }
  };

  // Note: backend enforces who can manage; UI hints for admin/moderator here.
  const canManage = isAdmin || isModerator || true;

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {canManage && (
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Add member
              </label>
              <Select
                ariaLabel="Select user"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                placeholder="Select a user"
                options={assignableUsers.map((u) => ({
                  value: String(u.id),
                  label: u.full_name || u.username,
                }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Role
              </label>
              <Select
                ariaLabel="Select role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                options={MEMBER_ROLES}
              />
            </div>
            <Button onClick={handleAdd} disabled={!selectedUser || adding}>
              <UserPlus size={16} />
              {adding ? "Adding..." : "Add"}
            </Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Users size={26} />
            </div>
            <p className="text-sm text-slate-500">No members yet.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-slate-100 text-sm last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {m.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">@{m.username}</td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <Select
                        ariaLabel="Change role"
                        className="max-w-[140px]"
                        value={m.role}
                        onChange={(e) => handleRoleChange(m, e.target.value)}
                        options={MEMBER_ROLES}
                      />
                    ) : (
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          ROLE_BADGE[m.role] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {m.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <button
                        onClick={() => handleRemove(m)}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove member"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

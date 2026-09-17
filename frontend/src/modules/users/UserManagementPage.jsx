import { useCallback, useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Plus, ShieldCheck, KeyRound, UserX } from "lucide-react";
import Card from "../../shared/components/Card";
import Button from "../../shared/components/Button";
import Badge from "../../shared/components/Badge";
import Modal from "../../shared/components/Modal";
import Select from "../../shared/components/Select";
import Dropdown from "../../shared/components/Dropdown";
import ToastProvider, { useToast } from "../dashboard/Toast";
import { useAuth } from "../auth/useAuth";
import {
  roleMeta,
  statusMeta,
  initials,
  ROLE_OPTIONS,
} from "./roleMeta";
import * as usersApi from "./usersApi";

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "active", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function UserManagementInner() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [tab, setTab] = useState("all");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [resetResult, setResetResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = tab === "all" ? undefined : tab;
      const data = await usersApi.listUsers(status);
      setUsers(data);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    return users.reduce(
      (acc, u) => {
        acc.total += 1;
        return acc;
      },
      { total: users.length }
    );
  }, [users]);

  async function handleApprove(u) {
    try {
      await usersApi.approveUser(u.id);
      toast(`Approved ${u.username}`);
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function handleReject(reason) {
    try {
      await usersApi.rejectUser(rejectTarget.id, reason);
      toast(`Rejected ${rejectTarget.username}`);
      setRejectTarget(null);
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function handleReset(u) {
    try {
      const res = await usersApi.resetPassword(u.id);
      setResetResult({ username: u.username, password: res.new_password });
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function handleDeactivate(u) {
    if (u.id === me?.id) {
      toast("You cannot deactivate yourself", "error");
      return;
    }
    try {
      await usersApi.deactivateUser(u.id);
      toast(`Deactivated ${u.username}`);
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function handleToggleApproval(u) {
    try {
      await usersApi.setApprovalPermission(u.id, !u.can_approve);
      toast(
        u.can_approve
          ? `Revoked approval permission for ${u.username}`
          : `Granted approval permission to ${u.username}`
      );
      load();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500">
            {counts.total} accounts in the list
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Create user
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No users found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Approval Permission</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const rm = roleMeta(u.role);
                const sm = statusMeta(u.status);
                return (
                  <tr
                    key={u.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                          {initials(u.full_name || u.username)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">
                            {u.full_name || u.username}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            @{u.username}
                            {u.email ? ` · ${u.email}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={rm.tone}>
                        {rm.icon} {rm.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={sm.tone}>{sm.label}</Badge>
                      {u.status === "rejected" && u.reject_reason && (
                        <p className="mt-1 max-w-[200px] truncate text-xs text-slate-400">
                          {u.reject_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.role === "moderator" ? (
                        <button
                          onClick={() => handleToggleApproval(u)}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition ${
                            u.can_approve
                              ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                              : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          <ShieldCheck size={12} />
                          {u.can_approve ? "Yes" : "No"}
                        </button>
                      ) : u.role === "admin" ? (
                        <span className="text-xs text-slate-400">Default</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(u)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setRejectTarget(u)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        <Dropdown
                          trigger={<MoreHorizontal size={16} />}
                          items={[
                            {
                              label: "Edit role",
                              icon: <ShieldCheck size={14} />,
                              onClick: () => setEditUser(u),
                            },
                            {
                              label: "Reset password",
                              icon: <KeyRound size={14} />,
                              onClick: () => handleReset(u),
                            },
                            {
                              label: "Deactivate",
                              icon: <UserX size={14} />,
                              danger: true,
                              onClick: () => handleDeactivate(u),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}

      {editUser && (
        <EditRoleModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            setEditUser(null);
            load();
          }}
        />
      )}

      {rejectTarget && (
        <RejectModal
          user={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleReject}
        />
      )}

      {resetResult && (
        <ResetResultModal
          result={resetResult}
          onClose={() => setResetResult(null)}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [saving, setSaving] = useState(false);

  function set(field, v) {
    setForm((p) => ({ ...p, [field]: v }));
  }

  async function submit() {
    if (!form.username.trim() || !form.password) {
      toast("Enter username and password", "error");
      return;
    }
    setSaving(true);
    try {
      await usersApi.createUser({
        full_name: form.full_name.trim() || form.username.trim(),
        username: form.username.trim(),
        email: form.email.trim() || null,
        password: form.password,
        role: form.role,
      });
      toast("User created");
      onCreated();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Create new user"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Creating..." : "Create"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <LabeledInput
          label="Full name"
          value={form.full_name}
          onChange={(v) => set("full_name", v)}
        />
        <LabeledInput
          label="Username *"
          value={form.username}
          onChange={(v) => set("username", v)}
        />
        <LabeledInput
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => set("email", v)}
        />
        <LabeledInput
          label="Password *"
          type="password"
          value={form.password}
          onChange={(v) => set("password", v)}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Role
          </label>
          <Select
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            options={ROLE_OPTIONS}
            className="w-full"
          />
        </div>
      </div>
    </Modal>
  );
}

function EditRoleModal({ user, onClose, onSaved }) {
  const toast = useToast();
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await usersApi.updateUser(user.id, { role });
      toast("Role updated");
      onSaved();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit role · ${user.username}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Role
        </label>
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={ROLE_OPTIONS}
          className="w-full"
        />
      </div>
    </Modal>
  );
}

function RejectModal({ user, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title={`Reject · ${user.username}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => onConfirm(reason.trim() || null)}>
            Reject
          </Button>
        </>
      }
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Reason for rejection (optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          placeholder="Provide a clear reason so the user understands..."
        />
      </div>
    </Modal>
  );
}

function ResetResultModal({ result, onClose }) {
  const toast = useToast();
  return (
    <Modal
      open
      onClose={onClose}
      title={`New password · ${result.username}`}
      footer={
        <Button onClick={onClose}>Close</Button>
      }
    >
      <p className="mb-3 text-sm text-slate-600">
        A new password has been generated. Copy it and send it to the user —
        it will not be shown again.
      </p>
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <code className="font-mono text-sm text-slate-800">
          {result.password}
        </code>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            navigator.clipboard?.writeText(result.password);
            toast("Copied");
          }}
        >
          Copy
        </Button>
      </div>
    </Modal>
  );
}

function LabeledInput({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </div>
  );
}

export default function UserManagementPage() {
  return (
    <ToastProvider>
      <UserManagementInner />
    </ToastProvider>
  );
}

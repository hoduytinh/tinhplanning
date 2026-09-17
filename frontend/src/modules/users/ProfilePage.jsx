import { useState } from "react";
import Card from "../../shared/components/Card";
import Button from "../../shared/components/Button";
import Badge from "../../shared/components/Badge";
import ToastProvider, { useToast } from "../dashboard/Toast";
import { useAuth } from "../auth/useAuth";
import { updateProfile, changePassword } from "../auth/authApi";
import { roleMeta, initials } from "./roleMeta";

function ProfileInner() {
  const toast = useToast();
  const { user, setUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const rm = roleMeta(user?.role);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const updated = await updateProfile({
        full_name: fullName.trim(),
        email: email.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      setUser(updated);
      toast("Profile updated");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (newPw.length < 6) {
      toast("New password must be at least 6 characters", "error");
      return;
    }
    if (newPw !== confirmPw) {
      toast("Password confirmation does not match", "error");
      return;
    }
    setSavingPw(true);
    try {
      await changePassword(currentPw, newPw);
      toast("Password changed");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500">
          Manage your account information
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-6 flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-lg font-semibold text-brand">
              {initials(user?.full_name || user?.username)}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-slate-900">
              {user?.full_name || user?.username}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-slate-400">@{user?.username}</span>
              <Badge tone={rm.tone}>
                {rm.icon} {rm.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Labeled label="Full name">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Labeled>
          <Labeled label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Labeled>
          <Labeled label="Avatar (URL)">
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Labeled>
          <Labeled label="Username">
            <input
              value={user?.username || ""}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400"
            />
          </Labeled>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Change Password
        </h2>
        <div className="space-y-4">
          <Labeled label="Current password">
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Labeled>
          <Labeled label="New password">
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Labeled>
          <Labeled label="Confirm new password">
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Labeled>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={savePassword} disabled={savingPw}>
            {savingPw ? "Changing..." : "Change password"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Labeled({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ToastProvider>
      <ProfileInner />
    </ToastProvider>
  );
}

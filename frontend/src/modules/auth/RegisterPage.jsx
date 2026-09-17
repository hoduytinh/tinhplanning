import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Layers, Loader2 } from "lucide-react";
import { register as registerApi } from "./authApi";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    reason: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState("");

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await registerApi({
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        email: form.email.trim() || null,
        password: form.password,
        reason: form.reason.trim() || null,
      });
      setDone(res?.message || "Registration successful. Please wait for admin approval.");
    } catch (err) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <Layers size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
          <p className="text-sm text-slate-400">
            Your request will be sent to an admin for approval
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {done ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
                ✅
              </div>
              <p className="text-sm text-slate-600">{done}</p>
              <Link
                to="/login"
                className="inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field
                  label="Full name"
                  value={form.full_name}
                  onChange={(v) => update("full_name", v)}
                  placeholder="John Doe"
                  required
                />
                <Field
                  label="Username"
                  value={form.username}
                  onChange={(v) => update("username", v)}
                  placeholder="username"
                  required
                />
                <Field
                  label="Email (optional)"
                  type="email"
                  value={form.email}
                  onChange={(v) => update("email", v)}
                  placeholder="email@example.com"
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      minLength={6}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                      placeholder="At least 6 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Reason for registering (optional)
                  </label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => update("reason", e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    placeholder="I need access to..."
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? "Submitting..." : "Submit request"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-brand hover:underline">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

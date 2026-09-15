import { Link, useLocation } from "react-router-dom";
import { Layers } from "lucide-react";

export default function PendingPage() {
  const location = useLocation();
  const status = location.state?.status || "PENDING";
  const isRejected = status === "REJECTED";
  const isInactive = status === "INACTIVE";

  let icon = "⏳";
  let title = "Tài khoản đang chờ duyệt";
  let message =
    "Yêu cầu đăng ký của bạn đã được gửi. Vui lòng chờ admin phê duyệt trước khi đăng nhập.";

  if (isRejected) {
    icon = "❌";
    title = "Yêu cầu bị từ chối";
    message =
      "Rất tiếc, yêu cầu đăng ký của bạn đã bị từ chối. Vui lòng liên hệ admin để biết thêm chi tiết.";
  } else if (isInactive) {
    icon = "🔒";
    title = "Tài khoản bị khoá";
    message = "Tài khoản của bạn hiện đang bị khoá. Vui lòng liên hệ admin.";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <Layers size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white">LeadBoard</h1>
        </div>

        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-4xl">
            {icon}
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mb-6 text-sm text-slate-600">{message}</p>
          <Link
            to="/login"
            className="inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Về trang đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}

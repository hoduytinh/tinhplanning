import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

// Layout 2 cột: Sidebar cố định + vùng nội dung chính.
// Trên màn nhỏ, sidebar tự thu về dạng icon-only.
export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full">
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} />
      </div>

      {/* Sidebar icon-only trên mobile */}
      <div className="block md:hidden">
        <Sidebar collapsed />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar chỉ chứa nút thu gọn sidebar (desktop) */}
        <div className="flex h-12 items-center border-b border-slate-200 bg-white px-4">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 md:flex"
            aria-label="Thu gọn sidebar"
          >
            <Menu size={18} />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-8">{children}</main>
      </div>
    </div>
  );
}

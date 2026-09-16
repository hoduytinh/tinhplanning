import { useState } from "react";
import { Bot, Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import AIChatPanel from "../../modules/ai/AIChatPanel";

// Layout 3 cột: Sidebar cố định + vùng nội dung chính + AI Assistant panel (ẩn/hiện).
// Trên màn nhỏ, sidebar tự thu về dạng icon-only.
export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

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
        {/* Top bar: nút thu gọn sidebar (desktop) + toggle AI Assistant */}
        <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 md:flex"
            aria-label="Thu gọn sidebar"
          >
            <Menu size={18} />
          </button>

          <button
            onClick={() => setAiPanelOpen((o) => !o)}
            className={`ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              aiPanelOpen
                ? "bg-indigo-600 text-white"
                : "text-slate-500 hover:bg-slate-100"
            }`}
            aria-label="Bật/tắt AI Assistant"
          >
            <Bot size={16} /> AI
          </button>
        </div>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-8">{children}</main>
      </div>

      {aiPanelOpen && <AIChatPanel onClose={() => setAiPanelOpen(false)} />}
    </div>
  );
}

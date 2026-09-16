import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import ToastProvider, { useToast } from "../dashboard/Toast";
import ChatMessage from "./ChatMessage";
import ActionConfirm from "./ActionConfirm";
import { useAIChat } from "./useAIChat";

function AIChatPanelInner({ onClose }) {
  const { messages, isLoading, pendingAction, sendMessage, confirmAction, rejectAction } =
    useAIChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingAction]);

  const handleSend = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage(text);
  };

  const handleConfirm = () => {
    confirmAction((msg, type) => toast(msg, type === "error" ? "error" : "success"));
  };

  return (
    <div className="flex h-full w-[360px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
        <div className="flex items-center gap-2 font-medium text-slate-800">
          <Bot size={18} className="text-indigo-600" />
          AI Assistant
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Đóng AI Assistant"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-400">
            <Sparkles size={28} className="text-indigo-300" />
            <p>Hỏi mình về tasks, projects, coverage...</p>
            <p>hoặc nhờ tạo task mới!</p>
          </div>
        )}

        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}

        {pendingAction && (
          <ActionConfirm
            action={pendingAction}
            onConfirm={handleConfirm}
            onReject={rejectAction}
          />
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Bot size={16} className="animate-pulse text-indigo-400" />
            Đang suy nghĩ...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-200 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi..."
          disabled={isLoading}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          aria-label="Gửi"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

export default function AIChatPanel({ onClose }) {
  return (
    <ToastProvider>
      <AIChatPanelInner onClose={onClose} />
    </ToastProvider>
  );
}

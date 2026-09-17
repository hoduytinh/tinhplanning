import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Maximize2,
  Minimize2,
  Minus,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { useToast } from "../dashboard/Toast";
import ChatMessage from "./ChatMessage";
import ActionConfirm from "./ActionConfirm";
import { PANEL_SIZES } from "./useResizable";

const SUGGESTED_PROMPTS = [
  "How many overdue tasks do I have this week?",
  "Summarize project progress",
  "How many projects are currently active?",
];

// Nội dung panel AI Assistant — dùng chung cho cả chế độ nổi (floating) lẫn
// toàn màn hình. `chat`/`resize` được inject từ AIChatWidget (root, persistent)
// nên state không mất khi đóng/mở panel hoặc chuyển page.
export default function AIChatPanel({ chat, resize, onClose, isFullscreen }) {
  const {
    messages,
    isLoading,
    pendingAction,
    sendMessage,
    confirmAction,
    rejectAction,
    clearHistory,
  } = chat;
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
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      {/* Header — drag handle (xem useDraggable) */}
      <div
        data-drag-handle
        className="flex h-12 shrink-0 cursor-move items-center justify-between bg-indigo-600 px-3 text-white"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bot size={18} />
          LeadBoard AI
        </div>

        <div className="flex items-center gap-1">
          {!isFullscreen &&
            Object.entries(PANEL_SIZES).map(([key, val]) => (
              <button
                key={key}
                type="button"
                onClick={() => resize.setSize(key)}
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition ${
                  resize.sizeKey === key
                    ? "bg-white text-indigo-600"
                    : "text-indigo-200 hover:text-white"
                }`}
              >
                {val.label}
              </button>
            ))}

          <button
            type="button"
            onClick={resize.toggleFullscreen}
            className="flex h-7 w-7 items-center justify-center rounded-md text-indigo-200 hover:bg-indigo-500 hover:text-white"
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-indigo-200 hover:bg-indigo-500 hover:text-white"
            aria-label="Minimize AI Assistant"
            title="Minimize"
          >
            <Minus size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Sparkles size={28} className="text-indigo-300" />
            <div className="text-sm text-slate-500">
              <p className="font-medium text-slate-700">Hi! How can I help?</p>
              <p>Ask about tasks, projects, coverage...</p>
            </div>
            <div className="w-full space-y-1.5">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
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
            Thinking...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something... (Enter to send)"
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
          >
            <RotateCcw size={12} /> Clear conversation
          </button>
        )}
      </form>
    </div>
  );
}

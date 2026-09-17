import { useEffect, useState } from "react";
import { sendChatMessage, createTaskFromAI } from "./aiApi";

const STORAGE_KEY = "leadboard_ai_history";
const MAX_STORAGE_MESSAGES = 200; // localStorage lưu tối đa 200 messages (cuốn chiếu)
const CONTEXT_MESSAGES = 5; // chỉ gửi 5 messages gần nhất cho Gemini — tiết kiệm token

function loadHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Quản lý state cuộc hội thoại với AI: messages (persist qua localStorage để
// không mất history khi reload/chuyển page), loading, và pending action (task
// AI đề xuất tạo, cần người dùng xác nhận trước khi ghi vào DB).
export function useAIChat() {
  const [messages, setMessages] = useState(loadHistory);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Sync messages → localStorage mỗi khi thay đổi.
  useEffect(() => {
    const toStore =
      messages.length > MAX_STORAGE_MESSAGES
        ? messages.slice(messages.length - MAX_STORAGE_MESSAGES)
        : messages;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // localStorage đầy → xoá bớt 50 messages cũ nhất rồi thử lại.
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore.slice(50)));
      } catch {
        // vẫn lỗi thì bỏ qua, không làm crash UI.
      }
    }
  }, [messages]);

  const sendMessage = async (text) => {
    const userMsg = { role: "user", content: text, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Chỉ gửi CONTEXT_MESSAGES tin nhắn gần nhất (trước tin nhắn hiện tại)
      // cho Gemini — tiết kiệm token thay vì gửi toàn bộ history.
      const contextHistory = newMessages
        .slice(-CONTEXT_MESSAGES - 1, -1)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await sendChatMessage({ message: text, history: contextHistory });

      setMessages((prev) => [
        ...prev,
        { role: "model", content: response.text, timestamp: Date.now() },
      ]);

      if (response.action) {
        setPendingAction(response.action);
      }
    } catch (error) {
      // api.js interceptor đã chuẩn hoá lỗi thành Error(detail) thuần,
      // nên đọc error.message thay vì error.response.data.detail.
      const detail = error?.message;
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: detail
            ? `❌ ${detail}`
            : "❌ An error occurred. Please try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAction = async (onSuccess) => {
    if (!pendingAction) return;
    try {
      if (pendingAction.action === "create_task") {
        await createTaskFromAI(pendingAction.data);
        onSuccess?.(`Task created!`);
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            content: `✅ Task **"${pendingAction.data.title}"** created successfully!`,
            timestamp: Date.now(),
          },
        ]);
      }
    } catch {
      onSuccess?.("Unable to create task", "error");
    } finally {
      setPendingAction(null);
    }
  };

  const rejectAction = () => {
    setPendingAction(null);
    setMessages((prev) => [
      ...prev,
      { role: "model", content: "OK, dismissed. Anything else you need?", timestamp: Date.now() },
    ]);
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    setPendingAction(null);
  };

  return {
    messages,
    isLoading,
    pendingAction,
    sendMessage,
    confirmAction,
    rejectAction,
    clearHistory,
  };
}

import { useState } from "react";
import { sendChatMessage, createTaskFromAI } from "./aiApi";

// Quản lý state cuộc hội thoại với AI: messages, loading, pending action
// (task AI đề xuất tạo, cần người dùng xác nhận trước khi ghi vào DB).
export function useAIChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const sendMessage = async (text) => {
    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await sendChatMessage({ message: text, history: messages });

      setMessages((prev) => [...prev, { role: "model", content: response.text }]);

      if (response.action) {
        setPendingAction(response.action);
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: detail
            ? `❌ ${detail}`
            : "❌ Có lỗi xảy ra. Vui lòng thử lại.",
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
        onSuccess?.(`Task đã được tạo!`);
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            content: `✅ Đã tạo task **"${pendingAction.data.title}"** thành công!`,
          },
        ]);
      }
    } catch {
      onSuccess?.("Không thể tạo task", "error");
    } finally {
      setPendingAction(null);
    }
  };

  const rejectAction = () => {
    setPendingAction(null);
    setMessages((prev) => [
      ...prev,
      { role: "model", content: "OK, đã bỏ qua. Bạn cần gì khác không?" },
    ]);
  };

  return { messages, isLoading, pendingAction, sendMessage, confirmAction, rejectAction };
}

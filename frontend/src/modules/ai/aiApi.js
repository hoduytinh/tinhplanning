import api from "../../shared/api";

// AI Assistant API client — chat với Gemini (context lấy từ backend).
export async function sendChatMessage({ message, history }) {
  const { data } = await api.post("/api/ai/chat", { message, history });
  return data;
}

export async function createTaskFromAI(taskData) {
  const { data } = await api.post("/api/tasks", taskData);
  return data;
}

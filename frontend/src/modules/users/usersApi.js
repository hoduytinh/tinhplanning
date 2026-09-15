import api from "../../shared/api";

// API cho quản lý user (chỉ admin/moderator gọi được — backend tự kiểm tra quyền).

export async function listUsers(status) {
  const params = status ? { status } : {};
  const { data } = await api.get("/users", { params });
  return data;
}

export async function listPending() {
  const { data } = await api.get("/users/pending");
  return data;
}

export async function getUser(userId) {
  const { data } = await api.get(`/users/${userId}`);
  return data;
}

export async function createUser(payload) {
  const { data } = await api.post("/users", payload);
  return data;
}

export async function updateUser(userId, payload) {
  const { data } = await api.patch(`/users/${userId}`, payload);
  return data;
}

export async function deactivateUser(userId) {
  const { data } = await api.delete(`/users/${userId}`);
  return data;
}

export async function resetPassword(userId) {
  const { data } = await api.post(`/users/${userId}/reset-password`);
  return data;
}

export async function approveUser(userId) {
  const { data } = await api.post(`/users/${userId}/approve`);
  return data;
}

export async function rejectUser(userId, reason) {
  const { data } = await api.post(`/users/${userId}/reject`, { reason });
  return data;
}

export async function setApprovalPermission(userId, can_approve) {
  const { data } = await api.patch(`/users/${userId}/approval-permission`, {
    can_approve,
  });
  return data;
}

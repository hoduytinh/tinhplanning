import api from "../../shared/api";

// Các key lưu token trong localStorage (dùng chung với interceptor trong api.js).
export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens({ access_token, refresh_token }) {
  if (access_token) localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const AUTH_REQUEST_TIMEOUT = 30000;

async function requestWithRetry(requestFn, { retries = 0, delayMs = 800 } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      const transient = Boolean(error?.isTransient);
      if (!transient || attempt === retries) {
        throw error;
      }
      await sleep(delayMs * (attempt + 1));
    }
  }
  throw lastError;
}

// ---- API calls ----

export async function login(username, password) {
  const { data } = await requestWithRetry(
    () => api.post("/auth/login", { username, password }, { timeout: AUTH_REQUEST_TIMEOUT }),
    { retries: 2, delayMs: 1000 }
  );
  setTokens(data);
  return data;
}

export async function register(payload) {
  const { data } = await requestWithRetry(
    () => api.post("/auth/register", payload, { timeout: AUTH_REQUEST_TIMEOUT }),
    { retries: 2, delayMs: 1000 }
  );
  return data;
}

export async function logout() {
  const refresh_token = getRefreshToken();
  try {
    await api.post("/auth/logout", { refresh_token });
  } catch {
    // Bỏ qua lỗi mạng khi logout — vẫn xoá token phía client.
  }
  clearTokens();
}

export async function fetchMe() {
  const { data } = await requestWithRetry(
    () => api.get("/auth/me", { timeout: AUTH_REQUEST_TIMEOUT }),
    {
    retries: 3,
    delayMs: 800,
  }
  );
  return data;
}

export async function updateProfile(payload) {
  const { data } = await api.patch("/auth/me", payload);
  return data;
}

export async function changePassword(current_password, new_password) {
  const { data } = await api.patch("/auth/me/password", {
    current_password,
    new_password,
  });
  return data;
}

// Gọi refresh trực tiếp bằng axios thô để tránh vòng lặp interceptor.
export async function refreshAccessToken() {
  const refresh_token = getRefreshToken();
  if (!refresh_token) throw new Error("No refresh token");
  const { data } = await api.post(
    "/auth/refresh",
    { refresh_token },
    { _skipAuthRefresh: true }
  );
  if (data.access_token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
  }
  return data.access_token;
}

import axios from "axios";

// Base URL comes from the environment; falls back to local backend.
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// Đính kèm access token vào mọi request (nếu có).
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gọi refresh bằng axios thô để tránh vòng lặp interceptor.
async function tryRefresh() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(
      `${baseURL}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { "Content-Type": "application/json" } }
    );
    if (data?.access_token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      return data.access_token;
    }
  } catch {
    // fallthrough → đăng xuất
  }
  return null;
}

function forceLogout() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  // Chỉ chuyển hướng nếu không đang ở trang auth để tránh reload vô hạn.
  const path = window.location.pathname;
  if (!["/login", "/register", "/pending"].includes(path)) {
    window.location.href = "/login";
  }
}

// Xử lý 401: thử refresh 1 lần rồi retry; thất bại thì đăng xuất.
// Đồng thời chuẩn hoá lỗi thành Error(detail) để UI dùng.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;

    if (
      status === 401 &&
      !original._retry &&
      !original._skipAuthRefresh &&
      !String(original.url || "").includes("/auth/login") &&
      !String(original.url || "").includes("/auth/refresh")
    ) {
      original._retry = true;
      const newToken = await tryRefresh();
      if (newToken) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      forceLogout();
    }

    const detail =
      error.response?.data?.detail ||
      error.message ||
      "Unable to connect to the server.";
    return Promise.reject(new Error(detail));
  }
);

export default api;

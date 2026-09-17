import api from "./api";

// API client for app-level system info: version + changelog.
export async function fetchAppVersion() {
  const { data } = await api.get("/api/system/version");
  return data;
}

export async function fetchChangelog() {
  const { data } = await api.get("/api/system/changelog");
  return data;
}

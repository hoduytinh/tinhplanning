import api from "../../shared/api";

// Projects API client — chỉ gọi API, không xử lý business logic.

// --- Projects -------------------------------------------------------------
export async function fetchProjects(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v != null)
  );
  const { data } = await api.get("/api/projects", { params: clean });
  return data;
}

export async function fetchProject(id) {
  const { data } = await api.get(`/api/projects/${id}`);
  return data;
}

export async function createProject(payload) {
  const { data } = await api.post("/api/projects", payload);
  return data;
}

export async function updateProject(id, payload) {
  const { data } = await api.patch(`/api/projects/${id}`, payload);
  return data;
}

export async function deleteProject(id) {
  await api.delete(`/api/projects/${id}`);
}

export async function fetchProjectTasks(id) {
  const { data } = await api.get(`/api/projects/${id}/tasks`);
  return data;
}

export async function fetchProjectStats(id) {
  const { data } = await api.get(`/api/projects/${id}/stats`);
  return data;
}

export async function fetchProjectHealth(id) {
  const { data } = await api.get(`/api/projects/${id}/health`);
  return data;
}

// --- Milestones -----------------------------------------------------------
export async function fetchMilestones(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/milestones`);
  return data;
}

export async function createMilestone(projectId, payload) {
  const { data } = await api.post(
    `/api/projects/${projectId}/milestones`,
    payload
  );
  return data;
}

export async function updateMilestone(projectId, milestoneId, payload) {
  const { data } = await api.patch(
    `/api/projects/${projectId}/milestones/${milestoneId}`,
    payload
  );
  return data;
}

export async function deleteMilestone(projectId, milestoneId) {
  await api.delete(`/api/projects/${projectId}/milestones/${milestoneId}`);
}

export async function reorderMilestones(projectId, orderedIds) {
  const { data } = await api.put(
    `/api/projects/${projectId}/milestones/reorder`,
    { ordered_ids: orderedIds }
  );
  return data;
}

// Tạo 7 milestone chuẩn Marvell (POR → ... → Tapeout).
export async function populateStandardMilestones(projectId) {
  const { data } = await api.post(
    `/api/projects/${projectId}/milestones/standard`
  );
  return data;
}

// --- Risks ----------------------------------------------------------------
export async function fetchRisks(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/risks`);
  return data;
}

export async function createRisk(projectId, payload) {
  const { data } = await api.post(`/api/projects/${projectId}/risks`, payload);
  return data;
}

export async function updateRisk(projectId, riskId, payload) {
  const { data } = await api.patch(
    `/api/projects/${projectId}/risks/${riskId}`,
    payload
  );
  return data;
}

export async function deleteRisk(projectId, riskId) {
  await api.delete(`/api/projects/${projectId}/risks/${riskId}`);
}

// --- Activity + Comments --------------------------------------------------
export async function fetchProjectActivities(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/activities`);
  return data;
}

export async function fetchProjectComments(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/comments`);
  return data;
}

export async function createProjectComment(projectId, content) {
  const { data } = await api.post(`/api/projects/${projectId}/comments`, {
    content,
  });
  return data;
}

export async function deleteProjectComment(projectId, commentId) {
  await api.delete(`/api/projects/${projectId}/comments/${commentId}`);
}

// --- Coverage snapshots ---------------------------------------------------
export async function fetchCoverage(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/coverage`);
  return data;
}

export async function fetchLatestCoverage(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/coverage/latest`);
  return data;
}

export async function createCoverage(projectId, payload) {
  const { data } = await api.post(
    `/api/projects/${projectId}/coverage`,
    payload
  );
  return data;
}

export async function updateCoverage(projectId, snapId, payload) {
  const { data } = await api.patch(
    `/api/projects/${projectId}/coverage/${snapId}`,
    payload
  );
  return data;
}

export async function deleteCoverage(projectId, snapId) {
  await api.delete(`/api/projects/${projectId}/coverage/${snapId}`);
}

// --- Documents ------------------------------------------------------------
export async function fetchDocuments(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/documents`);
  return data;
}

export async function createDocument(projectId, payload) {
  const { data } = await api.post(
    `/api/projects/${projectId}/documents`,
    payload
  );
  return data;
}

export async function updateDocument(projectId, docId, payload) {
  const { data } = await api.patch(
    `/api/projects/${projectId}/documents/${docId}`,
    payload
  );
  return data;
}

export async function deleteDocument(projectId, docId) {
  await api.delete(`/api/projects/${projectId}/documents/${docId}`);
}

// --- Bugs -----------------------------------------------------------------
export async function fetchBugs(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/bugs`);
  return data;
}

export async function fetchBugStats(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/bugs/stats`);
  return data;
}

export async function createBug(projectId, payload) {
  const { data } = await api.post(`/api/projects/${projectId}/bugs`, payload);
  return data;
}

export async function updateBug(projectId, bugPk, payload) {
  const { data } = await api.patch(
    `/api/projects/${projectId}/bugs/${bugPk}`,
    payload
  );
  return data;
}

export async function deleteBug(projectId, bugPk) {
  await api.delete(`/api/projects/${projectId}/bugs/${bugPk}`);
}

// --- Signoff checklist ----------------------------------------------------
export async function fetchSignoff(projectId, milestone) {
  const params = milestone ? { milestone } : {};
  const { data } = await api.get(`/api/projects/${projectId}/signoff`, {
    params,
  });
  return data;
}

export async function fetchSignoffProgress(projectId, milestone) {
  const { data } = await api.get(
    `/api/projects/${projectId}/signoff/progress`,
    { params: { milestone } }
  );
  return data;
}

export async function initSignoff(projectId, milestone) {
  const { data } = await api.post(
    `/api/projects/${projectId}/signoff/init/${milestone}`
  );
  return data;
}

export async function createSignoff(projectId, payload) {
  const { data } = await api.post(
    `/api/projects/${projectId}/signoff`,
    payload
  );
  return data;
}

export async function updateSignoff(projectId, itemId, payload) {
  const { data } = await api.patch(
    `/api/projects/${projectId}/signoff/${itemId}`,
    payload
  );
  return data;
}

export async function deleteSignoff(projectId, itemId) {
  await api.delete(`/api/projects/${projectId}/signoff/${itemId}`);
}

// --- Sub-blocks (tree) ----------------------------------------------------
export async function fetchSubblocks(projectId) {
  const { data } = await api.get(`/api/projects/${projectId}/subblocks`);
  return data;
}

export async function createSubblock(projectId, payload) {
  const { data } = await api.post(
    `/api/projects/${projectId}/subblocks`,
    payload
  );
  return data;
}

export async function updateSubblock(projectId, sbId, payload) {
  const { data } = await api.patch(
    `/api/projects/${projectId}/subblocks/${sbId}`,
    payload
  );
  return data;
}

export async function moveSubblock(projectId, sbId, payload) {
  const { data } = await api.post(
    `/api/projects/${projectId}/subblocks/${sbId}/move`,
    payload
  );
  return data;
}

export async function deleteSubblock(projectId, sbId) {
  await api.delete(`/api/projects/${projectId}/subblocks/${sbId}`);
}

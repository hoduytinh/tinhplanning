import api from "../../shared/api";

// Meetings API client — chỉ gọi API, không xử lý business logic.

function clean(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v != null)
  );
}

// --- Meetings -------------------------------------------------------------
export async function fetchMeetings(params = {}) {
  const { data } = await api.get("/api/meetings", { params: clean(params) });
  return data;
}

export async function fetchMeeting(id) {
  const { data } = await api.get(`/api/meetings/${id}`);
  return data;
}

export async function createMeeting(payload) {
  const { data } = await api.post("/api/meetings", payload);
  return data;
}

export async function updateMeeting(id, payload) {
  const { data } = await api.patch(`/api/meetings/${id}`, payload);
  return data;
}

export async function deleteMeeting(id) {
  await api.delete(`/api/meetings/${id}`);
}

export async function closeMeeting(id) {
  const { data } = await api.post(`/api/meetings/${id}/close`);
  return data;
}

export async function duplicateMeeting(id) {
  const { data } = await api.post(`/api/meetings/${id}/duplicate`);
  return data;
}

export async function fetchMeetingSummary(id) {
  const { data } = await api.get(`/api/meetings/${id}/summary`);
  return data;
}

// --- Attendees ------------------------------------------------------------
export async function addAttendee(meetingId, payload) {
  const { data } = await api.post(`/api/meetings/${meetingId}/attendees`, payload);
  return data;
}

export async function removeAttendee(meetingId, attendeeId) {
  await api.delete(`/api/meetings/${meetingId}/attendees/${attendeeId}`);
}

// --- Agenda ---------------------------------------------------------------
export async function addAgendaItem(meetingId, payload) {
  const { data } = await api.post(`/api/meetings/${meetingId}/agenda`, payload);
  return data;
}

export async function updateAgendaItem(meetingId, itemId, payload) {
  const { data } = await api.patch(
    `/api/meetings/${meetingId}/agenda/${itemId}`,
    payload
  );
  return data;
}

export async function deleteAgendaItem(meetingId, itemId) {
  await api.delete(`/api/meetings/${meetingId}/agenda/${itemId}`);
}

// --- Sections -------------------------------------------------------------
export async function addSection(meetingId, payload) {
  const { data } = await api.post(`/api/meetings/${meetingId}/sections`, payload);
  return data;
}

export async function updateSection(meetingId, sectionId, payload) {
  const { data } = await api.patch(
    `/api/meetings/${meetingId}/sections/${sectionId}`,
    payload
  );
  return data;
}

export async function deleteSection(meetingId, sectionId) {
  await api.delete(`/api/meetings/${meetingId}/sections/${sectionId}`);
}

// --- Action items ---------------------------------------------------------
export async function addActionItem(meetingId, payload) {
  const { data } = await api.post(
    `/api/meetings/${meetingId}/action-items`,
    payload
  );
  return data;
}

export async function updateActionItem(meetingId, aiId, payload) {
  const { data } = await api.patch(
    `/api/meetings/${meetingId}/action-items/${aiId}`,
    payload
  );
  return data;
}

export async function deleteActionItem(meetingId, aiId) {
  await api.delete(`/api/meetings/${meetingId}/action-items/${aiId}`);
}

export async function createTaskFromAction(meetingId, aiId) {
  const { data } = await api.post(
    `/api/meetings/${meetingId}/action-items/${aiId}/create-task`
  );
  return data;
}

// --- Close checklist ------------------------------------------------------
export async function toggleChecklistItem(meetingId, itemId, isChecked) {
  const { data } = await api.patch(
    `/api/meetings/${meetingId}/checklist/${itemId}`,
    { is_checked: isChecked }
  );
  return data;
}

const BASE = '/api';

function getUserId(): string | null {
  return localStorage.getItem('userId');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const userId = getUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(userId ? { 'x-user-id': userId } : {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: import('../types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: import('../types').User }>('/auth/me'),

  // Provider
  getPatients: () => request<{ patients: import('../types').Patient[] }>('/provider/patients'),

  getPatient: (id: number) =>
    request<{
      patient: import('../types').Patient;
      interventions: import('../types').PatientIntervention[];
      recentSymptoms: import('../types').SymptomLog[];
      recentLogs: (import('../types').InterventionLog & { intervention_name: string; icon: string; color: string })[];
    }>(`/provider/patients/${id}`),

  getInterventionTypes: () =>
    request<{ types: import('../types').InterventionType[] }>('/provider/intervention-types'),

  assignIntervention: (data: {
    patient_id: number;
    intervention_type_id: number;
    goal_value: number;
    goal_frequency: string;
    provider_notes?: string;
  }) => request<{ intervention: import('../types').PatientIntervention }>('/provider/interventions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateIntervention: (id: number, data: Partial<{ goal_value: number; goal_frequency: string; provider_notes: string; active: boolean }>) =>
    request<{ ok: boolean }>(`/provider/interventions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getPatientInsights: (patientId: number, days = 30) =>
    request<{
      symptoms: import('../types').SymptomLog[];
      adherence: { log_date: string; name: string; color: string; icon: string; rate: number }[];
    }>(`/provider/patients/${patientId}/insights?days=${days}`),

  // Patient
  getDashboard: () => request<import('../types').DashboardData>('/patient/dashboard'),

  logIntervention: (data: { patient_intervention_id: number; completed: boolean; notes?: string }) =>
    request<{ ok: boolean }>('/patient/logs', { method: 'POST', body: JSON.stringify(data) }),

  logSymptoms: (data: {
    mood?: number; energy?: number; anxiety?: number; depression?: number;
    stress?: number; sleep_quality?: number; concentration?: number; notes?: string;
  }) => request<{ ok: boolean }>('/patient/symptoms', { method: 'POST', body: JSON.stringify(data) }),

  getInsights: (days = 30) =>
    request<{
      symptoms: import('../types').SymptomLog[];
      adherenceByDay: { log_date: string; name: string; color: string; icon: string; category: string; completed: number }[];
      weeklyAdherence: { week: string; name: string; color: string; adherence_pct: number }[];
    }>(`/patient/insights?days=${days}`),

  // Biography
  getBiographyLevels: () =>
    request<{ levels: import('../types').DetailLevelInfo[] }>('/biography/levels'),

  getBiographyQuestions: (level: string) =>
    request<{ plan: import('../types').BiographyTopicPlan[] }>(`/biography/questions?level=${level}`),

  createBiographySession: (data: { subject_name: string; detail_level: string }) =>
    request<{ session: import('../types').BiographySession }>('/biography/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getBiographySession: (id: number) =>
    request<{ session: import('../types').BiographySession; responses: import('../types').BiographyResponse[] }>(
      `/biography/sessions/${id}`
    ),

  listBiographySessions: () =>
    request<{ sessions: import('../types').BiographySession[] }>('/biography/sessions'),

  saveBiographyResponse: (sessionId: number, data: { topic: string; question: string; answer: string }) =>
    request<{ response: import('../types').BiographyResponse }>(
      `/biography/sessions/${sessionId}/responses`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  deleteBiographyResponse: (sessionId: number, responseId: number) =>
    request<{ ok: boolean }>(`/biography/sessions/${sessionId}/responses/${responseId}`, {
      method: 'DELETE',
    }),

  generateBiographyDraft: (sessionId: number) =>
    request<{ draft: string }>(`/biography/sessions/${sessionId}/generate`, {
      method: 'POST',
    }),

  deleteBiographySession: (sessionId: number) =>
    request<{ ok: boolean }>(`/biography/sessions/${sessionId}`, {
      method: 'DELETE',
    }),
};

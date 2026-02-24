export interface User {
  id: number;
  email: string;
  name: string;
  role: 'provider' | 'patient';
  provider_id: number | null;
  avatar_color: string;
  created_at: string;
}

export interface InterventionType {
  id: number;
  name: string;
  category: string;
  description: string;
  evidence_summary: string;
  evidence_grade: 'A' | 'B' | 'C';
  icon: string;
  unit: string;
  color: string;
}

export interface PatientIntervention {
  id: number;
  patient_id: number;
  intervention_type_id: number;
  goal_value: number;
  goal_frequency: 'daily' | 'weekly';
  provider_notes: string | null;
  start_date: string;
  active: number;
  assigned_by: number;
  created_at: string;
  // Joined from intervention_types
  name: string;
  category: string;
  description: string;
  evidence_summary: string;
  evidence_grade: 'A' | 'B' | 'C';
  icon: string;
  unit: string;
  color: string;
  // Computed
  logged_today?: number | null;
  completed_this_week?: number;
  logged_this_week?: number;
  total_completed?: number;
  total_logged?: number;
}

export interface SymptomLog {
  id: number;
  patient_id: number;
  log_date: string;
  mood: number | null;
  energy: number | null;
  anxiety: number | null;
  depression: number | null;
  stress: number | null;
  sleep_quality: number | null;
  concentration: number | null;
  notes: string | null;
}

export interface InterventionLog {
  id: number;
  patient_id: number;
  patient_intervention_id: number;
  log_date: string;
  completed: number;
  notes: string | null;
}

export interface Patient {
  id: number;
  name: string;
  email: string;
  avatar_color: string;
  created_at: string;
  active_interventions?: number;
  last_checkin?: string | null;
  logs_7d?: number;
  possible_7d?: number;
}

export interface DashboardData {
  interventions: PatientIntervention[];
  todaySymptoms: SymptomLog | null;
  provider: { id: number; name: string; email: string } | null;
  streak: number;
  date: string;
}

export const SYMPTOM_META: Record<string, { label: string; color: string; positive: boolean }> = {
  mood: { label: 'Mood', color: '#6366F1', positive: true },
  energy: { label: 'Energy', color: '#F97316', positive: true },
  anxiety: { label: 'Anxiety', color: '#EF4444', positive: false },
  depression: { label: 'Depression', color: '#8B5CF6', positive: false },
  stress: { label: 'Stress', color: '#F59E0B', positive: false },
  sleep_quality: { label: 'Sleep', color: '#14B8A6', positive: true },
  concentration: { label: 'Focus', color: '#22C55E', positive: true },
};

export const CATEGORY_COLORS: Record<string, string> = {
  exercise: '#3B82F6',
  sleep: '#8B5CF6',
  mindfulness: '#0D9488',
  social: '#F97316',
  medication: '#EC4899',
  nutrition: '#22C55E',
  behavioral: '#F59E0B',
  lifestyle: '#EAB308',
};

// Biography types
export type DetailLevel = 'ultra_brief' | 'brief' | 'moderate' | 'detailed' | 'comprehensive';

export interface DetailLevelInfo {
  id: DetailLevel;
  label: string;
  description: string;
  pageEstimate: string;
  maxDepth: number;
  questionCount: number;
}

export interface BiographySession {
  id: number;
  subject_name: string;
  detail_level: DetailLevel;
  status: 'in_progress' | 'draft_generated';
  draft: string | null;
  created_at: string;
  updated_at: string;
  response_count?: number;
}

export interface BiographyResponse {
  id: number;
  session_id: number;
  topic: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface BiographyTopicPlan {
  id: string;
  name: string;
  icon: string;
  description: string;
  questions: string[];
}

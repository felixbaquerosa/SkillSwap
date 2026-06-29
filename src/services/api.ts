import { API_BASE_URL } from '../config';

// Fail fast instead of hanging forever when the backend is unreachable.
const REQUEST_TIMEOUT_MS = 12000;

// ── Types matching the PHP API payloads ──

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  bio: string;
  location: string;
  avatar: string;
};

export type UserSkill = {
  id: number;
  skill_id: number;
  name: string;
  slug: string;
  category: string;
  type: 'offer' | 'want';
  level: string;
  description: string;
  is_active: boolean;
};

export type Candidate = {
  user_id: number;
  name: string;
  location: string;
  bio: string;
  score: number;
  mutual: boolean;
  they_offer: string[];
  they_want: string[];
  reason: string;
  rating_avg: number;
  rating_count: number;
};

export type MessageStatus = 'sent' | 'delivered' | 'read';

export type MatchSummary = {
  id: number;
  status: 'pending' | 'accepted' | 'declined';
  score: number;
  message: string;
  is_requester: boolean;
  partner_id: number;
  partner_name: string;
  created_at: string;
  partner_online?: boolean;
  last_message?: string;
  last_message_mine?: boolean;
  last_message_status?: MessageStatus | null;
  unread_count?: number;
  archived?: boolean;
};

export type ChatMessage = {
  id: number;
  match_id: number;
  sender_id: number;
  sender_name: string;
  body: string;
  mine: boolean;
  created_at: string;
  read_at?: string | null;
  status?: MessageStatus | null;
};

export type SwapSession = {
  id: number;
  match_id: number;
  skill_name: string;
  partner_name: string;
  scheduled_at: string;
  status: string;
  notes: string;
  reminder_label?: string;
};

export type SwapRating = {
  id: number;
  match_id: number;
  rater_id: number;
  rated_user_id: number;
  rating: number;
  comment: string;
  created_at: string;
};

export type DashboardPayload = {
  user: ApiUser | null;
  stats: {
    skills_offered: number;
    skills_wanted: number;
    pending_matches: number;
    active_swaps: number;
    upcoming_sessions: number;
  };
  suggestions: Candidate[];
  recent_matches: MatchSummary[];
};

// ── Token handling ──

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Build a full URL for a stored avatar path from the API. */
export function avatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
  return `${API_BASE_URL}/${avatar.replace(/^\//, '')}`;
}

// ── Core request helper ──

type Options = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export async function api<T = any>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('The server took too long to respond. Make sure XAMPP/Apache is running and your phone is on the same Wi-Fi.');
    }
    throw new Error('Cannot reach the server. Check that XAMPP is running and the API address is correct.');
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data && (data.error || data.message)) || 'Request failed. Please try again.';
    throw new Error(message);
  }
  return data as T;
}

// ── Auth endpoints ──

export const apiLogin = (email: string, password: string) =>
  api<{ token: string; user: ApiUser }>('/api/auth/login', { method: 'POST', body: { email, password } });

export const apiRegister = (
  name: string,
  email: string,
  password: string,
  birthdate: string,
  location?: string
) =>
  api<{ token: string; user: ApiUser }>('/api/auth/register', {
    method: 'POST',
    body: { name, email, password, birthdate, location },
  });

export const apiMe = () => api<{ user: ApiUser }>('/api/auth/me');
export const apiLogout = () => api<{ success: boolean }>('/api/auth/logout', { method: 'POST' });

export async function uploadAvatar(imageUri: string): Promise<ApiUser> {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() ?? 'avatar.jpg';
  const ext = filename.split('.').pop()?.toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  formData.append('avatar', { uri: imageUri, name: filename, type } as unknown as Blob);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/api/profile/avatar`, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (data && (data.error || data.message)) || 'Could not upload photo.';
      throw new Error(message);
    }
    return (data as { user: ApiUser }).user;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Upload timed out. Check your connection and try again.');
    }
    throw e instanceof Error ? e : new Error('Could not upload photo.');
  } finally {
    clearTimeout(timeout);
  }
}

// ── Skills ──

export const getCatalog = () => api<{ skills: { id: number; name: string; slug: string; category: string }[] }>('/api/skills');
export const getMySkills = () => api<{ offers: UserSkill[]; wants: UserSkill[] }>('/api/my-skills');
export const addSkill = (payload: { name: string; type: 'offer' | 'want'; level?: string; category?: string; description?: string }) =>
  api<{ success: boolean }>('/api/my-skills', { method: 'POST', body: payload });
export const updateSkill = (id: number, payload: { level: string; description?: string }) =>
  api<{ success: boolean }>(`/api/my-skills/${id}/update`, { method: 'POST', body: payload });
export const disableSkill = (id: number) =>
  api<{ success: boolean; is_active: boolean }>(`/api/my-skills/${id}/disable`, { method: 'POST', body: {} });
export const enableSkill = (id: number) =>
  api<{ success: boolean; is_active: boolean }>(`/api/my-skills/${id}/enable`, { method: 'POST', body: {} });
/** @deprecated Use disableSkill — skills are disabled, not deleted. */
export const deleteSkill = disableSkill;

// ── Dashboard ──

export const getDashboard = () => api<DashboardPayload>('/api/dashboard');

// ── Discover & matches ──

export const getDiscover = () =>
  api<{
    ai: string;
    can_swap: boolean;
    skills_offered: number;
    skills_wanted: number;
    matches: Candidate[];
  }>('/api/discover');
export const getMatches = (archived = false) =>
  api<{ matches: MatchSummary[] }>(`/api/matches${archived ? '?archived=1' : ''}`);
export const createMatch = (partnerId: number, score: number, message?: string) =>
  api<{ match: MatchSummary | null }>('/api/matches', { method: 'POST', body: { partner_id: partnerId, score, message } });
export const respondMatch = (matchId: number, action: 'accept' | 'decline') =>
  api<{ success: boolean; status: string }>(`/api/matches/${matchId}/respond`, { method: 'POST', body: { action } });
export const archiveMatch = (matchId: number) =>
  api<{ success: boolean }>(`/api/matches/${matchId}/archive`, { method: 'POST', body: {} });
export const unarchiveMatch = (matchId: number) =>
  api<{ success: boolean }>(`/api/matches/${matchId}/unarchive`, { method: 'POST', body: {} });
export const deleteMatch = (matchId: number) =>
  api<{ success: boolean }>(`/api/matches/${matchId}/delete`, { method: 'POST', body: {} });

// ── Messages ──

export const getMessages = (matchId: number) =>
  api<{ messages: ChatMessage[]; partner_online: boolean }>(`/api/matches/${matchId}/messages`);
export const sendMessage = (matchId: number, body: string) =>
  api<{ id: number; success: boolean; message: ChatMessage | null }>(`/api/matches/${matchId}/messages`, {
    method: 'POST',
    body: { body },
  });

// ── Sessions ──

export const getSessions = () => api<{ sessions: SwapSession[] }>('/api/sessions');
export const getSessionReminders = () => api<{ reminders: SwapSession[] }>('/api/sessions/reminders');
export const createSession = (payload: { match_id: number; scheduled_at: string; skill_id?: number; notes?: string }) =>
  api<{ id: number; success: boolean }>('/api/sessions', { method: 'POST', body: payload });

export const getMatchRating = (matchId: number) =>
  api<{ my_rating: SwapRating | null; partner_rating_avg: number; partner_rating_count: number }>(
    `/api/matches/${matchId}/rating`
  );
export const submitRating = (matchId: number, rating: number, comment?: string) =>
  api<{ success: boolean; rating: SwapRating | null }>(`/api/matches/${matchId}/rating`, {
    method: 'POST',
    body: { rating, comment },
  });

// ── AI ──

export const getAiSuggestions = () =>
  api<{ ai: string; suggestions: Candidate[] }>('/api/ai/match-suggestions', { method: 'POST', body: {} });
export const askAssistant = (message: string) =>
  api<{ reply: string; ai: string }>('/api/ai/assistant', { method: 'POST', body: { message } });

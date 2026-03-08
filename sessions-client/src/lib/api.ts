import type {
  User,
  SessionDetail,
  SyncResult,
  CreatePlaylistResult,
  SavedSession,
  PaginatedSessions,
} from "../types";

// All API calls are relative (no host). Vite's proxy (vite.config.ts)
// forwards /api/* → backend (strips /api prefix before forwarding).
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: "include", // include the HTTP-only session cookie
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// --- Auth ---
export const getMe = () => apiFetch<User>("/auth/me");
export const logout = () =>
  apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" });
// /api/auth/login → proxy strips /api → backend /auth/login → Spotify redirect
export const loginUrl = "/api/auth/login";

// --- History ---
export const syncHistory = () => apiFetch<SyncResult>("/history/sync");
export const getSessions = (page = 1, limit = 20) =>
  apiFetch<PaginatedSessions>(`/history/sessions?page=${page}&limit=${limit}`);
export const getSessionDetail = (id: string) =>
  apiFetch<SessionDetail>(`/history/sessions/${id}`);

// --- Playlists ---
export const createPlaylist = (data: {
  name: string;
  description?: string;
  trackUris: string[];
  isPublic: boolean;
  sessionStartTime: string;
  sessionEndTime: string;
}) =>
  apiFetch<CreatePlaylistResult>("/playlists", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getSavedSessions = () =>
  apiFetch<SavedSession[]>("/playlists/saved");

export const renameSession = (id: string, name: string) =>
  apiFetch<{ id: string; name: string }>(`/playlists/saved/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });

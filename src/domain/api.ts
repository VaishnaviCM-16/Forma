export interface BoardInfo { id: string; title: string; persistence: 'session-only' }
export interface HealthInfo { ok: boolean; persistence: string; collaboration: string; activeRooms: number }

const backendUrl = (import.meta.env?.VITE_BACKEND_URL ?? '').replace(/\/+$/, '');

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backendUrl}${url}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

export const api = {
  createBoard: (title = 'Untitled board') => request<BoardInfo>('/api/boards', { method: 'POST', body: JSON.stringify({ title }) }),
  getBoard: (id: string) => request<BoardInfo>(`/api/boards/${encodeURIComponent(id)}`),
  renameBoard: (id: string, title: string) => request<BoardInfo>(`/api/boards/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  health: () => request<HealthInfo>('/api/health'),
};

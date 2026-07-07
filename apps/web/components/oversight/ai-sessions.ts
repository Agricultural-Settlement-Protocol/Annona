/**
 * Session persistence + shared types for the multi-session AI assistant.
 *
 * Storage key pattern: annona.ai.sessions.<role>
 * Cap: last 50 messages per session to avoid localStorage quota issues.
 */

export type ChatRole = "agrinas" | "pemerintah";

export interface AttachmentMeta {
  kind: "table" | "image";
  name: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Only name+kind stored; content stays in-memory only. */
  attachmentsMeta?: AttachmentMeta[];
}

export interface Session {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  messages: ChatMessage[];
}

/** In-memory attachment (not persisted; content cleared after send). */
export interface PendingAttachment {
  id: string;
  kind: "table" | "image";
  name: string;
  csv?: string;
  dataUrl?: string;
}

const MAX_MESSAGES_PER_SESSION = 50;

export function sessionStorageKey(role: ChatRole): string {
  return `annona.ai.sessions.${role}`;
}

export function panelCollapsedKey(role: ChatRole): string {
  return `annona.ai.panel.${role}.collapsed`;
}

export function loadSessions(role: ChatRole): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(sessionStorageKey(role));
    if (!raw) return [];
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
}

export function saveSessions(role: ChatRole, sessions: Session[]): void {
  if (typeof window === "undefined") return;
  try {
    const capped = sessions.map((s) => ({
      ...s,
      messages: s.messages.slice(-MAX_MESSAGES_PER_SESSION),
    }));
    localStorage.setItem(sessionStorageKey(role), JSON.stringify(capped));
  } catch {
    // localStorage quota exceeded; silently ignore
  }
}

export function createSession(): Session {
  const now = new Date().toISOString();
  return {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: "Percakapan baru",
    pinned: false,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function truncateTitle(text: string, max = 40): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 3)}...`;
}

export function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} hari lalu`;
  return `${Math.floor(days / 30)} bln lalu`;
}

export function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

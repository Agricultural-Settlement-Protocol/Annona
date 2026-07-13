"use client";

/**
 * Multi-session AI chat for the Oversight dashboard (Supplier + Pemerintah).
 *
 * Layout: [SessionPanel (left, collapsible)] [ChatArea (right)]
 *
 * Features:
 *   - Sessions per role stored in localStorage (annona.ai.sessions.<role>).
 *   - File import: .xlsx/.xls/.csv parsed client-side with xlsx; images via canvas.
 *   - Attachments shown as chips above composer; sent with next message.
 *   - Demo prompt chips shown only on empty thread.
 *   - Markdown renderer: bold, lists, tables (no external dep).
 *   - POST /api/oversight-ai {role, messages, groundingSnapshot, attachments?}.
 *
 * Rules followed:
 *   - No em dashes in any string.
 *   - viewRole prop (not "role") per house convention.
 *   - Backdrop overlays are <button>.
 *   - Fragment keys on .map() with multiple siblings.
 *   - useState<string> for string state.
 *   - ScrollArea (branded scrollbar) for message list.
 */

import { ScrollArea } from "@/components/scroll-area";
import { cn } from "@annona/ui";
import {
  Bot,
  FileSpreadsheet,
  Image as ImageIcon,
  Paperclip,
  PanelLeftOpen,
  Send,
  User,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { MarkdownContent } from "./ai-markdown";
import { AiSessionPanel } from "./ai-session-panel";
import {
  type ChatMessage,
  type ChatRole,
  type PendingAttachment,
  type Session,
  createSession,
  loadSessions,
  panelCollapsedKey,
  saveSessions,
  sortSessions,
  truncateTitle,
} from "./ai-sessions";

export type { ChatRole };

export interface GroundingSnapshot {
  [key: string]: unknown;
}

// ---- Demo prompts per role --------------------------------------------------

const DEMO_PROMPTS: Record<ChatRole, string[]> = {
  supplier: [
    "KMP mana yang paling banyak residu pokok belum disetor?",
    "Berapa total residu Supplier yang belum diverifikasi?",
    "Berapa antrean dispatch yang masih menunggu?",
    "KMP mana yang sedang dibekukan reputasinya?",
  ],
  pemerintah: [
    "KMP mana paling banyak utang belum terbayar?",
    "Siapa yang panen minggu depan?",
    "Kenapa KMP Sukamaju settlement rate rendah?",
    "Berapa total produksi gabah seluruh koperasi?",
  ],
};

// ---- File parsing utilities (client-side only) -----------------------------

/** Parse a spreadsheet file to CSV text, truncated to ~8000 chars. */
async function parseSpreadsheet(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  const sheetNames = wb.SheetNames.slice(0, 3);
  let result = "";
  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const csv = XLSX.utils.sheet_to_csv(ws);
    result += `\n## Sheet: ${name}\n${csv}\n`;
  }
  if (result.length > 8_000) {
    result = `${result.slice(0, 8_000)}\n... (dipotong, data terlalu panjang untuk dilampirkan sepenuhnya)`;
  }
  return result.trim();
}

/** Convert a File to a base64 data URL, downscaling via canvas if > 4 MB. */
async function fileToDataUrl(file: File): Promise<string> {
  const MAX_BYTES = 4 * 1024 * 1024;
  if (file.size <= MAX_BYTES) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) ?? "");
      reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
      reader.readAsDataURL(file);
    });
  }
  // Downscale via canvas
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_DIM = 1024;
      const scale =
        MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight, 1);
      const w =
        scale < 1 ? Math.round(img.naturalWidth * scale) : img.naturalWidth;
      const h =
        scale < 1 ? Math.round(img.naturalHeight * scale) : img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas tidak tersedia."));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gagal memuat gambar untuk dikompres."));
    };
    img.src = objectUrl;
  });
}

const ACCEPTED_EXTENSIONS = new Set([
  "xlsx", "xls", "csv", "png", "jpg", "jpeg", "webp",
]);

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isSpreadsheet(ext: string) {
  return ["xlsx", "xls", "csv"].includes(ext);
}

function isImage(ext: string) {
  return ["png", "jpg", "jpeg", "webp"].includes(ext);
}

// ---- Sub-components --------------------------------------------------------

function AttachmentChip({
  att,
  onRemove,
}: {
  att: PendingAttachment;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
      {att.kind === "image" ? (
        <ImageIcon size={12} className="shrink-0 text-aqua-600" />
      ) : (
        <FileSpreadsheet size={12} className="shrink-0 text-verdant-600" />
      )}
      <span className="max-w-[12rem] truncate">{att.name}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Hapus lampiran ${att.name}`}
        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <X size={10} />
      </button>
    </div>
  );
}

function MessageBubble({
  message,
  isSupplier,
}: {
  message: ChatMessage;
  isSupplier: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex items-start gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isUser
            ? isSupplier
              ? "bg-aqua-100 text-aqua-700"
              : "bg-verdant-100 text-verdant-700"
            : "bg-surface-muted text-muted-foreground",
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? isSupplier
              ? "rounded-tr-sm bg-aqua-600 text-white"
              : "rounded-tr-sm bg-verdant-600 text-white"
            : "rounded-tl-sm border border-border bg-surface text-foreground",
        )}
      >
        {isUser ? (
          <>
            {message.attachmentsMeta && message.attachmentsMeta.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1">
                {message.attachmentsMeta.map((a) => (
                  <span
                    key={`${a.kind}-${a.name}`}
                    className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px]"
                  >
                    {a.kind === "image" ? (
                      <ImageIcon size={9} />
                    ) : (
                      <FileSpreadsheet size={9} />
                    )}
                    {a.name}
                  </span>
                ))}
              </div>
            )}
            <span>{message.content}</span>
          </>
        ) : (
          <MarkdownContent content={message.content} />
        )}
      </div>
    </div>
  );
}

// ---- Main component --------------------------------------------------------

export function AiChat({
  viewRole: role,
  groundingSnapshot,
}: {
  viewRole: ChatRole;
  groundingSnapshot: GroundingSnapshot;
}) {
  const isSupplier = role === "supplier";

  // Sessions state (initialised from localStorage)
  const [sessions, setSessions] = useState<Session[]>(() =>
    loadSessions(role),
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const all = loadSessions(role);
    return sortSessions(all)[0]?.id ?? null;
  });

  // Panel collapse state (persisted per role)
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(panelCollapsedKey(role));
    if (stored !== null) return stored === "true";
    return window.innerWidth < 768;
  });

  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Derived: active session and its messages
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ?? null;
  const currentMessages: ChatMessage[] = activeSession?.messages ?? [];

  // Scroll to bottom on new messages or loading change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional re-scroll trigger
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length, loading]);

  // Persist panel collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(panelCollapsedKey(role), String(panelCollapsed));
    } catch {
      // ignore
    }
  }, [panelCollapsed, role]);

  // ---- Session management --------------------------------------------------

  function updateSessions(next: Session[]) {
    setSessions(next);
    saveSessions(role, next);
  }

  function handleNewSession() {
    const s = createSession();
    const next = [s, ...sessions];
    updateSessions(next);
    setActiveSessionId(s.id);
    setError(null);
    setPendingAttachments([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleSelectSession(id: string) {
    setActiveSessionId(id);
    setError(null);
    setPendingAttachments([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleRenameSession(id: string, title: string) {
    updateSessions(
      sessions.map((s) => (s.id === id ? { ...s, title } : s)),
    );
  }

  function handleDeleteSession(id: string) {
    const next = sessions.filter((s) => s.id !== id);
    updateSessions(next);
    if (activeSessionId === id) {
      setActiveSessionId(sortSessions(next)[0]?.id ?? null);
    }
  }

  function handlePinSession(id: string) {
    updateSessions(
      sessions.map((s) =>
        s.id === id ? { ...s, pinned: !s.pinned } : s,
      ),
    );
  }

  // Ensure an active session exists (creates one lazily if needed)
  function ensureActiveSession(): Session {
    if (activeSession) return activeSession;
    const s = createSession();
    const next = [s, ...sessions];
    updateSessions(next);
    setActiveSessionId(s.id);
    return s;
  }

  // ---- File handling -------------------------------------------------------

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setFileError(null);
      const arr = Array.from(files);
      const toProcess = arr.filter((f) =>
        ACCEPTED_EXTENSIONS.has(extOf(f.name)),
      );
      if (toProcess.length === 0) {
        setFileError(
          "Format tidak didukung. Gunakan .xlsx, .xls, .csv, .png, .jpg, .jpeg, atau .webp.",
        );
        return;
      }
      const newAtts: PendingAttachment[] = [];
      for (const f of toProcess) {
        const ext = extOf(f.name);
        try {
          if (isSpreadsheet(ext)) {
            const csv = await parseSpreadsheet(f);
            newAtts.push({
              id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              kind: "table",
              name: f.name,
              csv,
            });
          } else if (isImage(ext)) {
            const dataUrl = await fileToDataUrl(f);
            newAtts.push({
              id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              kind: "image",
              name: f.name,
              dataUrl,
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Gagal membaca file.";
          setFileError(`Gagal memproses ${f.name}: ${msg}`);
        }
      }
      if (newAtts.length > 0) {
        setPendingAttachments((prev) => [...prev, ...newAtts]);
      }
    },
    [],
  );

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset the input so the same file can be re-selected
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDragOver(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) processFiles(files);
  }

  // ---- Send message --------------------------------------------------------

  async function sendMessage(content: string, atts?: PendingAttachment[]) {
    const text = content.trim();
    if (!text || loading) return;

    const session = ensureActiveSession();
    const attachments = atts ?? pendingAttachments;
    setPendingAttachments([]);
    setInput("");

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      attachmentsMeta:
        attachments.length > 0
          ? attachments.map((a) => ({ kind: a.kind, name: a.name }))
          : undefined,
    };

    // Auto-title the session from the first user message
    const isFirstMessage = session.messages.length === 0;

    const updatedSession: Session = {
      ...session,
      title: isFirstMessage ? truncateTitle(text) : session.title,
      updatedAt: new Date().toISOString(),
      messages: [...session.messages, userMsg],
    };

    const nextSessions = sessions.map((s) =>
      s.id === updatedSession.id ? updatedSession : s,
    );
    // If session was just created (ensureActiveSession), it might not be in sessions yet
    const alreadyIn = nextSessions.find((s) => s.id === updatedSession.id);
    const finalSessions = alreadyIn
      ? nextSessions
      : [updatedSession, ...sessions];

    setSessions(finalSessions);
    saveSessions(role, finalSessions);

    setLoading(true);
    setError(null);

    const history = updatedSession.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const apiAttachments =
      attachments.length > 0
        ? attachments.map((a) =>
            a.kind === "table"
              ? { kind: "table" as const, name: a.name, csv: a.csv ?? "" }
              : { kind: "image" as const, name: a.name, dataUrl: a.dataUrl ?? "" },
          )
        : undefined;

    try {
      const res = await fetch("/api/oversight-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          messages: history,
          groundingSnapshot,
          ...(apiAttachments ? { attachments: apiAttachments } : {}),
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };

      if (data.error) {
        setError(data.error);
      } else {
        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply ?? "Tidak ada respons dari AI.",
        };
        const withReply: Session = {
          ...updatedSession,
          updatedAt: new Date().toISOString(),
          messages: [...updatedSession.messages, assistantMsg],
        };
        const finalWithReply = finalSessions.map((s) =>
          s.id === withReply.id ? withReply : s,
        );
        setSessions(finalWithReply);
        saveSessions(role, finalWithReply);
      }
    } catch {
      setError("Tidak dapat terhubung ke layanan AI. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // ---- Colours per role ----------------------------------------------------

  const accentSend = isSupplier
    ? "bg-aqua-600 hover:bg-aqua-700 text-white"
    : "bg-verdant-600 hover:bg-verdant-700 text-white";

  const accentChip = isSupplier
    ? "border-aqua-200 bg-aqua-50 text-aqua-700 hover:bg-aqua-100"
    : "border-verdant-200 bg-verdant-50 text-verdant-700 hover:bg-verdant-100";

  const accentHeader = isSupplier
    ? "bg-aqua-100 text-aqua-700"
    : "bg-verdant-100 text-verdant-700";

  const headerScope = isSupplier
    ? "Lingkup: residu, dispatch, kinerja koperasi"
    : "Lingkup: produksi, kinerja koperasi, antrean flag";

  const headerName = isSupplier
    ? "Asisten AI Supplier"
    : "Asisten AI Pengawasan Pemerintah";

  const showDemoPrompts =
    currentMessages.filter((m) => m.role === "user").length === 0;

  // ---- Render --------------------------------------------------------------

  return (
    <div className="flex h-full min-h-0 flex-row">
      {/* Left: session panel */}
      <AiSessionPanel
        viewRole={role}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        onPinSession={handlePinSession}
        collapsed={panelCollapsed}
        onToggleCollapse={() => setPanelCollapsed((v) => !v)}
      />

      {/* Right: chat area */}
      <div
        className="relative flex min-h-0 min-w-0 flex-1 flex-col"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Chat area header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          {panelCollapsed && (
            <button
              type="button"
              onClick={() => setPanelCollapsed(false)}
              title="Buka panel percakapan"
              className="mr-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <PanelLeftOpen size={15} />
            </button>
          )}
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              accentHeader,
            )}
          >
            <Bot size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {activeSession?.title ?? headerName}
            </p>
            <p className="text-xs text-muted-foreground">{headerScope}</p>
          </div>
          <span
            className={cn(
              "ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              isSupplier
                ? "bg-aqua-50 text-aqua-700"
                : "bg-verdant-50 text-verdant-700",
            )}
          >
            Hanya Baca Data
          </span>
        </div>

        {/* Message list */}
        <div className="relative min-h-0 flex-1">
          <ScrollArea className="h-full" viewportClassName="px-4 py-4">
            <div className="space-y-4 pb-2">
              {currentMessages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div
                    className={cn(
                      "mb-3 flex h-12 w-12 items-center justify-center rounded-full",
                      accentHeader,
                    )}
                  >
                    <Bot size={24} />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {isSupplier
                      ? "Asisten AI Supplier siap membantu."
                      : "Asisten AI Pengawasan siap membantu."}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ketik pertanyaan di bawah atau pilih contoh.
                  </p>
                </div>
              )}

              {currentMessages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isSupplier={isSupplier}
                />
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                    <Bot size={14} />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <span className="block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                      <span className="block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                      <span className="block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <Bot size={14} />
                  </div>
                  <div className="max-w-[82%] rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Demo prompt chips (empty thread only) */}
        {showDemoPrompts && (
          <div className="shrink-0 border-t border-border px-4 pt-3 pb-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Contoh pertanyaan:
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO_PROMPTS[role].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    accentChip,
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Attachment chips (pending) */}
        {pendingAttachments.length > 0 && (
          <div className="shrink-0 flex flex-wrap gap-2 border-t border-border px-4 pt-2.5 pb-1">
            {pendingAttachments.map((att) => (
              <AttachmentChip
                key={att.id}
                att={att}
                onRemove={() =>
                  setPendingAttachments((prev) =>
                    prev.filter((a) => a.id !== att.id),
                  )
                }
              />
            ))}
          </div>
        )}

        {/* File error */}
        {fileError && (
          <div className="shrink-0 border-t border-border bg-red-50 px-4 py-2 text-xs text-red-700">
            {fileError}
            <button
              type="button"
              onClick={() => setFileError(null)}
              className="ml-2 underline"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Composer */}
        <div className="shrink-0 border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
            {/* Paperclip file button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="Lampirkan file (.xlsx, .csv, .png, ...)"
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
                "hover:bg-surface-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              <Paperclip size={15} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pertanyaan..."
              disabled={loading}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />

            {/* Send button */}
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              aria-label="Kirim pesan"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-40",
                accentSend,
              )}
            >
              <Send size={14} />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            AI hanya membaca data, tidak bisa menulis. Jawaban berdasarkan
            snapshot data yang tersedia.
          </p>
        </div>

        {/* Drag-over overlay */}
        {isDragOver && (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 rounded-r-lg border-2 border-dashed",
              isSupplier ? "border-aqua-400 bg-aqua-50/80" : "border-verdant-400 bg-verdant-50/80",
            )}
          >
            <Paperclip
              size={32}
              className={isSupplier ? "text-aqua-600" : "text-verdant-600"}
            />
            <p
              className={cn(
                "text-sm font-semibold",
                isSupplier ? "text-aqua-700" : "text-verdant-700",
              )}
            >
              Lepaskan file untuk melampirkan
            </p>
            <p className="text-xs text-muted-foreground">
              .xlsx, .csv, .png, .jpg, .webp
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

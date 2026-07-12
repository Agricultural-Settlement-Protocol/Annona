"use client";

/**
 * Left session panel for the AI assistant.
 * Lists sessions sorted by pinned (top) then updatedAt desc.
 * Actions: New, Rename (inline), Delete (confirm inline), Pin/Unpin.
 * Collapses to icon rail; collapse state persisted via the parent.
 * No em dashes in any UI copy.
 * viewRole is used as a prop name (not "role") per house convention.
 */

import { ScrollArea } from "@/components/scroll-area";
import { cn } from "@annona/ui";
import {
  Edit2,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  type ChatRole,
  type Session,
  relativeTime,
  sortSessions,
} from "./ai-sessions";

interface SessionPanelProps {
  viewRole: ChatRole;
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  onPinSession: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AiSessionPanel({
  viewRole,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
  onPinSession,
  collapsed,
  onToggleCollapse,
}: SessionPanelProps) {
  const isSupplier = viewRole === "supplier";
  const sorted = sortSessions(sessions);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  // Close kebab menu on outside click
  useEffect(() => {
    if (!menuId) return;
    function onOutside(e: MouseEvent) {
      if (
        menuPanelRef.current &&
        !menuPanelRef.current.contains(e.target as Node)
      ) {
        setMenuId(null);
        setDeleteConfirmId(null);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuId]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId) {
      const t = setTimeout(() => renameInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [renamingId]);

  function startRename(session: Session) {
    setRenamingId(session.id);
    setRenameValue(session.title);
    setMenuId(null);
    setDeleteConfirmId(null);
  }

  function commitRename(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed) onRenameSession(id, trimmed);
    setRenamingId(null);
  }

  const accentNew = isSupplier
    ? "bg-aqua-50 text-aqua-700 hover:bg-aqua-100 border-aqua-200"
    : "bg-verdant-50 text-verdant-700 hover:bg-verdant-100 border-verdant-200";

  const accentActive = isSupplier
    ? "bg-aqua-50 text-aqua-900"
    : "bg-verdant-50 text-verdant-900";

  const accentIconActive = isSupplier
    ? "bg-aqua-100 text-aqua-700"
    : "bg-verdant-100 text-verdant-700";

  // Collapsed icon rail
  if (collapsed) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-border py-3">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Perluas panel percakapan"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <PanelLeftOpen size={16} />
        </button>
        <button
          type="button"
          onClick={onNewSession}
          title="Percakapan Baru"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
            accentNew,
          )}
        >
          <Plus size={16} />
        </button>
        <div className="mt-1 flex flex-col gap-1">
          {sorted.slice(0, 8).map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => onSelectSession(s.id)}
              title={s.title}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                activeSessionId === s.id
                  ? accentIconActive
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <MessageSquare size={14} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-64 shrink-0 flex-col border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <button
          type="button"
          onClick={onNewSession}
          className={cn(
            "flex flex-1 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
            accentNew,
          )}
        >
          <Plus size={14} />
          Percakapan Baru
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Ciutkan panel"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Session list */}
      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full" viewportClassName="px-2 py-2">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <MessageSquare size={28} className="text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                Belum ada percakapan.
              </p>
              <p className="text-xs text-muted-foreground">
                Klik "Percakapan Baru" untuk memulai.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {sorted.map((s) => (
                // Key on Fragment because each item may expand to rename row or normal row
                <Fragment key={s.id}>
                  {renamingId === s.id ? (
                    <div className="flex items-center gap-1 rounded-lg px-2 py-1.5">
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(s.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onBlur={() => commitRename(s.id)}
                        className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                        aria-label="Ubah nama percakapan"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => onSelectSession(s.id)}
                        className={cn(
                          "group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                          activeSessionId === s.id
                            ? accentActive
                            : "text-foreground hover:bg-surface-muted",
                        )}
                      >
                        <MessageSquare
                          size={14}
                          className="mt-0.5 shrink-0 text-muted-foreground"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            {s.pinned && (
                              <Pin
                                size={9}
                                className="shrink-0 text-muted-foreground"
                              />
                            )}
                            <span className="truncate text-xs font-medium">
                              {s.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {relativeTime(s.updatedAt)}
                          </span>
                        </div>
                        {/* Kebab trigger (shown on hover) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (menuId === s.id) {
                              setMenuId(null);
                              setDeleteConfirmId(null);
                            } else {
                              setMenuId(s.id);
                              setDeleteConfirmId(null);
                            }
                          }}
                          aria-label="Opsi percakapan"
                          className="hidden h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground group-hover:flex"
                        >
                          <MoreHorizontal size={12} />
                        </button>
                      </button>

                      {/* Kebab backdrop (accessible button closes the menu) */}
                      {menuId === s.id && (
                        <button
                          type="button"
                          aria-label="Tutup menu"
                          onClick={() => {
                            setMenuId(null);
                            setDeleteConfirmId(null);
                          }}
                          className="fixed inset-0 z-10 cursor-default bg-transparent"
                        />
                      )}

                      {/* Dropdown menu */}
                      {menuId === s.id && (
                        <div
                          ref={menuPanelRef}
                          className="absolute right-1 top-9 z-20 flex flex-col overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-md"
                          style={{ minWidth: "9.5rem" }}
                        >
                          <button
                            type="button"
                            onClick={() => startRename(s)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-surface-muted"
                          >
                            <Edit2 size={11} />
                            Ubah Nama
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onPinSession(s.id);
                              setMenuId(null);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-surface-muted"
                          >
                            {s.pinned ? (
                              <PinOff size={11} />
                            ) : (
                              <Pin size={11} />
                            )}
                            {s.pinned ? "Lepas Pin" : "Pin"}
                          </button>
                          <div className="my-1 border-t border-border" />
                          {deleteConfirmId === s.id ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5">
                              <span className="text-[10px] text-muted-foreground">
                                Hapus?
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteSession(s.id);
                                  setMenuId(null);
                                  setDeleteConfirmId(null);
                                }}
                                className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-200"
                              >
                                Ya
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-border"
                              >
                                Tidak
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(s.id)}
                              className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={11} />
                              Hapus
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

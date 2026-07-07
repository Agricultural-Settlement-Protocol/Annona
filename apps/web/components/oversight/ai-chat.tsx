"use client";

/**
 * Shared AI chat UI for Agrinas and Pemerintah oversight views.
 *
 * Sends { role, messages, groundingSnapshot } to POST /api/oversight-ai.
 * All bigints must be serialised (formatRupiah / String) before reaching here.
 * No streaming; waits for full response. Scroll area for message history.
 * No em dashes in any UI copy.
 */

import { ScrollArea } from "@/components/scroll-area";
import { cn } from "@annona/ui";
import { Bot, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ChatRole = "agrinas" | "pemerintah";

export interface GroundingSnapshot {
  [key: string]: unknown;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const DEMO_PROMPTS: Record<ChatRole, string[]> = {
  agrinas: [
    "KMP mana yang paling banyak residu pokok belum disetor?",
    "Berapa total residu Agrinas yang belum diverifikasi?",
    "Berapa antrean dispatch yang masih menunggu?",
    "KMP mana yang sedang dibekukan reputasinya?",
  ],
  pemerintah: [
    "KMP mana paling banyak utang belum terbayar?",
    "Siapa panen minggu depan?",
    "Kenapa KMP Sukamaju settlement rate rendah?",
    "Berapa total produksi gabah seluruh koperasi?",
  ],
};

function MessageBubble({
  message,
  isAgrinas,
}: {
  message: ChatMessage;
  isAgrinas: boolean;
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
            ? isAgrinas
              ? "bg-aqua-100 text-aqua-700"
              : "bg-verdant-100 text-verdant-700"
            : "bg-ink-100 text-ink-600",
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? isAgrinas
              ? "rounded-tr-sm bg-aqua-600 text-white"
              : "rounded-tr-sm bg-verdant-600 text-white"
            : "rounded-tl-sm border border-border bg-surface text-foreground",
        )}
      >
        {message.content.split("\n").map((line, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static rendering
          <span key={i}>
            {line}
            {i < message.content.split("\n").length - 1 ? <br /> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AiChat({
  viewRole: role,
  groundingSnapshot,
}: {
  viewRole: ChatRole;
  groundingSnapshot: GroundingSnapshot;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      content:
        role === "agrinas"
          ? "Halo. Saya asisten AI Agrinas. Saya bisa membantu Anda menganalisis data residu, dispatch saprotan, dan kesehatan jaringan koperasi berdasarkan data yang tersedia. Apa yang ingin Anda ketahui?"
          : "Halo. Saya asisten AI Pengawasan Pemerintah. Saya dapat membantu Anda menganalisis data produksi komoditas, kinerja koperasi, dan antrean flag berdasarkan data yang tersedia. Apa yang ingin Anda ketahui?",
    },
  ]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAgrinas = role === "agrinas";

  // Scroll to bottom on new messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps intentionally trigger re-scroll on chat updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    // Build OpenAI-style history (exclude init message's system-like tone)
    const history = [...messages.filter((m) => m.id !== "init"), userMsg].map(
      (m) => ({ role: m.role, content: m.content }),
    );

    try {
      const res = await fetch("/api/oversight-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          messages: history,
          groundingSnapshot,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (data.error) {
        setError(data.error);
      } else {
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.reply ?? "Tidak ada respons dari AI.",
        };
        setMessages((prev) => [...prev, assistantMsg]);
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

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="relative min-h-0 flex-1">
        <ScrollArea className="h-full" viewportClassName="px-4 py-4">
          <div className="space-y-4 pb-2">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isAgrinas={isAgrinas} />
            ))}
            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600">
                  <Bot size={14} />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <span className="block h-2 w-2 animate-bounce rounded-full bg-ink-300 [animation-delay:0ms]" />
                    <span className="block h-2 w-2 animate-bounce rounded-full bg-ink-300 [animation-delay:150ms]" />
                    <span className="block h-2 w-2 animate-bounce rounded-full bg-ink-300 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <Bot size={14} />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Suggested prompts */}
      <div className="border-t border-border px-4 pt-3 pb-2">
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
                isAgrinas
                  ? "border-aqua-200 bg-aqua-50 text-aqua-700 hover:bg-aqua-100"
                  : "border-verdant-200 bg-verdant-50 text-verdant-700 hover:bg-verdant-100",
              )}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
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
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-40",
              isAgrinas
                ? "bg-aqua-600 text-white hover:bg-aqua-700"
                : "bg-verdant-600 text-white hover:bg-verdant-700",
            )}
            aria-label="Kirim"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          AI hanya membaca data, tidak bisa menulis. Jawaban berdasarkan snapshot data
          yang tersedia.
        </p>
      </div>
    </div>
  );
}

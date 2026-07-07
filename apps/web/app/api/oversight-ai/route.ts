/**
 * POST /api/oversight-ai
 *
 * Groq-backed AI assistant for the Oversight dashboard.
 * - GROQ_API_KEY is server-only, never exposed to the client.
 * - Client sends a compact grounding snapshot (bigints serialised as strings
 *   by the client before JSON.stringify — safe, no raw bigint in transit).
 * - Server builds a role-scoped system prompt embedding the snapshot.
 * - Plain fetch, no new dependency.
 *
 * Request body:
 *   { role: "agrinas" | "pemerintah", messages: OpenAI-style messages[], groundingSnapshot: object }
 *
 * Response: { reply: string } or { error: string }
 */

import { type NextRequest, NextResponse } from "next/server";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

type Role = "agrinas" | "pemerintah";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  role: Role;
  messages: Message[];
  groundingSnapshot: Record<string, unknown>;
}

function buildSystemPrompt(
  role: Role,
  groundingSnapshot: Record<string, unknown>,
): string {
  const snapshotText = JSON.stringify(groundingSnapshot, null, 2);

  const roleScope =
    role === "agrinas"
      ? `Anda adalah asisten AI untuk operator Agrinas di Annona Protocol.
Lingkup Anda: operasional protokol, data residu antar-lembaga, status dispatch saprotan, kesehatan jaringan koperasi, pokok Agrinas yang belum diterima, rekonsiliasi, dan sengketa.
Anda TIDAK membahas kebijakan pertanian umum, harga pasar bebas, atau informasi di luar data yang diberikan.`
      : `Anda adalah asisten AI untuk petugas pengawas Pemerintah di Annona Protocol.
Lingkup Anda: data produksi komoditas regional, leaderboard kinerja koperasi, settlement rate, rasio panen sukses vs gagal, antrean flag, dan kepatuhan protokol secara makro.
Anda TIDAK membahas operasional internal Agrinas, detail harga pokok, atau tindakan write apapun (Anda hanya membaca data).`;

  return `${roleScope}

DATA GROUNDING (SUMBER TUNGGAL KEBENARAN ANDA):
${snapshotText}

ATURAN WAJIB:
1. Jawab HANYA berdasarkan data grounding di atas. Jangan mengarang angka.
2. Setiap angka yang Anda sebutkan harus ada di data grounding.
3. Jawab dalam Bahasa Indonesia yang jelas dan ringkas.
4. JANGAN gunakan tanda pisah panjang (em dash) di manapun dalam jawaban Anda.
5. Flag dan status Bermasalah hanya indikator untuk peninjauan manusia, bukan tuduhan otomatis. Framing ini wajib dijaga.
6. JANGAN klaim bahwa blockchain membayar petani. Blockchain adalah catatan penyelesaian yang anti-tamper.
7. Jika ditanya di luar lingkup Anda, katakan "Pertanyaan ini di luar lingkup data saya."
8. Jawaban singkat dan padat. Tidak perlu basa-basi panjang.
9. Jika data tidak tersedia untuk pertanyaan spesifik, katakan terus terang.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Layanan AI tidak tersedia saat ini. (Konfigurasi server belum lengkap.)" },
      { status: 503 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const { role, messages, groundingSnapshot } = body;

  if (
    !role ||
    !["agrinas", "pemerintah"].includes(role) ||
    !Array.isArray(messages) ||
    !groundingSnapshot
  ) {
    return NextResponse.json({ error: "Parameter permintaan tidak lengkap." }, { status: 400 });
  }

  // Validate message shapes
  for (const m of messages) {
    if (!m.role || !m.content || typeof m.content !== "string") {
      return NextResponse.json({ error: "Format pesan tidak valid." }, { status: 400 });
    }
  }

  const systemPrompt = buildSystemPrompt(role, groundingSnapshot);

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: groqMessages,
        max_tokens: 512,
        temperature: 0.3,
      }),
    });
  } catch (err) {
    console.error("[oversight-ai] Groq fetch failed:", err);
    return NextResponse.json(
      { error: "Tidak dapat terhubung ke layanan AI. Coba lagi nanti." },
      { status: 502 },
    );
  }

  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => "");
    console.error("[oversight-ai] Groq error:", groqRes.status, errText);
    return NextResponse.json(
      { error: `Layanan AI mengembalikan kesalahan (${groqRes.status}). Coba lagi nanti.` },
      { status: 502 },
    );
  }

  let groqData: {
    choices?: { message?: { content?: string } }[];
  };
  try {
    groqData = (await groqRes.json()) as typeof groqData;
  } catch {
    return NextResponse.json(
      { error: "Respons AI tidak dapat dibaca. Coba lagi nanti." },
      { status: 502 },
    );
  }

  const reply = groqData.choices?.[0]?.message?.content ?? "";
  if (!reply) {
    return NextResponse.json(
      { error: "AI tidak memberikan respons. Coba lagi." },
      { status: 502 },
    );
  }

  return NextResponse.json({ reply });
}

/**
 * POST /api/oversight-ai
 *
 * Groq-backed AI assistant for the Oversight dashboard (Agrinas + Pemerintah).
 *
 * Request body:
 *   {
 *     role: "agrinas" | "pemerintah",
 *     messages: { role: "user" | "assistant", content: string }[],
 *     groundingSnapshot: object,
 *     attachments?: (
 *       | { kind: "table"; name: string; csv: string }
 *       | { kind: "image"; name: string; dataUrl: string }
 *     )[]
 *   }
 *
 * Response: { reply: string } | { error: string }
 *
 * Model selection:
 *   - Image attachments present: meta-llama/llama-4-scout-17b-16e-instruct (vision)
 *   - Text-only (tables as CSV in message): GROQ_MODEL env (llama-3.3-70b-versatile default)
 *
 * Security:
 *   - GROQ_API_KEY is server-only, never logged, never sent to client.
 *   - Attachment contents are NOT logged.
 *   - Request size guard: reject > 6 MB.
 */

import { type NextRequest, NextResponse } from "next/server";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const SIZE_LIMIT_BYTES = 6 * 1024 * 1024; // 6 MB

type OversightRole = "agrinas" | "pemerintah";

interface TextMessage {
  role: "user" | "assistant";
  content: string;
}

interface TableAttachment {
  kind: "table";
  name: string;
  csv: string;
}

interface ImageAttachment {
  kind: "image";
  name: string;
  dataUrl: string;
}

type Attachment = TableAttachment | ImageAttachment;

interface RequestBody {
  role: OversightRole;
  messages: TextMessage[];
  groundingSnapshot: Record<string, unknown>;
  attachments?: Attachment[];
}

// ---- System prompt ---------------------------------------------------------

function buildSystemPrompt(
  role: OversightRole,
  groundingSnapshot: Record<string, unknown>,
): string {
  const snapshotText = JSON.stringify(groundingSnapshot, null, 2);

  const roleScope =
    role === "agrinas"
      ? `IDENTITAS ANDA: Analis keuangan-pertanian dan pengawasan operasional ahli untuk Agrinas di Annona Protocol.

LINGKUP ANDA (hanya ini yang boleh dianalisis):
- Data residu pokok Agrinas (pending, remitted, cleared) per koperasi dan per petani.
- Status dispatch saprotan (pupuk, benih, pestisida, alsintan): antrean, persetujuan, nilai.
- Kesehatan jaringan koperasi: settlement rate, kepatuhan residu, status reputasi/pembekuan.
- Rekonsiliasi keuangan antar-lembaga dan sengketa terkait.

YANG TIDAK BOLEH DIBAHAS: kebijakan pertanian umum, harga pasar bebas, data makro regional, tindakan write di blockchain.`
      : `IDENTITAS ANDA: Analis makro produksi pertanian dan pengawasan kepatuhan koperasi untuk Pemerintah di Annona Protocol.

LINGKUP ANDA (hanya ini yang boleh dianalisis):
- Data produksi komoditas regional (kg, yield, distribusi).
- Leaderboard kinerja koperasi: settlement rate, repayment rate, rasio panen sukses vs gagal.
- Antrean flag dan alasan flag untuk peninjauan manusia.
- Kepatuhan protokol secara makro (tidak detail operasional Agrinas).

YANG TIDAK BOLEH DIBAHAS: detail harga pokok Agrinas, operasional dispatch internal, tindakan write apapun (Anda hanya membaca data, tidak dapat mengubah apapun).`;

  return `${roleScope}

DATA GROUNDING (SUMBER TUNGGAL KEBENARAN ANDA):
\`\`\`json
${snapshotText}
\`\`\`

ATURAN WAJIB (tidak boleh dilanggar dalam keadaan apapun):
1. Jawab HANYA berdasarkan data grounding dan lampiran yang diberikan. Jangan mengarang atau menginterpolasi angka.
2. Setiap angka yang disebutkan harus dikutip dari data grounding. Sebutkan sumbernya (contoh: "berdasarkan data per_kmp" atau "dari lampiran spreadsheet yang diunggah").
3. JANGAN PERNAH menggunakan karakter tanda pisah panjang (em dash: —) di manapun dalam jawaban Anda. Gunakan koma, titik, atau kata "dan" sebagai gantinya.
4. Flag dan status "Bermasalah" atau "Suspected" adalah INDIKATOR untuk peninjauan manusia, bukan tuduhan otomatis. Framing ini wajib dijaga setiap saat.
5. JANGAN klaim bahwa blockchain membayar petani. Blockchain di Annona Protocol adalah catatan penyelesaian yang anti-tamper, bukan alat pembayaran.
6. Jika ditanya di luar lingkup Anda, jawab: "Pertanyaan ini di luar lingkup data yang tersedia untuk saya."
7. Jika data tidak tersedia untuk pertanyaan spesifik, katakan terus terang: "Data ini tidak tersedia dalam snapshot saat ini."
8. Format uang: selalu gunakan Rp dengan titik sebagai pemisah ribuan (contoh: Rp14.900.000). Jangan gunakan format lain.
9. Saat menganalisis lampiran spreadsheet: lakukan analisis keuangan nyata (hitung total, tren, anomali, rasio). Tampilkan hasil dalam tabel markdown yang ringkas dan mudah dibaca.
10. Jawaban singkat, padat, dan profesional. Hindari basa-basi atau pengulangan pertanyaan.
11. Gunakan Bahasa Indonesia yang jelas dan dapat dipahami oleh petugas koperasi non-teknis.`;
}

// ---- Request size guard ----------------------------------------------------

async function readBodyWithSizeGuard(
  req: NextRequest,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > SIZE_LIMIT_BYTES) {
    return {
      ok: false,
      error:
        "Ukuran permintaan terlalu besar (maks. 6 MB). Kurangi ukuran lampiran.",
    };
  }
  // Stream-read with byte count guard
  let totalBytes = 0;
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  if (!reader) return { ok: true, text: "" };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > SIZE_LIMIT_BYTES) {
      return {
        ok: false,
        error:
          "Ukuran permintaan terlalu besar (maks. 6 MB). Kurangi ukuran lampiran.",
      };
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(merged) };
}

// ---- Groq content helpers --------------------------------------------------

type GroqTextPart = { type: "text"; text: string };
type GroqImagePart = {
  type: "image_url";
  image_url: { url: string };
};
type GroqContent = string | (GroqTextPart | GroqImagePart)[];

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: GroqContent;
}

function buildGroqMessages(
  systemPrompt: string,
  messages: TextMessage[],
  attachments: Attachment[],
): GroqMessage[] {
  const images = attachments.filter(
    (a): a is ImageAttachment => a.kind === "image",
  );
  const tables = attachments.filter(
    (a): a is TableAttachment => a.kind === "table",
  );

  // Embed CSV tables into the last user message text
  const tableSuffix = tables
    .map(
      (t) =>
        `\n\n[Lampiran tabel: ${t.name}]\n\`\`\`csv\n${t.csv}\n\`\`\``,
    )
    .join("");

  const historyWithoutLast = messages.slice(0, -1);
  const lastMsg = messages[messages.length - 1];

  if (!lastMsg) {
    return [{ role: "system", content: systemPrompt }];
  }

  const lastTextContent = lastMsg.content + tableSuffix;

  const groqHistory: GroqMessage[] = historyWithoutLast.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (images.length > 0) {
    // Vision content: text + image parts
    const contentParts: (GroqTextPart | GroqImagePart)[] = [
      { type: "text", text: lastTextContent },
      ...images.map(
        (img): GroqImagePart => ({
          type: "image_url",
          image_url: { url: img.dataUrl },
        }),
      ),
    ];
    return [
      { role: "system", content: systemPrompt },
      ...groqHistory,
      { role: "user", content: contentParts },
    ];
  }

  // Text-only
  return [
    { role: "system", content: systemPrompt },
    ...groqHistory,
    { role: "user", content: lastTextContent },
  ];
}

// ---- Handler ---------------------------------------------------------------

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  const textModel = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Layanan AI tidak tersedia saat ini. (Konfigurasi server belum lengkap.)",
      },
      { status: 503 },
    );
  }

  // Read body with size guard
  const bodyResult = await readBodyWithSizeGuard(req);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: 413 });
  }

  let body: RequestBody;
  try {
    body = JSON.parse(bodyResult.text) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  const { role, messages, groundingSnapshot, attachments = [] } = body;

  // Validate required fields
  if (
    !role ||
    !["agrinas", "pemerintah"].includes(role) ||
    !Array.isArray(messages) ||
    !groundingSnapshot
  ) {
    return NextResponse.json(
      { error: "Parameter permintaan tidak lengkap." },
      { status: 400 },
    );
  }

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada pesan yang dikirim." },
      { status: 400 },
    );
  }

  for (const m of messages) {
    if (
      !m.role ||
      !["user", "assistant"].includes(m.role) ||
      typeof m.content !== "string"
    ) {
      return NextResponse.json(
        { error: "Format pesan tidak valid." },
        { status: 400 },
      );
    }
  }

  // Validate attachments (basic shape check; contents not logged)
  if (!Array.isArray(attachments)) {
    return NextResponse.json(
      { error: "Format lampiran tidak valid." },
      { status: 400 },
    );
  }

  const hasImages = attachments.some((a) => a.kind === "image");
  const chosenModel = hasImages ? VISION_MODEL : textModel;

  const systemPrompt = buildSystemPrompt(role, groundingSnapshot);
  const groqMessages = buildGroqMessages(systemPrompt, messages, attachments);

  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: chosenModel,
        messages: groqMessages,
        max_tokens: 768,
        temperature: 0.25,
      }),
    });
  } catch (err) {
    console.error("[oversight-ai] Groq fetch failed:", (err as Error).message);
    return NextResponse.json(
      { error: "Tidak dapat terhubung ke layanan AI. Coba lagi nanti." },
      { status: 502 },
    );
  }

  if (!groqRes.ok) {
    const errStatus = groqRes.status;
    // Read error body for logging only (not sent to client)
    await groqRes.text().catch(() => "");
    console.error("[oversight-ai] Groq error status:", errStatus);
    return NextResponse.json(
      {
        error: `Layanan AI mengembalikan kesalahan (${errStatus}). Coba lagi nanti.`,
      },
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

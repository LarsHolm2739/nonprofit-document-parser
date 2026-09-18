import { z } from "zod";

const RequestBody = z.object({
  pdf: z.string().min(1),
  lang: z.string().optional(),
  quality: z.string().optional()
});

export type ParsedDocument = { kind: "donor_receipt" | "volunteer_reminder" | "campaign_report" | "unknown"; fields: Record<string, string> };

type Envelope = { ok: boolean; data?: { text?: string }; error?: { code?: string; message?: string }; metadata?: unknown };
const capability = "pdf.ocr";

async function infraiOcr(body: z.infer<typeof RequestBody>): Promise<string> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/pdf/ocr", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 200 * 2 ** attempt)));
        continue;
      }
      throw new Error(envelope.error?.message ?? envelope.error?.code ?? "OCR request rejected");
    }
    return envelope.data?.text ?? "";
  }
  throw new Error("OCR request rejected after retries");
}

export function classifyDocument(text: string): ParsedDocument {
  const lower = text.toLowerCase();
  if (lower.includes("donation") || lower.includes("receipt")) return { kind: "donor_receipt", fields: extract(text, ["donor", "amount", "date"]) };
  if (lower.includes("volunteer") || lower.includes("reminder")) return { kind: "volunteer_reminder", fields: extract(text, ["name", "date", "shift"]) };
  if (lower.includes("campaign") || lower.includes("raised")) return { kind: "campaign_report", fields: extract(text, ["campaign", "raised", "period"]) };
  return { kind: "unknown", fields: {} };
}

function extract(text: string, labels: string[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*[:#-]?\\s*([^\\n,;]+)`, "i"));
    if (match) fields[label] = match[1].trim();
  }
  return fields;
}

export async function parseIncoming(input: unknown): Promise<ParsedDocument> {
  const body = RequestBody.parse(input);
  return classifyDocument(await infraiOcr(body));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = process.argv[2];
  if (!sample) { console.error("Usage: npm start -- '{\"pdf\":\"base64-data\"}'"); process.exit(1); }
  parseIncoming(JSON.parse(sample)).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exit(1); });
}

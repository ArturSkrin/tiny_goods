const NP_URL = "https://api.novaposhta.ua/v2.0/json/";

export async function np<T>(
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, unknown>,
): Promise<T[]> {
  const res = await fetch(NP_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // Public lookups work without a key; NOVA_POSHTA_API_KEY raises rate limits and gives full tracking details.
    body: JSON.stringify({
      apiKey: process.env.NOVA_POSHTA_API_KEY ?? "",
      modelName,
      calledMethod,
      methodProperties,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const json = (await res.json()) as { success: boolean; data: T[]; errors?: string[] };
  if (!json.success) throw new Error(json.errors?.join("; ") || "Nova Poshta request failed");
  return json.data;
}

/** Small TTL cache; NP reference data changes rarely. */
const cache = new Map<string, { at: number; value: unknown }>();
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  if (cache.size > 2000) cache.clear();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export type TrackingStage = "created" | "sent" | "in_transit" | "at_branch" | "received" | "problem";

export type NpTracking = {
  stage: TrackingStage;
  status: string; // NP's own wording, shown as is
  code: string;
  scheduledDate?: string | null;
  receivedAt?: string | null;
  warehouse?: string | null;
  checkedAt: string;
};

// NP StatusCode → our stage. Codes per TrackingDocument.getStatusDocuments docs.
const STAGES: Record<string, TrackingStage> = {
  "1": "created",
  "4": "sent", "41": "sent",
  "5": "in_transit", "6": "in_transit", "101": "in_transit", "104": "in_transit", "112": "in_transit",
  "7": "at_branch", "8": "at_branch",
  "9": "received", "10": "received", "11": "received", "106": "received",
};

type NpStatusRow = {
  Number: string;
  StatusCode: string;
  Status: string;
  ScheduledDeliveryDate?: string;
  RecipientDateTime?: string;
  WarehouseRecipient?: string;
};

/** Current status of several waybills at once (NP accepts up to 100 per call). */
export async function trackWaybills(docs: { ttn: string; phone: string }[]): Promise<Map<string, NpTracking>> {
  const rows = await np<NpStatusRow>("TrackingDocument", "getStatusDocuments", {
    Documents: docs.map((d) => ({ DocumentNumber: d.ttn, Phone: d.phone.replace(/\D/g, "") })),
  });
  const now = new Date().toISOString();
  return new Map(
    rows.map((r) => [
      r.Number,
      {
        stage: STAGES[r.StatusCode] ?? "problem",
        status: r.Status,
        code: r.StatusCode,
        scheduledDate: r.ScheduledDeliveryDate || null,
        receivedAt: r.RecipientDateTime || null,
        warehouse: r.WarehouseRecipient || null,
        checkedAt: now,
      },
    ]),
  );
}

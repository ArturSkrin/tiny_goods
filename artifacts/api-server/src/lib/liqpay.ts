import crypto from "crypto";

export function liqpaySign(privateKey: string, data: string): string {
  return crypto
    .createHash("sha1")
    .update(privateKey + data + privateKey)
    .digest("base64");
}

export function liqpayEncode(params: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(params)).toString("base64");
}

export function liqpayDecode(data: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(data, "base64").toString("utf8"));
}

export function verifyLiqpaySignature(
  privateKey: string,
  data: string,
  signature: string,
): boolean {
  const expected = liqpaySign(privateKey, data);
  return expected === signature;
}

export interface LiqpayCheckoutParams {
  publicKey: string;
  privateKey: string;
  orderId: string;
  amount: number;
  description: string;
  serverUrl: string;
  resultUrl: string;
}

export function buildLiqpayCheckout(params: LiqpayCheckoutParams): {
  data: string;
  signature: string;
} {
  const data = liqpayEncode({
    version: 3,
    public_key: params.publicKey,
    action: "pay",
    amount: params.amount,
    currency: "UAH",
    description: params.description,
    order_id: params.orderId,
    server_url: params.serverUrl,
    result_url: params.resultUrl,
    language: "uk",
  });
  const signature = liqpaySign(params.privateKey, data);
  return { data, signature };
}

/** Map LiqPay payment status to our internal payment status */
export function mapLiqpayStatus(
  liqpayStatus: string,
): "paid" | "failed" | "pending" {
  if (["success", "subscribed"].includes(liqpayStatus)) return "paid";
  if (["failure", "error", "reversed"].includes(liqpayStatus)) return "failed";
  return "pending";
}

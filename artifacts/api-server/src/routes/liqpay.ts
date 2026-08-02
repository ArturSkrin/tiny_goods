import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import {
  buildLiqpayCheckout,
  liqpayDecode,
  mapLiqpayStatus,
  verifyLiqpaySignature,
} from "../lib/liqpay";

const router: IRouter = Router();

/** POST /orders/:id/liqpay-checkout — returns {data, signature} for LiqPay form */
router.post("/orders/:id/liqpay-checkout", async (req, res): Promise<void> => {
  const publicKey = process.env.LIQPAY_PUBLIC_KEY;
  const privateKey = process.env.LIQPAY_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    res.status(503).json({
      error: "LiqPay is not configured. Add LIQPAY_PUBLIC_KEY and LIQPAY_PRIVATE_KEY secrets.",
    });
    return;
  }

  const id = parseInt(req.params.id ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.paymentMethod !== "liqpay") {
    res.status(400).json({ error: "Order payment method is not liqpay" });
    return;
  }

  // Derive URLs server-side — never trust client-supplied return URLs.
  // Prefer REPLIT_DOMAINS (production), fall back to REPLIT_DEV_DOMAIN (dev preview).
  const domain =
    process.env.REPLIT_DOMAINS?.split(",")[0] ?? process.env.REPLIT_DEV_DOMAIN;
  const baseUrl = domain ? `https://${domain}` : "";
  const serverUrl = baseUrl ? `${baseUrl}/api/liqpay/webhook` : "";
  // Embed the opaque customer token in the return URL so the buyer can
  // poll only their own payment status — no PII, no enumerable order IDs.
  const resultUrl = baseUrl
    ? `${baseUrl}/checkout/success?token=${encodeURIComponent(order.customerToken)}`
    : "";

  const liqpayOrderId = `tg-${order.id}`;
  const { data, signature } = buildLiqpayCheckout({
    publicKey,
    privateKey,
    orderId: liqpayOrderId,
    amount: Number(order.total),
    description: `Замовлення №${order.id} — TinyGoods`,
    serverUrl,
    resultUrl,
  });

  // Store the liqpay_order_id so the webhook can look up this order
  await db
    .update(ordersTable)
    .set({ liqpayOrderId })
    .where(eq(ordersTable.id, order.id));

  res.json({ data, signature });
});

/** POST /liqpay/webhook — LiqPay calls this after payment */
router.post("/liqpay/webhook", async (req, res): Promise<void> => {
  const privateKey = process.env.LIQPAY_PRIVATE_KEY;
  if (!privateKey) {
    res.status(503).send("Not configured");
    return;
  }

  const { data, signature } = req.body as {
    data?: string;
    signature?: string;
  };

  if (!data || !signature) {
    res.status(400).send("Missing data or signature");
    return;
  }

  if (!verifyLiqpaySignature(privateKey, data, signature)) {
    req.log.warn("LiqPay webhook: invalid signature");
    res.status(400).send("Invalid signature");
    return;
  }

  let decoded: Record<string, unknown>;
  try {
    decoded = liqpayDecode(data);
  } catch {
    res.status(400).send("Cannot decode data");
    return;
  }

  const liqpayOrderId = decoded.order_id as string | undefined;
  const liqpayStatus = decoded.status as string | undefined;

  if (!liqpayOrderId || !liqpayStatus) {
    res.status(400).send("Missing order_id or status in payload");
    return;
  }

  const paymentStatus = mapLiqpayStatus(liqpayStatus);

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.liqpayOrderId, liqpayOrderId));

  if (!order) {
    req.log.warn({ liqpayOrderId }, "LiqPay webhook: order not found");
    res.status(200).send("OK"); // respond 200 so LiqPay stops retrying
    return;
  }

  const updates: Partial<typeof order> = { paymentStatus };
  // Auto-confirm order when payment succeeds
  if (paymentStatus === "paid" && order.status === "new") {
    updates.status = "confirmed";
  }

  await db
    .update(ordersTable)
    .set(updates)
    .where(eq(ordersTable.id, order.id));

  req.log.info(
    { orderId: order.id, liqpayStatus, paymentStatus },
    "LiqPay webhook processed",
  );

  res.status(200).send("OK");
});

export default router;

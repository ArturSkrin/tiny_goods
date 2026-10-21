import crypto from "crypto";
import { Router, type IRouter } from "express";
import { desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  productsTable,
  type Order,
  type OrderItem,
  type Product,
  type ProductOption,
} from "@workspace/db";
import { getSettings } from "../lib/settings";
import { getCustomer, rememberFromOrder } from "../lib/customerAuth";
import {
  ListOrdersQueryParams,
  ListOrdersResponse,
  CreateOrderBody,
  CreateOrderResponse,
  GetOrderParams,
  GetOrderResponse,
  UpdateOrderParams,
  UpdateOrderBody,
  UpdateOrderResponse,
  TrackOrderParams,
  TrackOrderResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/adminAuth";
import { trackWaybills } from "../lib/novaposhta";

const router: IRouter = Router();

/**
 * Resolve the chosen option by name. Returns null when the product has no such options,
 * undefined when the choice is missing or unknown (invalid order line).
 */
function pickOption(options: ProductOption[], name: string | undefined) {
  if (options.length === 0) return null;
  return options.find((o) => o.name === name);
}

export function serializeOrder(order: Order, items: OrderItem[]) {
  return {
    id: order.id,
    customerName: order.customerName,
    lastName: order.lastName,
    firstName: order.firstName,
    middleName: order.middleName,
    email: order.email,
    phone: order.phone,
    contactMethod: order.contactMethod,
    comment: order.comment,
    city: order.city,
    novaPoshtaBranch: order.novaPoshtaBranch,
    status: order.status,
    total: Number(order.total),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    ttn: order.ttn,
    tracking: order.npTracking ?? null,
    createdAt: order.createdAt.toISOString(),
    items: items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      variant: i.variant,
      sku: i.sku,
      price: Number(i.price),
      quantity: i.quantity,
      imageUrl: i.imageUrl,
    })),
  };
}

async function loadItemsByOrderIds(orderIds: number[]) {
  if (orderIds.length === 0) return new Map<number, OrderItem[]>();
  const items = await db
    .select()
    .from(orderItemsTable)
    .where(inArray(orderItemsTable.orderId, orderIds));
  const map = new Map<number, OrderItem[]>();
  for (const item of items) {
    const list = map.get(item.orderId) ?? [];
    list.push(item);
    map.set(item.orderId, list);
  }
  return map;
}

const TRACK_TTL_MS = 20 * 60_000;
const ON_THE_WAY = new Set(["sent", "in_transit", "at_branch"]);

/** Parcels worth asking NP about again: have a waybill, not delivered or cancelled, not checked lately. */
const trackingStale = (o: Order) =>
  !!o.ttn &&
  o.status !== "cancelled" &&
  o.npTracking?.stage !== "received" &&
  (!o.npTracking || Date.now() - Date.parse(o.npTracking.checkedAt) > TRACK_TTL_MS);

/**
 * Store the current NP status of these orders' parcels and move the order along with it:
 * on the way → "shipped", delivered → "completed". Returns the updated rows by id.
 */
async function refreshTracking(orders: Order[]) {
  const updated = new Map<number, Order>();
  const withTtn = orders.filter((o) => o.ttn).slice(0, 100);
  if (withTtn.length === 0) return updated;
  const found = await trackWaybills(withTtn.map((o) => ({ ttn: o.ttn!, phone: o.phone })));
  for (const o of withTtn) {
    const t = found.get(o.ttn!);
    if (!t) continue;
    let status = o.status;
    if (t.stage === "received" && status !== "cancelled") status = "completed";
    else if (ON_THE_WAY.has(t.stage) && (status === "new" || status === "confirmed")) status = "shipped";
    const [row] = await db
      .update(ordersTable)
      .set({ npTracking: t, status })
      .where(eq(ordersTable.id, o.id))
      .returning();
    if (row) updated.set(o.id, row);
  }
  return updated;
}

router.get("/orders", requireAdmin, async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  let orders = await db
    .select()
    .from(ordersTable)
    .where(
      query.data.status ? eq(ordersTable.status, query.data.status) : undefined,
    )
    .orderBy(desc(ordersTable.createdAt));
  // Opening the list keeps parcel statuses fresh; NP being down must not break the list.
  try {
    const fresh = await refreshTracking(orders.filter(trackingStale));
    orders = orders.map((o) => fresh.get(o.id) ?? o);
  } catch (err) {
    req.log.warn({ err }, "Nova Poshta tracking refresh failed");
  }
  const itemsMap = await loadItemsByOrderIds(orders.map((o) => o.id));
  res.json(
    ListOrdersResponse.parse(
      orders.map((o) => serializeOrder(o, itemsMap.get(o.id) ?? [])),
    ),
  );
});

/** Public endpoint: poll payment/order status by customer token (no PII returned) */
router.get("/orders/payment-status", async (req, res): Promise<void> => {
  const token = req.query.token as string | undefined;
  if (!token || token.length < 16) {
    res.status(400).json({ error: "token is required" });
    return;
  }
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.customerToken, token));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json({ orderId: order.id, paymentStatus: order.paymentStatus, status: order.status });
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;

  const productIds = input.items.map((i) => i.productId);
  const products = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Price every line on the server from the chosen size/colour; never trust client prices.
  const lines: { product: Product; quantity: number; price: number; variant: string | null; sku: string | null; imageUrl: string | null }[] = [];
  const qtyByProduct = new Map<number, number>();
  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product || !product.isActive) {
      res
        .status(400)
        .json({ error: `Товар #${item.productId} недоступний` });
      return;
    }
    const size = pickOption(product.sizes, item.size);
    const color = pickOption(product.colors, item.color);
    if (size === undefined || color === undefined) {
      res
        .status(400)
        .json({ error: `Оберіть розмір і колір для «${product.name}»` });
      return;
    }
    const price =
      Number(product.price) + (size?.priceDelta ?? 0) + (color?.priceDelta ?? 0);
    const variant = [size?.name, color?.name].filter(Boolean).join(" · ") || null;
    // The chosen colour's own photo, if it has one, is what the buyer saw.
    const imageUrl = color?.imageUrl || product.imageUrl;
    // Variant codes say exactly what to pick from the shelf; fall back to the product's own code.
    const sku = [size?.sku, color?.sku].filter(Boolean).join(" + ") || product.sku || null;
    lines.push({ product, quantity: item.quantity, price: Math.max(0, price), variant, sku, imageUrl });
    qtyByProduct.set(product.id, (qtyByProduct.get(product.id) ?? 0) + item.quantity);
  }

  for (const [id, qty] of qtyByProduct) {
    const product = productMap.get(id)!;
    if (product.stock < qty) {
      res
        .status(400)
        .json({ error: `Недостатньо на складі: «${product.name}»` });
      return;
    }
  }

  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  const { minOrderTotal } = await getSettings();
  if (total < minOrderTotal) {
    res
      .status(400)
      .json({ error: `Мінімальна сума замовлення — ${minOrderTotal} грн` });
    return;
  }

  // Card via LiqPay (default) or bank details that the manager sends in a messenger.
  const paymentMethod = input.paymentMethod ?? "liqpay";
  if (paymentMethod === "liqpay" && (!process.env.LIQPAY_PUBLIC_KEY || !process.env.LIQPAY_PRIVATE_KEY)) {
    // Refuse up front rather than leave an unpayable order.
    res.status(503).json({ error: "Онлайн-оплата тимчасово недоступна. Оберіть оплату за реквізитами." });
    return;
  }

  const customer = await getCustomer(req);

  // High-entropy customer token used only for polling payment status (no PII exposed)
  const customerToken = crypto.randomUUID();

  const order = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(ordersTable)
      .values({
        customerId: customer?.id ?? null,
        customerName: [input.lastName, input.firstName, input.middleName]
          .map((s) => s?.trim())
          .filter(Boolean)
          .join(" "),
        lastName: input.lastName.trim(),
        firstName: input.firstName.trim(),
        middleName: input.middleName?.trim() || null,
        email: input.email.trim(),
        phone: input.phone,
        contactMethod: input.contactMethod,
        comment: input.comment ?? null,
        city: input.city ?? null,
        novaPoshtaBranch: input.novaPoshtaBranch ?? null,
        npCityRef: input.npCityRef ?? null,
        npWarehouseRef: input.npWarehouseRef ?? null,
        status: "new",
        total: total.toFixed(2),
        paymentMethod,
        paymentStatus: "pending",
        customerToken,
      })
      .returning();

    for (const line of lines) {
      await tx.insert(orderItemsTable).values({
        orderId: created!.id,
        productId: line.product.id,
        productName: line.product.name,
        variant: line.variant,
        sku: line.sku,
        price: line.price.toFixed(2),
        quantity: line.quantity,
        imageUrl: line.imageUrl,
      });
    }
    for (const [id, qty] of qtyByProduct) {
      await tx
        .update(productsTable)
        .set({ stock: sql`${productsTable.stock} - ${qty}` })
        .where(eq(productsTable.id, id));
    }

    return created!;
  });

  if (customer) {
    await rememberFromOrder(
      customer,
      { ...input, branch: input.novaPoshtaBranch },
      input.saveAsDefault === true,
    );
  }

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, order.id));
  res.status(201).json(CreateOrderResponse.parse(serializeOrder(order, items)));
});

router.get("/orders/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, order.id));
  res.json(GetOrderResponse.parse(serializeOrder(order, items)));
});

router.patch("/orders/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const allowedStatuses = [
    "new",
    "confirmed",
    "shipped",
    "completed",
    "cancelled",
  ];
  if (parsed.data.status && !allowedStatuses.includes(parsed.data.status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const allowedPaymentStatuses = ["pending", "paid", "failed"];
  if (
    (parsed.data as { paymentStatus?: string }).paymentStatus &&
    !allowedPaymentStatuses.includes(
      (parsed.data as { paymentStatus?: string }).paymentStatus!,
    )
  ) {
    res.status(400).json({ error: "Invalid paymentStatus" });
    return;
  }
  const { ttn: rawTtn, ...changes } = parsed.data;
  const set: Partial<Order> = changes;
  if (rawTtn !== undefined) {
    // "20 4500 1234 5678" → digits; a new waybill drops the old tracking.
    const ttn = (rawTtn ?? "").replace(/[\s-]/g, "");
    if (ttn && !/^\d{10,20}$/.test(ttn)) {
      res.status(400).json({ error: "Номер ТТН має містити 10–20 цифр" });
      return;
    }
    set.ttn = ttn || null;
    set.npTracking = null;
  }
  let [updated] = await db
    .update(ordersTable)
    .set(set)
    .where(eq(ordersTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (set.ttn) {
    try {
      updated = (await refreshTracking([updated])).get(updated.id) ?? updated;
    } catch (err) {
      req.log.warn({ err }, "Nova Poshta tracking failed");
    }
  }
  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, updated.id));
  res.json(UpdateOrderResponse.parse(serializeOrder(updated, items)));
});

router.post("/orders/:id/track", requireAdmin, async (req, res): Promise<void> => {
  const params = TrackOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (!order.ttn) {
    res.status(400).json({ error: "У замовлення немає ТТН" });
    return;
  }
  let fresh: Order;
  try {
    fresh = (await refreshTracking([order])).get(order.id) ?? order;
  } catch (err) {
    req.log.warn({ err }, "Nova Poshta tracking failed");
    res.status(502).json({ error: "Нова Пошта не відповідає, спробуйте пізніше" });
    return;
  }
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  res.json(TrackOrderResponse.parse(serializeOrder(fresh, items)));
});

export default router;

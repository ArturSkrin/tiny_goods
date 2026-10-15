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
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/adminAuth";

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
    createdAt: order.createdAt.toISOString(),
    items: items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      variant: i.variant,
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

router.get("/orders", requireAdmin, async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const orders = await db
    .select()
    .from(ordersTable)
    .where(
      query.data.status ? eq(ordersTable.status, query.data.status) : undefined,
    )
    .orderBy(desc(ordersTable.createdAt));
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
  const lines: { product: Product; quantity: number; price: number; variant: string | null; imageUrl: string | null }[] = [];
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
    lines.push({ product, quantity: item.quantity, price: Math.max(0, price), variant, imageUrl });
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

  // The shop takes online payment only; refuse up front rather than leave an unpayable order.
  if (!process.env.LIQPAY_PUBLIC_KEY || !process.env.LIQPAY_PRIVATE_KEY) {
    res.status(503).json({ error: "Онлайн-оплата тимчасово недоступна. Спробуйте пізніше." });
    return;
  }
  const paymentMethod = "liqpay";

  // High-entropy customer token used only for polling payment status (no PII exposed)
  const customerToken = crypto.randomUUID();

  const order = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(ordersTable)
      .values({
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
  const [updated] = await db
    .update(ordersTable)
    .set(parsed.data)
    .where(eq(ordersTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, updated.id));
  res.json(UpdateOrderResponse.parse(serializeOrder(updated, items)));
});

export default router;

import { Router, type IRouter } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  productsTable,
  type Order,
  type OrderItem,
} from "@workspace/db";
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

const MIN_ORDER_TOTAL = 300;

export function serializeOrder(order: Order, items: OrderItem[]) {
  return {
    id: order.id,
    customerName: order.customerName,
    phone: order.phone,
    contactMethod: order.contactMethod,
    comment: order.comment,
    city: order.city,
    novaPoshtaBranch: order.novaPoshtaBranch,
    status: order.status,
    total: Number(order.total),
    createdAt: order.createdAt.toISOString(),
    items: items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
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

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product || !product.isActive) {
      res
        .status(400)
        .json({ error: `Product ${item.productId} is not available` });
      return;
    }
    if (product.stock < item.quantity) {
      res
        .status(400)
        .json({ error: `Not enough stock for "${product.name}"` });
      return;
    }
  }

  const total = input.items.reduce((sum, item) => {
    const product = productMap.get(item.productId)!;
    return sum + Number(product.price) * item.quantity;
  }, 0);

  if (total < MIN_ORDER_TOTAL) {
    res
      .status(400)
      .json({ error: `Minimum order total is ${MIN_ORDER_TOTAL} UAH` });
    return;
  }

  const order = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(ordersTable)
      .values({
        customerName: input.customerName,
        phone: input.phone,
        contactMethod: input.contactMethod,
        comment: input.comment ?? null,
        city: input.city ?? null,
        novaPoshtaBranch: input.novaPoshtaBranch ?? null,
        status: "new",
        total: total.toFixed(2),
      })
      .returning();

    for (const item of input.items) {
      const product = productMap.get(item.productId)!;
      await tx.insert(orderItemsTable).values({
        orderId: created!.id,
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
        imageUrl: product.imageUrl,
      });
      await tx
        .update(productsTable)
        .set({ stock: product.stock - item.quantity })
        .where(eq(productsTable.id, product.id));
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

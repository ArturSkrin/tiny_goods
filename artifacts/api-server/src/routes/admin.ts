import { Router, type IRouter } from "express";
import { desc, eq, inArray, lt, sql, and, ne } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  productsTable,
} from "@workspace/db";
import { GetAdminStatsResponse } from "@workspace/api-zod";
import { serializeOrder } from "./orders";

const router: IRouter = Router();

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [productCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${productsTable.isActive})::int`,
      lowStock: sql<number>`count(*) filter (where ${productsTable.stock} < 5 and ${productsTable.isActive})::int`,
    })
    .from(productsTable);

  const [orderCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      newCount: sql<number>`count(*) filter (where ${ordersTable.status} = 'new')::int`,
      revenue: sql<number>`coalesce(sum(${ordersTable.total}) filter (where ${ordersTable.status} != 'cancelled'), 0)::float`,
    })
    .from(ordersTable);

  const ordersByStatus = await db
    .select({
      status: ordersTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  const recentOrders = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);

  const recentIds = recentOrders.map((o) => o.id);
  const items = recentIds.length
    ? await db
        .select()
        .from(orderItemsTable)
        .where(inArray(orderItemsTable.orderId, recentIds))
    : [];

  const topProducts = await db
    .select({
      productId: orderItemsTable.productId,
      productName: sql<string>`max(${orderItemsTable.productName})`,
      unitsSold: sql<number>`sum(${orderItemsTable.quantity})::int`,
      revenue: sql<number>`sum(${orderItemsTable.price} * ${orderItemsTable.quantity})::float`,
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(ne(ordersTable.status, "cancelled"))
    .groupBy(orderItemsTable.productId)
    .orderBy(desc(sql`sum(${orderItemsTable.quantity})`))
    .limit(5);

  res.json(
    GetAdminStatsResponse.parse({
      totalProducts: productCounts?.total ?? 0,
      activeProducts: productCounts?.active ?? 0,
      lowStockProducts: productCounts?.lowStock ?? 0,
      totalOrders: orderCounts?.total ?? 0,
      newOrders: orderCounts?.newCount ?? 0,
      totalRevenue: orderCounts?.revenue ?? 0,
      ordersByStatus,
      recentOrders: recentOrders.map((o) =>
        serializeOrder(
          o,
          items.filter((i) => i.orderId === o.id),
        ),
      ),
      topProducts,
    }),
  );
});

export default router;

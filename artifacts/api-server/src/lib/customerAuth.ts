import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import {
  db,
  customersTable,
  customerAddressesTable,
  ordersTable,
  type Customer,
  type CustomerAddress,
} from "@workspace/db";

const COOKIE = "tg_session";
const TTL_MS = 180 * 24 * 60 * 60 * 1000; // buyers stay signed in for ~6 months

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET must be set");
  return s;
}

export const hmac = (payload: string) => crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

export function safeEqual(a: string, b: string): boolean {
  return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function setCustomerCookie(res: Response, c: Customer): void {
  const payload = `cust.${c.id}.${c.tokenVersion}.${Date.now() + TTL_MS}`;
  res.cookie(COOKIE, `${payload}.${hmac(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TTL_MS,
    path: "/",
  });
}

export function clearCustomerCookie(res: Response): void {
  res.clearCookie(COOKIE, { path: "/" });
}

/** Signed-in customer for this request, or null. */
export async function getCustomer(req: Request): Promise<Customer | null> {
  const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE];
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  const payload = token.slice(0, dot);
  if (dot <= 0 || !safeEqual(token.slice(dot + 1), hmac(payload))) return null;
  const [kind, id, version, exp] = payload.split(".");
  if (kind !== "cust" || Date.now() >= Number(exp)) return null;
  const [c] = await db.select().from(customersTable).where(eq(customersTable.id, Number(id)));
  return c && c.tokenVersion === Number(version) ? c : null;
}

export function requireCustomer(req: Request, res: Response, next: NextFunction): void {
  getCustomer(req)
    .then((c) => {
      if (!c) {
        res.status(401).json({ error: "Увійдіть в акаунт" });
        return;
      }
      res.locals.customer = c;
      next();
    })
    .catch(next);
}

/** Guest orders placed with this (verified) email become part of the account's history. */
export async function linkGuestOrders(c: Customer): Promise<void> {
  if (!c.email) return;
  await db
    .update(ordersTable)
    .set({ customerId: c.id })
    .where(and(isNull(ordersTable.customerId), sql`lower(${ordersTable.email}) = ${c.email}`));
}

export const serializeAddress = (a: CustomerAddress) => ({
  id: a.id,
  city: a.city,
  npCityRef: a.npCityRef,
  branch: a.branch,
  npWarehouseRef: a.npWarehouseRef,
  isDefault: a.isDefault,
});

export async function meResponse(c: Customer | null) {
  if (!c) return { customer: null, defaultAddress: null };
  const [addr] = await db
    .select()
    .from(customerAddressesTable)
    .where(eq(customerAddressesTable.customerId, c.id))
    .orderBy(desc(customerAddressesTable.isDefault), desc(customerAddressesTable.createdAt))
    .limit(1);
  return {
    customer: {
      id: c.id,
      email: c.email,
      lastName: c.lastName,
      firstName: c.firstName,
      middleName: c.middleName,
      phone: c.phone,
      contactMethod: c.contactMethod,
      hasGoogle: !!c.googleSub,
      hasTelegram: !!c.telegramId,
    },
    defaultAddress: addr ? serializeAddress(addr) : null,
  };
}

/**
 * Store contacts and the delivery address from an order as the customer's defaults.
 * `force` = the buyer ticked "save as default"; otherwise only empty profiles are filled.
 */
export async function rememberFromOrder(
  c: Customer,
  o: { lastName: string; firstName: string; middleName?: string | null; phone: string; contactMethod: string; city?: string | null; npCityRef?: string | null; branch?: string | null; npWarehouseRef?: string | null },
  force: boolean,
): Promise<void> {
  if (force || !c.phone) {
    await db
      .update(customersTable)
      .set({ lastName: o.lastName, firstName: o.firstName, middleName: o.middleName ?? null, phone: o.phone, contactMethod: o.contactMethod })
      .where(eq(customersTable.id, c.id));
  }
  if (!o.npCityRef || !o.npWarehouseRef || !o.city || !o.branch) return;
  const existing = await db.select().from(customerAddressesTable).where(eq(customerAddressesTable.customerId, c.id));
  if (!force && existing.length > 0) return;
  await db.transaction(async (tx) => {
    await tx.update(customerAddressesTable).set({ isDefault: false }).where(eq(customerAddressesTable.customerId, c.id));
    const same = existing.find((a) => a.npWarehouseRef === o.npWarehouseRef);
    if (same) {
      await tx.update(customerAddressesTable).set({ isDefault: true }).where(eq(customerAddressesTable.id, same.id));
    } else {
      await tx.insert(customerAddressesTable).values({
        customerId: c.id,
        city: o.city!,
        npCityRef: o.npCityRef!,
        branch: o.branch!,
        npWarehouseRef: o.npWarehouseRef!,
        isDefault: true,
      });
    }
  });
}

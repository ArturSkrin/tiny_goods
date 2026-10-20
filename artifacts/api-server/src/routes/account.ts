import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import {
  db,
  customersTable,
  customerAddressesTable,
  customerViewedTable,
  loginCodesTable,
  ordersTable,
  orderItemsTable,
  productsTable,
  type Customer,
} from "@workspace/db";
import {
  StartEmailLoginBody,
  VerifyEmailLoginBody,
  TelegramLoginBody,
  UpdateMeBody,
  AddMyAddressBody,
  SetMyDefaultAddressParams,
  DeleteMyAddressParams,
  AddMyViewedBody,
} from "@workspace/api-zod";
import {
  hmac,
  safeEqual,
  getCustomer,
  requireCustomer,
  setCustomerCookie,
  clearCustomerCookie,
  linkGuestOrders,
  meResponse,
  serializeAddress,
} from "../lib/customerAuth";
import { sendLoginCode, emailLoginEnabled } from "../lib/mail";
import { serializeOrder } from "./orders";
import { serializeProduct } from "./products";

const router: IRouter = Router();

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const publicUrl = () => (process.env.PUBLIC_URL ?? "").replace(/\/+$/, "");
const me = (res: Response) => res.locals.customer as Customer;

async function signIn(res: Response, c: Customer) {
  await linkGuestOrders(c);
  setCustomerCookie(res, c);
}

router.get("/auth/config", (_req, res): void => {
  res.json({
    email: emailLoginEnabled(),
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    telegramBot: process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_USERNAME ?? null : null,
  });
});

/* ── Email: one-time code ─────────────────────────────────────────────── */

const codeHash = (email: string, code: string) => hmac(`login:${email}:${code}`);

router.post("/auth/email/start", async (req, res): Promise<void> => {
  const parsed = StartEmailLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Введіть коректний email" });
    return;
  }
  if (!emailLoginEnabled()) {
    res.status(503).json({ error: "Вхід через email тимчасово недоступний" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const [recent] = await db
    .select({ n: sql<number>`count(*)::int`, last: sql<Date | null>`max(${loginCodesTable.createdAt})` })
    .from(loginCodesTable)
    .where(and(eq(loginCodesTable.email, email), gt(loginCodesTable.createdAt, new Date(Date.now() - 3600_000))));
  if (recent && recent.last && Date.now() - new Date(recent.last).getTime() < 60_000) {
    res.status(429).json({ error: "Код уже надіслано. Повторити можна за хвилину." });
    return;
  }
  if ((recent?.n ?? 0) >= 5) {
    res.status(429).json({ error: "Забагато спроб. Спробуйте пізніше." });
    return;
  }
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(loginCodesTable).values({ email, codeHash: codeHash(email, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) });
  try {
    await sendLoginCode(email, code, req);
  } catch (err) {
    req.log.error({ err }, "Login code email failed");
    res.status(502).json({ error: "Не вдалося надіслати лист. Спробуйте ще раз." });
    return;
  }
  res.json({ ok: true });
});

router.post("/auth/email/verify", async (req, res): Promise<void> => {
  const parsed = VerifyEmailLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Введіть 6-значний код" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const [row] = await db
    .select()
    .from(loginCodesTable)
    .where(and(eq(loginCodesTable.email, email), gt(loginCodesTable.expiresAt, new Date())))
    .orderBy(desc(loginCodesTable.createdAt))
    .limit(1);
  if (!row || row.attempts >= MAX_ATTEMPTS) {
    res.status(400).json({ error: "Код недійсний або застарів. Надішліть новий." });
    return;
  }
  if (!safeEqual(row.codeHash, codeHash(email, parsed.data.code))) {
    await db.update(loginCodesTable).set({ attempts: row.attempts + 1 }).where(eq(loginCodesTable.id, row.id));
    res.status(400).json({ error: "Невірний код" });
    return;
  }
  await db.delete(loginCodesTable).where(eq(loginCodesTable.email, email));
  const [c] = await db
    .insert(customersTable)
    .values({ email })
    .onConflictDoUpdate({ target: customersTable.email, set: { email } })
    .returning();
  await signIn(res, c!);
  res.json(await meResponse(c!));
});

/* ── Google OAuth (browser redirects, not part of the JSON API) ───────── */

router.get("/auth/google", (_req, res): void => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.redirect("/account?login_error=google");
    return;
  }
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("tg_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600_000, path: "/" });
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${publicUrl()}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
});

router.get("/auth/google/callback", async (req: Request, res): Promise<void> => {
  const fail = () => res.redirect("/account?login_error=google");
  const state = (req as Request & { cookies?: Record<string, string> }).cookies?.tg_oauth_state;
  res.clearCookie("tg_oauth_state", { path: "/" });
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!code || !state || req.query.state !== state) return fail();
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${publicUrl()}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const { id_token } = (await tokenRes.json()) as { id_token?: string };
    if (!id_token) return fail();
    // Received directly from Google's token endpoint over TLS, so the claims can be trusted without JWKS.
    const claims = JSON.parse(Buffer.from(id_token.split(".")[1]!, "base64url").toString()) as {
      sub: string; email?: string; email_verified?: boolean; aud: string; iss: string; exp: number; given_name?: string; family_name?: string;
    };
    if (claims.aud !== process.env.GOOGLE_CLIENT_ID || !["accounts.google.com", "https://accounts.google.com"].includes(claims.iss) || claims.exp * 1000 < Date.now()) {
      return fail();
    }
    const email = claims.email_verified ? claims.email?.toLowerCase() : undefined;
    let [c] = await db.select().from(customersTable).where(eq(customersTable.googleSub, claims.sub));
    if (!c && email) [c] = await db.select().from(customersTable).where(eq(customersTable.email, email));
    if (c) {
      [c] = await db.update(customersTable).set({ googleSub: claims.sub, email: c.email ?? email ?? null }).where(eq(customersTable.id, c.id)).returning();
    } else {
      [c] = await db
        .insert(customersTable)
        .values({ googleSub: claims.sub, email: email ?? null, firstName: claims.given_name ?? null, lastName: claims.family_name ?? null })
        .returning();
    }
    await signIn(res, c!);
    res.redirect("/account");
  } catch (err) {
    req.log.error({ err }, "Google sign-in failed");
    fail();
  }
});

/* ── Telegram Login Widget ────────────────────────────────────────────── */

router.post("/auth/telegram", async (req, res): Promise<void> => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const parsed = TelegramLoginBody.safeParse(req.body);
  if (!token || !parsed.success) {
    res.status(400).json({ error: "Не вдалося увійти через Telegram" });
    return;
  }
  const { hash, ...fields } = req.body as Record<string, string | number>;
  // https://core.telegram.org/widgets/login#checking-authorization
  const check = Object.keys(fields)
    .filter((k) => fields[k] !== undefined && fields[k] !== null)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const key = crypto.createHash("sha256").update(token).digest();
  const expected = crypto.createHmac("sha256", key).update(check).digest("hex");
  if (!safeEqual(expected, String(hash)) || Date.now() / 1000 - parsed.data.auth_date > 86_400) {
    res.status(401).json({ error: "Підпис Telegram недійсний" });
    return;
  }
  const telegramId = String(parsed.data.id);
  let [c] = await db.select().from(customersTable).where(eq(customersTable.telegramId, telegramId));
  if (!c) {
    [c] = await db
      .insert(customersTable)
      .values({ telegramId, firstName: parsed.data.first_name ?? null, lastName: parsed.data.last_name ?? null, contactMethod: "telegram" })
      .returning();
  }
  await signIn(res, c!);
  res.json(await meResponse(c!));
});

router.post("/auth/logout", (_req, res): void => {
  clearCustomerCookie(res);
  res.json({ ok: true });
});

/* ── Profile ──────────────────────────────────────────────────────────── */

router.get("/me", async (req, res): Promise<void> => {
  res.json(await meResponse(await getCustomer(req)));
});

router.patch("/me", requireCustomer, async (req, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [c] = await db.update(customersTable).set(parsed.data).where(eq(customersTable.id, me(res).id)).returning();
  res.json(await meResponse(c!));
});

router.delete("/me", requireCustomer, async (_req, res): Promise<void> => {
  // Orders stay for the shop's records; their customer link is cleared by ON DELETE SET NULL.
  await db.delete(customersTable).where(eq(customersTable.id, me(res).id));
  clearCustomerCookie(res);
  res.json({ ok: true });
});

/* ── Addresses ────────────────────────────────────────────────────────── */

const myAddresses = (id: number) =>
  db.select().from(customerAddressesTable).where(eq(customerAddressesTable.customerId, id))
    .orderBy(desc(customerAddressesTable.isDefault), desc(customerAddressesTable.createdAt));

router.get("/me/addresses", requireCustomer, async (_req, res): Promise<void> => {
  res.json((await myAddresses(me(res).id)).map(serializeAddress));
});

router.post("/me/addresses", requireCustomer, async (req, res): Promise<void> => {
  const parsed = AddMyAddressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Оберіть місто та відділення зі списку" });
    return;
  }
  const customerId = me(res).id;
  const hasAny = (await myAddresses(customerId)).length > 0;
  const isDefault = parsed.data.isDefault || !hasAny;
  const created = await db.transaction(async (tx) => {
    if (isDefault) await tx.update(customerAddressesTable).set({ isDefault: false }).where(eq(customerAddressesTable.customerId, customerId));
    const [a] = await tx.insert(customerAddressesTable).values({ ...parsed.data, customerId, isDefault }).returning();
    return a!;
  });
  res.status(201).json(serializeAddress(created));
});

router.patch("/me/addresses/:id", requireCustomer, async (req, res): Promise<void> => {
  const params = SetMyDefaultAddressParams.safeParse(req.params);
  const customerId = me(res).id;
  if (!params.success) {
    res.status(400).json({ error: "Bad id" });
    return;
  }
  const updated = await db.transaction(async (tx) => {
    const [a] = await tx.select().from(customerAddressesTable)
      .where(and(eq(customerAddressesTable.id, params.data.id), eq(customerAddressesTable.customerId, customerId)));
    if (!a) return null;
    await tx.update(customerAddressesTable).set({ isDefault: false }).where(eq(customerAddressesTable.customerId, customerId));
    const [u] = await tx.update(customerAddressesTable).set({ isDefault: true }).where(eq(customerAddressesTable.id, a.id)).returning();
    return u!;
  });
  if (!updated) {
    res.status(404).json({ error: "Адресу не знайдено" });
    return;
  }
  res.json(serializeAddress(updated));
});

router.delete("/me/addresses/:id", requireCustomer, async (req, res): Promise<void> => {
  const params = DeleteMyAddressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Bad id" });
    return;
  }
  await db.delete(customerAddressesTable)
    .where(and(eq(customerAddressesTable.id, params.data.id), eq(customerAddressesTable.customerId, me(res).id)));
  res.json({ ok: true });
});

/* ── Orders and viewed products ───────────────────────────────────────── */

router.get("/me/orders", requireCustomer, async (_req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.customerId, me(res).id)).orderBy(desc(ordersTable.createdAt));
  const items = orders.length
    ? await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orders.map((o) => o.id)))
    : [];
  res.json(orders.map((o) => serializeOrder(o, items.filter((i) => i.orderId === o.id))));
});

async function viewedProducts(customerId: number) {
  const rows = await db
    .select({ p: productsTable })
    .from(customerViewedTable)
    .innerJoin(productsTable, eq(productsTable.id, customerViewedTable.productId))
    .where(and(eq(customerViewedTable.customerId, customerId), eq(productsTable.isActive, true)))
    .orderBy(desc(customerViewedTable.viewedAt))
    .limit(20);
  return rows.map((r) => serializeProduct(r.p));
}

router.get("/me/viewed", requireCustomer, async (_req, res): Promise<void> => {
  res.json(await viewedProducts(me(res).id));
});

router.post("/me/viewed", requireCustomer, async (req, res): Promise<void> => {
  const parsed = AddMyViewedBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const customerId = me(res).id;
  const ids = [...new Set(parsed.data.productIds)];
  const existing = ids.length
    ? (await db.select({ id: productsTable.id }).from(productsTable).where(inArray(productsTable.id, ids))).map((r) => r.id)
    : [];
  const now = Date.now();
  // Newest first: the first id gets the latest timestamp.
  const values = ids.filter((id) => existing.includes(id)).map((productId, i) => ({ customerId, productId, viewedAt: new Date(now - i) }));
  if (values.length) {
    await db
      .insert(customerViewedTable)
      .values(values)
      .onConflictDoUpdate({
        target: [customerViewedTable.customerId, customerViewedTable.productId],
        set: { viewedAt: sql`greatest(${customerViewedTable.viewedAt}, excluded.viewed_at)` },
      });
  }
  res.json(await viewedProducts(customerId));
});

export default router;

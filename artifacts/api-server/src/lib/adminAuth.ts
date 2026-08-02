import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db, adminSettingsTable } from "@workspace/db";

const SESSION_COOKIE = "tg_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be set");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

function createSessionToken(tokenVersion: number): string {
  const payload = `admin.${tokenVersion}.${Date.now() + SESSION_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

/** Parses and validates the token signature/expiry; returns embedded tokenVersion or null. */
function parseSessionToken(token: string | undefined): number | null {
  if (!token) return null;
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  const parts = payload.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return null;
  const version = Number(parts[1]);
  const expiresAt = Number(parts[2]);
  if (!Number.isFinite(version) || !Number.isFinite(expiresAt)) return null;
  if (Date.now() >= expiresAt) return null;
  return version;
}

export function setSessionCookie(res: Response, tokenVersion: number): void {
  res.cookie(SESSION_COOKIE, createSessionToken(tokenVersion), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function getAdminSettings() {
  const [settings] = await db.select().from(adminSettingsTable).limit(1);
  return settings;
}

/** Session is valid only if signed, unexpired, and its version matches the current tokenVersion. */
export async function isAuthenticated(req: Request): Promise<boolean> {
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  const version = parseSessionToken(cookies?.[SESSION_COOKIE]);
  if (version === null) return false;
  const settings = await getAdminSettings();
  if (!settings) return false;
  return version === settings.tokenVersion;
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  isAuthenticated(req)
    .then((ok) => {
      if (!ok) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      next();
    })
    .catch(next);
}

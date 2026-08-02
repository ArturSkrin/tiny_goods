import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { generateSecret, generateURI, verify as verifyTotp } from "otplib";
import { eq, sql } from "drizzle-orm";
import { db, adminSettingsTable } from "@workspace/db";
import {
  GetAdminSessionResponse,
  SetupAdminBody,
  SetupAdminResponse,
  AdminLoginBody,
  AdminLoginResponse,
  TotpSetupResponse,
  TotpEnableBody,
  TotpEnableResponse,
  TotpDisableBody,
  TotpDisableResponse,
  ChangeAdminPasswordBody,
} from "@workspace/api-zod";
import {
  getAdminSettings,
  isAuthenticated,
  requireAdmin,
  setSessionCookie,
  clearSessionCookie,
} from "../lib/adminAuth";

const router: IRouter = Router();

/** Bumps tokenVersion (revoking all existing sessions) and returns the new version. */
async function bumpTokenVersion(id: number): Promise<number> {
  const [row] = await db
    .update(adminSettingsTable)
    .set({ tokenVersion: sql`${adminSettingsTable.tokenVersion} + 1` })
    .where(eq(adminSettingsTable.id, id))
    .returning({ tokenVersion: adminSettingsTable.tokenVersion });
  return row.tokenVersion;
}

router.get("/admin/session", async (req, res): Promise<void> => {
  const settings = await getAdminSettings();
  res.json(
    GetAdminSessionResponse.parse({
      authenticated: await isAuthenticated(req),
      setupRequired: !settings,
      totpEnabled: settings?.totpEnabled ?? false,
    }),
  );
});

router.post("/admin/setup", async (req, res): Promise<void> => {
  const parsed = SetupAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  // Singleton row (id = 1): onConflictDoNothing closes the concurrent-setup race.
  const inserted = await db
    .insert(adminSettingsTable)
    .values({ id: 1, passwordHash })
    .onConflictDoNothing()
    .returning({ tokenVersion: adminSettingsTable.tokenVersion });
  if (inserted.length === 0) {
    res.status(400).json({ error: "Admin is already configured" });
    return;
  }
  setSessionCookie(res, inserted[0].tokenVersion);
  res.json(
    SetupAdminResponse.parse({
      authenticated: true,
      setupRequired: false,
      totpEnabled: false,
    }),
  );
});

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const settings = await getAdminSettings();
  if (!settings) {
    res.status(401).json({ error: "Admin is not configured" });
    return;
  }
  const passwordOk = await bcrypt.compare(
    parsed.data.password,
    settings.passwordHash,
  );
  if (!passwordOk) {
    req.log.warn("Failed admin login attempt");
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (settings.totpEnabled && settings.totpSecret) {
    if (!parsed.data.totpCode) {
      res.json(AdminLoginResponse.parse({ status: "totp_required" }));
      return;
    }
    const codeOk = (
      await verifyTotp({
        token: parsed.data.totpCode,
        secret: settings.totpSecret,
      })
    ).valid;
    if (!codeOk) {
      req.log.warn("Failed admin TOTP attempt");
      res.status(401).json({ error: "Invalid code" });
      return;
    }
  }
  setSessionCookie(res, settings.tokenVersion);
  res.json(AdminLoginResponse.parse({ status: "ok" }));
});

router.post("/admin/logout", async (_req, res): Promise<void> => {
  // Revoke all sessions, not just this cookie.
  const settings = await getAdminSettings();
  if (settings) {
    await bumpTokenVersion(settings.id);
  }
  clearSessionCookie(res);
  res.sendStatus(204);
});

router.post(
  "/admin/2fa/setup",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const settings = await getAdminSettings();
    if (!settings) {
      res.status(400).json({ error: "Admin is not configured" });
      return;
    }
    if (settings.totpEnabled) {
      // Step-up protection: an active 2FA cannot be silently replaced —
      // it must first be disabled with a valid current code.
      res.status(400).json({ error: "2FA is already enabled. Disable it first." });
      return;
    }
    const secret = generateSecret();
    await db
      .update(adminSettingsTable)
      .set({ totpSecret: secret, totpEnabled: false })
      .where(eq(adminSettingsTable.id, settings.id));
    res.json(
      TotpSetupResponse.parse({
        secret,
        otpauthUrl: generateURI({
          issuer: "TinyGoods UA",
          label: "admin",
          secret,
        }),
      }),
    );
  },
);

router.post(
  "/admin/2fa/enable",
  requireAdmin,
  async (req, res): Promise<void> => {
    const parsed = TotpEnableBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const settings = await getAdminSettings();
    if (!settings?.totpSecret) {
      res.status(400).json({ error: "Run 2FA setup first" });
      return;
    }
    const ok = (
      await verifyTotp({ token: parsed.data.code, secret: settings.totpSecret })
    ).valid;
    if (!ok) {
      res.status(400).json({ error: "Invalid code" });
      return;
    }
    // Atomic against the expected secret/state.
    const updated = await db
      .update(adminSettingsTable)
      .set({ totpEnabled: true })
      .where(eq(adminSettingsTable.id, settings.id))
      .returning({ id: adminSettingsTable.id });
    if (updated.length === 0) {
      res.status(409).json({ error: "2FA state changed, retry setup" });
      return;
    }
    const version = await bumpTokenVersion(settings.id);
    setSessionCookie(res, version);
    res.json(
      TotpEnableResponse.parse({
        authenticated: true,
        setupRequired: false,
        totpEnabled: true,
      }),
    );
  },
);

router.post(
  "/admin/2fa/disable",
  requireAdmin,
  async (req, res): Promise<void> => {
    const parsed = TotpDisableBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const settings = await getAdminSettings();
    if (!settings?.totpSecret || !settings.totpEnabled) {
      res.status(400).json({ error: "2FA is not enabled" });
      return;
    }
    const ok = (
      await verifyTotp({ token: parsed.data.code, secret: settings.totpSecret })
    ).valid;
    if (!ok) {
      res.status(400).json({ error: "Invalid code" });
      return;
    }
    await db
      .update(adminSettingsTable)
      .set({ totpEnabled: false, totpSecret: null })
      .where(eq(adminSettingsTable.id, settings.id));
    const version = await bumpTokenVersion(settings.id);
    setSessionCookie(res, version);
    res.json(
      TotpDisableResponse.parse({
        authenticated: true,
        setupRequired: false,
        totpEnabled: false,
      }),
    );
  },
);

router.post(
  "/admin/password",
  requireAdmin,
  async (req, res): Promise<void> => {
    const parsed = ChangeAdminPasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const settings = await getAdminSettings();
    if (!settings) {
      res.status(400).json({ error: "Admin is not configured" });
      return;
    }
    const ok = await bcrypt.compare(
      parsed.data.currentPassword,
      settings.passwordHash,
    );
    if (!ok) {
      res.status(401).json({ error: "Wrong current password" });
      return;
    }
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await db
      .update(adminSettingsTable)
      .set({ passwordHash })
      .where(eq(adminSettingsTable.id, settings.id));
    // Revoke existing sessions but keep the current client logged in.
    const version = await bumpTokenVersion(settings.id);
    setSessionCookie(res, version);
    res.sendStatus(204);
  },
);

export default router;

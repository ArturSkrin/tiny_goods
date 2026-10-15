import { Router, type IRouter } from "express";
import { UpdateSettingsBody, UpdateSettingsResponse } from "@workspace/api-zod";
import { requireAdmin } from "../lib/adminAuth";
import { getSettings, saveSettings } from "../lib/settings";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  res.json(await getSettings());
});

router.put("/settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await saveSettings(parsed.data);
  res.json(UpdateSettingsResponse.parse(await getSettings()));
});

export default router;

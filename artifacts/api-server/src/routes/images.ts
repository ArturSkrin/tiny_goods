import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, imagesTable } from "@workspace/db";
import { UploadImageBody } from "@workspace/api-zod";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

const MAX_BYTES = 5 * 1024 * 1024;
const DATA_URL = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

router.post("/images", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UploadImageBody.safeParse(req.body);
  const match = parsed.success ? DATA_URL.exec(parsed.data.dataUrl) : null;
  if (!match) {
    res.status(400).json({ error: "Expected a base64 png/jpeg/webp/gif data URL" });
    return;
  }
  const data = Buffer.from(match[2]!, "base64");
  if (data.length > MAX_BYTES) {
    res.status(413).json({ error: "Image is larger than 5 MB" });
    return;
  }
  const [row] = await db
    .insert(imagesTable)
    .values({ mime: match[1]!, data })
    .returning({ id: imagesTable.id });
  res.status(201).json({ url: `/api/images/${row!.id}` });
});

router.get("/images/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.sendStatus(400);
    return;
  }
  const [img] = await db.select().from(imagesTable).where(eq(imagesTable.id, id));
  if (!img) {
    res.sendStatus(404);
    return;
  }
  // Images are never modified in place (a new upload gets a new id).
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.type(img.mime).send(img.data);
});

export default router;

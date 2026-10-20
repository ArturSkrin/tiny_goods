import type { Request } from "express";

/** Codes go out via Resend; AUTH_LOG_CODES=1 logs them instead (local testing only). */
export const emailLoginEnabled = () => !!process.env.RESEND_API_KEY || process.env.AUTH_LOG_CODES === "1";

export async function sendLoginCode(email: string, code: string, req: Request): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    req.log.warn({ email, code }, "AUTH_LOG_CODES: login code not emailed");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "TinyGoods UA <no-reply@skrin.pp.ua>",
      to: email,
      subject: `${code} — код для входу в TinyGoods`,
      text: `Ваш код для входу: ${code}\n\nКод діє 10 хвилин. Якщо ви не намагалися увійти, просто проігноруйте цей лист.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;color:#3d1f33">
<h2 style="margin:0 0 8px">Вхід у TinyGoods</h2>
<p style="margin:0 0 16px;color:#6d5a6a">Ваш код для входу:</p>
<div style="font-size:34px;letter-spacing:8px;font-weight:700;background:#fdf1f5;border-radius:14px;padding:16px;text-align:center;color:#c21f4f">${code}</div>
<p style="margin:16px 0 0;font-size:13px;color:#8a7787">Код діє 10 хвилин. Якщо ви не намагалися увійти, просто проігноруйте цей лист.</p>
</div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

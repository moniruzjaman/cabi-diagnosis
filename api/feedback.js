import { appendFeedback, readStore } from "./storage.js";

const SUPPORT_EMAIL = "support@krishiai.live";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const item = {
    context: body.context || "Unknown",
    rating: body.rating || 0,
    feedback: body.feedback || "",
    email: body.email || "",
    summary: body.summary || "",
    visitorId: body.visitorId || "",
    createdAt: new Date().toISOString(),
  };

  await appendFeedback(item);

  // Send email notification to support@krishiai.live (non-blocking)
  sendEmailNotification(item).catch(() => {});

  const store = await readStore();

  return res.status(200).json({
    ok: true,
    count: Array.isArray(store.feedback) ? store.feedback.length : null,
    persistence: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
      ? "supabase-rls"
      : process.env.VERCEL
        ? "temporary-instance-storage"
        : "local-file-storage"
  });
}

// Send notification email via MailChannels (free on Vercel/Cloudflare)
async function sendEmailNotification(item) {
  if (!process.env.VERCEL) return; // Only send in production

  const subject = `[উদ্ভিদ গোয়েন্দা] ${item.context} — ${getRatingLabel(item.rating)}`;

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
      <div style="background:#006028;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;">
        <h2 style="margin:0;font-size:18px;">🌿 উদ্ভিদ গোয়েন্দা — New Feedback</h2>
      </div>
      <div style="padding:20px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#6b7280;font-weight:600;width:120px;">Section</td><td style="padding:8px 0;">${item.context}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-weight:600;">Rating</td><td style="padding:8px 0;">${"⭐".repeat(item.rating)}${"☆".repeat(5 - item.rating)} (${item.rating}/5)</td></tr>
          ${item.email ? `<tr><td style="padding:8px 0;color:#6b7280;font-weight:600;">User Email</td><td style="padding:8px 0;"><a href="mailto:${item.email}">${item.email}</a></td></tr>` : ""}
          ${item.summary ? `<tr><td style="padding:8px 0;color:#6b7280;font-weight:600;">Summary</td><td style="padding:8px 0;">${item.summary}</td></tr>` : ""}
          ${item.feedback ? `<tr><td style="padding:8px 0;color:#6b7280;font-weight:600;vertical-align:top;">Feedback</td><td style="padding:8px 0;background:#f9fafb;padding:12px;border-radius:8px;">${item.feedback.replace(/\n/g, "<br>")}</td></tr>` : ""}
          <tr><td style="padding:8px 0;color:#6b7280;font-weight:600;">Time</td><td style="padding:8px 0;">${item.createdAt}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-weight:600;">Visitor</td><td style="padding:8px 0;font-family:monospace;font-size:12px;">${item.visitorId || "N/A"}</td></tr>
        </table>
      </div>
      <div style="padding:12px 20px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af;">
        উদ্ভিদ গোয়েন্দা (Plant Detective) · CABI Plantwise · DAE Bangladesh<br>
        <a href="https://cabi-diagnosis.vercel.app">cabi-diagnosis.vercel.app</a>
      </div>
    </div>
  `;

  try {
    // MailChannels — free email API on Vercel Edge
    await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: SUPPORT_EMAIL, name: "Krishi AI Support" }] }],
        from: { email: "noreply@cabi-diagnosis.vercel.app", name: "উদ্ভিদ গোয়েন্দা" },
        subject,
        content: [{ type: "text/html", value: htmlBody }],
      }),
    });
  } catch (err) {
    // Silently fail — feedback is still stored in database
    console.error("Email notification failed:", err.message);
  }
}

function getRatingLabel(rating) {
  if (rating >= 4) return "Positive";
  if (rating >= 3) return "Neutral";
  if (rating >= 1) return "Negative";
  return "No Rating";
}

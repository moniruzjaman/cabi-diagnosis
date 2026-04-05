// Live Analytics Dashboard — HTML page served at /api/dashboard
// Visit: https://cabi-diagnosis.vercel.app/api/dashboard
// Auto-refreshes every 30 seconds

import { readStore } from "./storage.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();

  // If JSON requested, return raw data
  if (req.query?.format === "json") {
    const store = await readStore();
    const visitorList = Object.entries(store.visitors || {})
      .sort((a, b) => new Date(b[1].lastSeen) - new Date(a[1].lastSeen));
    return res.status(200).json({
      totalVisits: store.totalVisits || 0,
      uniqueVisitors: store.uniqueVisitors || 0,
      sections: store.sections || {},
      recentVisitors: visitorList.slice(0, 50).map(([id, v]) => ({
        id: id.slice(0, 12) + "...",
        firstSeen: v.firstSeen,
        lastSeen: v.lastSeen,
        visits: v.visits,
      })),
      updatedAt: store.updatedAt,
      persistence: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
        ? "supabase-rls"
        : process.env.VERCEL
          ? "vercel-tmp-storage"
          : "local-file",
    });
  }

  // Otherwise serve the live dashboard HTML
  const store = await readStore();
  const data = {
    totalVisits: store.totalVisits || 0,
    uniqueVisitors: store.uniqueVisitors || 0,
    sections: store.sections || {},
    visitors: store.visitors || {},
    updatedAt: store.updatedAt,
  };

  const visitors = Object.entries(data.visitors)
    .sort((a, b) => new Date(b[1].lastSeen) - new Date(a[1].lastSeen));

  const activeVisitors = visitors.filter(
    (v) => new Date(v[1].lastSeen) > new Date(Date.now() - 5 * 60 * 1000)
  ).length;

  const todayVisitors = visitors.filter(
    (v) => new Date(v[1].lastSeen).toDateString() === new Date().toDateString()
  ).length;

  const todayVisits = visitors
    .filter((v) => new Date(v[1].lastSeen).toDateString() === new Date().toDateString())
    .reduce((sum, v) => sum + (v[1].visits || 0), 0);

  const sectionLabels = {
    home: "🏠 হোম",
    app_open: "🚀 অ্যাপ ওপেন",
    guide: "📖 CABI গাইড",
    game: "🎮 গেম হাব",
    diagnose: "🔬 নির্ণয়",
    library: "📚 ভান্ডার",
    more: "⚙️ আরও",
    apps: "🌐 অ্যাপস",
    history: "📋 ইতিহাস",
    learn: "📖 শিখুন",
  };

  const sectionRows = Object.entries(data.sections || {})
    .sort((a, b) => b[1] - a[1])
    .map(
      ([key, val]) => `
      <tr>
        <td style="padding:10px 14px;font-weight:600;">${sectionLabels[key] || key}</td>
        <td style="padding:10px 14px;text-align:right;">${val.toLocaleString()}</td>
        <td style="padding:10px 14px;text-align:right;width:80px;">${data.totalVisits > 0 ? ((val / data.totalVisits) * 100).toFixed(1) : 0}%</td>
        <td style="padding:10px 14px;width:120px;">
          <div style="background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden;">
            <div style="background:linear-gradient(90deg,#006028,#16a34a);height:100%;width:${data.totalVisits > 0 ? ((val / data.totalVisits) * 100) : 0}%;border-radius:4px;"></div>
          </div>
        </td>
      </tr>`
    )
    .join("");

  const recentRows = visitors.slice(0, 20).map(
    ([id, v]) => `
    <tr>
      <td style="padding:8px 14px;font-family:monospace;font-size:12px;color:#6b7280;">${id.slice(0, 16)}...</td>
      <td style="padding:8px 14px;text-align:center;">${v.visits}</td>
      <td style="padding:8px 14px;font-size:12px;">${new Date(v.firstSeen).toLocaleDateString("bn-BD")}</td>
      <td style="padding:8px 14px;font-size:12px;">${formatTimeAgo(v.lastSeen)}</td>
    </tr>`
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>🌿 Analytics Dashboard — উদ্ভিদ গোয়েন্দা</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#f0f2f5;color:#1a1a2e;line-height:1.6}
.header{background:linear-gradient(135deg,#006028,#004a1e);color:#fff;padding:24px;text-align:center}
.header h1{font-size:22px;margin-bottom:4px}
.header p{font-size:13px;opacity:.8}
.container{max-width:900px;margin:20px auto;padding:0 16px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px}
.stat-card{background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.06);text-align:center}
.stat-card .number{font-size:36px;font-weight:800;color:#006028;line-height:1.1}
.stat-card .label{font-size:12px;color:#6b7280;margin-top:6px;font-weight:600}
.stat-card.highlight{background:linear-gradient(135deg,#006028,#16a34a);color:#fff}
.stat-card.highlight .number{color:#fff}
.stat-card.highlight .label{color:rgba(255,255,255,.8)}
.card{background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:16px;overflow:hidden}
.card h2{font-size:16px;color:#1a1a2e;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #f0f2f5}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:10px 14px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;font-weight:700;border-bottom:1px solid #f0f2f5}
td{border-bottom:1px solid #f9fafb;font-size:13px}
tr:hover{background:#f9fafb}
.footer{text-align:center;padding:20px;font-size:11px;color:#9ca3af}
.live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-right:6px;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.refresh-note{text-align:center;margin:12px 0;font-size:12px;color:#6b7280}
</style>
</head>
<body>
<div class="header">
  <h1>🌿 উদ্ভিদ গোয়েন্দা — Live Analytics</h1>
  <p>Real-time user activity dashboard · Auto-refreshes every 30s</p>
</div>
<div class="container">
  <div class="stats">
    <div class="stat-card highlight">
      <div class="number"><span class="live-dot"></span>${activeVisitors}</div>
      <div class="label">অনলাইন (এই মুহূর্তে)</div>
    </div>
    <div class="stat-card">
      <div class="number">${data.uniqueVisitors.toLocaleString()}</div>
      <div class="label">মোট ইউজার</div>
    </div>
    <div class="stat-card">
      <div class="number">${data.totalVisits.toLocaleString()}</div>
      <div class="label">মোট ভিজিট</div>
    </div>
    <div class="stat-card">
      <div class="number">${todayVisitors}</div>
      <div class="label">আজকের ইউজার</div>
    </div>
    <div class="stat-card">
      <div class="number">${todayVisits}</div>
      <div class="label">আজকের ভিজিট</div>
    </div>
  </div>

  <div class="card">
    <h2>📊 সেকশন অনুযায়ী ব্যবহার</h2>
    <table>
      <thead><tr><th>সেকশন</th><th style="text-align:right">ভিজিট</th><th style="text-align:right">শতাংশ</th><th></th></tr></thead>
      <tbody>${sectionRows || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#9ca3af;">এখনো কোনো ডেটা নেই</td></tr>'}</tbody>
    </table>
  </div>

  <div class="card">
    <h2>👥 সাম্প্রতিক ইউজার (সর্বশেষ ২০)</h2>
    <table>
      <thead><tr><th>ভিজিটর ID</th><th style="text-align:center">ভিজিট</th><th>প্রথম দেখা</th><th>শেষ সক্রিয়</th></tr></thead>
      <tbody>${recentRows || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#9ca3af;">এখনো কোনো ইউজার নেই</td></tr>'}</tbody>
    </table>
  </div>

  <div class="refresh-note">🔄 ৩০ সেকেন্ড পর পর অটো-রিফ্রেশ · শেষ আপডেট: ${data.updatedAt ? new Date(data.updatedAt).toLocaleString("bn-BD") : "N/A"}</div>
</div>
<div class="footer">
  উদ্ভিদ গোয়েন্দা · CABI Plantwise · DAE Bangladesh<br>
  <a href="/api/dashboard?format=json" style="color:#006028;">JSON API</a> ·
  <a href="/" style="color:#006028;">অ্যাপে ফিরুন</a>
</div>
<script>
setTimeout(()=>{location.reload()},30000);
</script>
</body>
</html>`;

  function formatTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "এইমাত্র";
    if (mins < 60) return mins + " মিনিট আগে";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + " ঘণ্টা আগে";
    const days = Math.floor(hrs / 24);
    return days + " দিন আগে";
  }

  return res.status(200).setHeader("Content-Type", "text/html").send(html);
}

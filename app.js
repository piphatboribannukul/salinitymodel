// app.js — EC Forecast dashboard
// อ่านข้อมูล: Firebase (LIVE) → ถ้าไม่ได้ใช้ DEMO_DATA · แผนที่ Leaflet + ชั้นข้อมูล toggle

let DATA = null;          // {updated, stations:{name:{cur,h24,h48,hist,fc}}}
let isLive = false;
let selected = null;
let markers = {};
const $ = id => document.getElementById(id);
const fmt = v => (v == null || isNaN(v)) ? "—" : Math.round(v);

const zoneName = { east: "รับน้ำเจ้าพระยา", west: "รับน้ำแม่กลอง", src: "ต้นทาง / โรงงานผลิต" };
function colorOf(v) {
  if (v == null) return "#4d6675";
  if (v > CONFIG.ALERT_THRESHOLD) return "#ff5a5a";
  if (v > CONFIG.WARN_THRESHOLD) return "#f5b841";
  if (v > 350) return "#e8c34a";
  return "#39c98e";
}

// ───────────────────────── MAP ─────────────────────────
const map = L.map("map", { zoomControl: true, attributionControl: false })
  .setView([13.75, 100.55], 10);
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { maxZoom: 18 }).addTo(map);

// ชั้นขอบเขต
const layerService = L.geoJSON(SERVICE_AREA, {
  style: { color: "#3fb8c4", weight: 1.6, fillOpacity: 0.03, dashArray: "6,4" },
  onEachFeature: (f, l) => l.bindTooltip(f.properties.name, { className: "zonelabel", direction: "center" })
});
const layerPump = L.geoJSON(ZONES_PUMP, {
  style: () => ({ color: "#f5b841", weight: 1, fillColor: "#f5b841", fillOpacity: 0.05 }),
  onEachFeature: (f, l) => l.bindTooltip("โซนโรงสูบ " + f.properties.name, { className: "zonelabel", sticky: true })
});
const layerBranch = L.geoJSON(ZONES_BRANCH, {
  style: () => ({ color: "#b48ce8", weight: 1, fillColor: "#b48ce8", fillOpacity: 0.05, dashArray: "3,3" }),
  onEachFeature: (f, l) => l.bindTooltip("สาขา" + f.properties.name, { className: "zonelabel", sticky: true })
});
const layers = { service: layerService, pump: layerPump, branch: layerBranch };
layerService.addTo(map);

$("layerctl").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const ly = layers[b.dataset.layer];
  if (map.hasLayer(ly)) { map.removeLayer(ly); b.classList.remove("on"); }
  else { ly.addTo(map); b.classList.add("on"); }
});

// ─────────────────────── DATA LOAD ───────────────────────
async function loadData() {
  if (CONFIG.FIREBASE_URL) {
    try {
      const r = await fetch(`${CONFIG.FIREBASE_URL}/${CONFIG.FORECAST_PATH}.json`, { cache: "no-store" });
      if (r.ok) {
        const fb = await r.json();
        if (fb && Object.keys(fb).length) {
          DATA = fromFirebase(fb);
          isLive = true;
          return;
        }
      }
    } catch (e) { console.warn("Firebase ไม่พร้อม → ใช้ DEMO:", e.message); }
  }
  DATA = DEMO_DATA;
  isLive = false;
}

// แปลงโครง Firebase {station:{updated,h24,h48,...}} → โครงเดียวกับ demo
function fromFirebase(fb) {
  const stations = {};
  let updated = "";
  for (const [name, v] of Object.entries(fb)) {
    stations[name] = { cur: v.current ?? null, h24: v.h24 ?? null, h48: v.h48 ?? null,
      hist: v.hist ?? null, fc: v.fc ?? null };
    if (v.updated > updated) updated = v.updated;
  }
  return { updated, stations };
}

// ─────────────────────── RENDER ───────────────────────
function stationRows() {
  return STATIONS.map(s => {
    const d = DATA.stations[s.name] || {};
    return { ...s, cur: d.cur, h24: d.h24, h48: d.h48, hist: d.hist, fc: d.fc };
  }).filter(r => r.cur != null || r.h24 != null);
}

function renderAll() {
  const rows = stationRows();
  $("upd").textContent = (DATA.updated || "—").replace("T", " ").slice(0, 16);
  const badge = $("liveBadge");
  badge.textContent = isLive ? "LIVE" : "DEMO";
  badge.className = "livebadge " + (isLive ? "live" : "demo");
  if (isLive) $("srcNote").textContent = "โหมด LIVE: ข้อมูลสดจาก Firebase อัปเดตทุกชั่วโมงโดยระบบบน Railway";

  // stat bar
  const ups = rows.filter(r => r.h24 != null && r.cur != null && r.h24 - r.cur > 5).length;
  const warns = rows.filter(r => r.h24 > CONFIG.WARN_THRESHOLD).length;
  const alerts = rows.filter(r => r.h24 > CONFIG.ALERT_THRESHOLD).length;
  $("stTotal").textContent = rows.length;
  $("stUp").textContent = ups;
  $("stWarn").textContent = warns;
  $("stAlert").textContent = alerts;
  const bk = rows.find(r => r.name.includes("บางเขน 1 (TR1)"));
  const ms = rows.find(r => r.name.includes("สูบส่งน้ำมหาสวัสดิ์"));
  $("stBK").textContent = fmt(bk?.h24);
  $("stMS").textContent = fmt(ms?.h24);

  // markers
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};
  rows.filter(r => r.lat).forEach(r => {
    const m = L.circleMarker([r.lat, r.lon], {
      radius: r.zone === "src" ? 7 : 6, color: "#0a141d", weight: 1.5,
      fillColor: colorOf(r.h24), fillOpacity: 0.95
    }).addTo(map);
    m.bindPopup(`<b>${r.name}</b><br>ตอนนี้ ${fmt(r.cur)} → พรุ่งนี้ <b>${fmt(r.h24)}</b> µS/cm`);
    m.on("click", () => select(r.name));
    markers[r.name] = m;
  });

  renderTable();
  if (!selected) {
    const top = [...rows].sort((a, b) => (b.h24 ?? 0) - (a.h24 ?? 0))[0];
    if (top) select(top.name);
  } else select(selected);
}

let tabFilter = "all";
function renderTable() {
  const q = $("search").value.trim();
  const rows = stationRows()
    .filter(r => tabFilter === "all" || r.zone === tabFilter)
    .filter(r => !q || r.name.includes(q))
    .sort((a, b) => (b.h24 ?? b.cur ?? 0) - (a.h24 ?? a.cur ?? 0));
  const tb = $("tbody");
  tb.innerHTML = rows.map(r => {
    const dl = (r.h24 != null && r.cur != null) ? r.h24 - r.cur : null;
    const al = r.h24 > CONFIG.ALERT_THRESHOLD;
    const cls = al ? "al" : (dl > 5 ? "up" : (dl < -5 ? "dn" : ""));
    return `<div class="trow ${r.zone}${r.name === selected ? " sel" : ""}" data-nm="${r.name}">
      <span class="nm">${r.name}${al ? '<span class="badge">เกิน ' + CONFIG.ALERT_THRESHOLD + "</span>" : ""}</span>
      <span class="r cur mono">${fmt(r.cur)}</span><span class="arrow">→</span>
      <span class="r fut mono ${cls}">${fmt(r.h24)}</span>
      <span class="r h48 mono">${fmt(r.h48)}</span>
      <span class="r d mono ${al ? "al" : dl > 5 ? "up" : ""}">${dl == null ? "" : (dl > 0 ? "+" : "") + Math.round(dl)}</span>
    </div>`;
  }).join("");
}
$("tbody").addEventListener("click", e => {
  const r = e.target.closest(".trow"); if (r) select(r.dataset.nm);
});
$("tabctl").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  tabFilter = b.dataset.tab;
  document.querySelectorAll("#tabctl button").forEach(x => x.classList.toggle("on", x === b));
  renderTable();
});
$("search").addEventListener("input", renderTable);

// ─────────────────────── CHART ───────────────────────
function select(name) {
  selected = name;
  const r = stationRows().find(x => x.name === name); if (!r) return;
  document.querySelectorAll(".trow").forEach(d => d.classList.toggle("sel", d.dataset.nm === name));
  const mk = markers[name];
  if (mk) mk.openPopup();
  drawChart(r);
}

function drawChart(r) {
  $("chTitle").textContent = r.name;
  $("chZone").textContent = zoneName[r.zone] || "";
  $("nCur").textContent = fmt(r.cur);
  $("n24").textContent = fmt(r.h24);
  $("n48").textContent = fmt(r.h48);
  const dl = (r.h24 != null && r.cur != null) ? r.h24 - r.cur : null;
  const nd = $("nD");
  nd.textContent = dl == null ? "—" : (dl > 0 ? "+" : "") + Math.round(dl) + " µS/cm";
  nd.className = "mono " + (r.h24 > CONFIG.ALERT_THRESHOLD ? "al" : dl > 5 ? "up" : dl < -5 ? "dn" : "");

  const svg = $("chart");
  const hist = r.hist || [], fc = r.fc || [];
  if (!hist.length && !fc.length) {
    // LIVE โหมดแรกๆ ยังไม่มีเส้น: แสดงเฉพาะจุด cur→h24→h48
    const pts = [[0, r.cur], [24, r.h24], [48, r.h48]].filter(p => p[1] != null);
    if (pts.length < 2) { svg.innerHTML = ""; return; }
    drawSeries(svg, [], pts.map(p => p[1]), 3);
    return;
  }
  drawSeries(svg, hist, fc);
}

function drawSeries(svg, hist, fc, futStep = 1) {
  const W = 520, H = 230, pad = 10;
  const all = [...hist.filter(v => v != null), ...fc.filter(v => v != null)];
  if (!all.length) { svg.innerHTML = ""; return; }
  const mn = Math.min(...all) * 0.96, mx = Math.max(...all) * 1.04 + 1;
  const total = hist.length + fc.length * futStep;
  const sx = i => pad + i / Math.max(total - 1, 1) * (W - 2 * pad);
  const sy = v => H - pad - (v - mn) / (mx - mn) * (H - 2 * pad);
  let hp = "";
  hist.forEach((v, i) => { if (v != null) hp += (hp ? "L" : "M") + sx(i).toFixed(1) + "," + sy(v).toFixed(1); });
  const j = Math.max(hist.length - 1, 0);
  const anchor = hist[j] ?? fc[0];
  let fp = "M" + sx(j).toFixed(1) + "," + sy(anchor).toFixed(1);
  fc.forEach((v, i) => { if (v != null) fp += "L" + sx(hist.length + i * futStep).toFixed(1) + "," + sy(v).toFixed(1); });
  const guides = [CONFIG.ALERT_THRESHOLD, CONFIG.WARN_THRESHOLD].filter(g => g >= mn && g <= mx).map(g =>
    `<line x1="${pad}" y1="${sy(g).toFixed(1)}" x2="${W - pad}" y2="${sy(g).toFixed(1)}"
      stroke="${g >= CONFIG.ALERT_THRESHOLD ? "#ff5a5a" : "#f5b841"}" stroke-width="1" stroke-dasharray="2,4" opacity=".5"/>
     <text x="${W - pad}" y="${(sy(g) - 3).toFixed(1)}" fill="${g >= CONFIG.ALERT_THRESHOLD ? "#ff5a5a" : "#f5b841"}"
      font-size="9" text-anchor="end" font-family="monospace" opacity=".85">${g}</text>`).join("");
  const nowX = sx(j).toFixed(1);
  svg.innerHTML = `${guides}
    <line x1="${nowX}" y1="${pad}" x2="${nowX}" y2="${H - pad}" stroke="#4d6675" stroke-width="1" stroke-dasharray="3,3"/>
    <text x="${nowX}" y="${H - 1}" fill="#7d99a8" font-size="9" text-anchor="middle">ตอนนี้</text>
    <path d="${hp}" fill="none" stroke="#dcebf2" stroke-width="2"/>
    <path d="${fp}" fill="none" stroke="#f5b841" stroke-width="2" stroke-dasharray="4,3"/>`;
}

// ─────────────────────── BOOT ───────────────────────
(async function boot() {
  await loadData();
  renderAll();
  setInterval(async () => { await loadData(); renderAll(); }, CONFIG.REFRESH_MINUTES * 60 * 1000);
})();

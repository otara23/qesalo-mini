// რუკა (maptab, plans/map-tab.md §2, §5; Otar's „Both" 10.11.2026, rulings Q1 b, Q2 a, Q3 b, Q4 a): one company's
// drawing from mini/functions/mini/map.ts. Two papers of one drawing: ნახაზი (this file: our own SVG, no library, no tiles,
// no network beyond the tab's request) and სატელიტი (views/map-sat.js, loaded only when its cell is pressed, M2).
// Design C „ნახაზი": a survey sheet (light) / cyanotype (dark). The sheet: 1 the title cell with the view switch (.mp-seg);
// 2 the weather band (.mp-wx): today at the site and 9 day cells - tap a day and its verdicts move onto the blocks (the
// აგრო tab's rules; nothing is judged here: map.ts marksOf takes the outlook's own verdicts per crop); 3 the sheets'
// switch (farm | yard; Tbilisi | Georgia) and the drawing (.mp-sheet): north arrow, a surveyor's scale bar, parcels,
// blocks by hatch DIRECTION (almond 45°, pomegranate 135°, cypress beds vertical; never by density), assets, planned
// things dashed with a ring, built with a check; 4 the plan legend with numbered symbols (.mp-leg); 5 a tapped
// feature's sheet; 6 the title block (only the sources on screen).
// The investor (the nursery's): map.ts sends only his rows, names in Russian / English, no code, no source, no
// provisional word - this file prints the provisional lines only when the data carries them (admin and masters).
import { t, esc, num, dt, mt, caps, gel, cut as cutT } from "../ui.js?v=f320af5.202611101900";
import { effects } from "./agro.js?v=f320af5.202611101900";

const L = (k, p) => t("map." + k, p);
const A = (k, p) => t("agro." + k, p);
const MINUS = "−";
const ok = (v) => v != null && Number.isFinite(Number(v));
const deg = (v) => (!ok(v) ? "—" : (Number(v) < -0.05 ? MINUS : "") + num(Math.abs(Number(v)), 1) + " °C");
const degR = (v) => (!ok(v) ? "—" : (Math.round(Number(v)) < 0 ? MINUS : "") + Math.abs(Math.round(Number(v))) + "°");
const wday = (s) => new Date(s + "T12:00:00Z").getUTCDay();
const hhmm = (iso) => { const x = new Date(Date.parse(iso) + 4 * 3600e3); return String(x.getUTCHours()).padStart(2, "0") + ":" + String(x.getUTCMinutes()).padStart(2, "0"); };
const lab = (s, lang) => (lang === "ka" ? mt(s) : s);   // Georgian label capitals (Mtavruli), the drawing's lettering
const RANK = { bad: 0, warn: 1, info: 2, ok: 3 };

// module state per company, kept across the live refresh and the company switch (params() sends what the function needs)
const ST = { view: {}, sheet: {}, sel: {}, day: {}, ndvi: {} };
const DATA = {};
export function params() {
  return ST.view.nursery === "sat" && ST.ndvi.nursery ? { map: { ndvi: true } } : null;
}

// ---------------- geometry: lon/lat -> sheet pixels ----------------
function projector(bbox, W, H, pad) {
  const [w, s, e, n] = bbox, lat0 = (s + n) / 2, k = Math.cos((lat0 * Math.PI) / 180);
  const X = (lon) => (lon - w) * 111320 * k, Y = (lat) => (lat - s) * 110574;
  const bw = Math.max(1, X(e)), bh = Math.max(1, Y(n));
  const sc = Math.min((W - 2 * pad) / bw, (H - 2 * pad) / bh);
  const ox = (W - bw * sc) / 2, oy = (H - bh * sc) / 2;
  return { sc, px: (c) => [ox + X(c[0]) * sc, H - (oy + Y(c[1]) * sc)] };
}
const ringsOf = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
const linesOf = (g) => (g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : []);
const f1 = (v) => Math.round(v * 10) / 10;
const pathOf = (P, g) => {
  if (g.type === "Point") return "";
  const polys = ringsOf(g).map((poly) => poly.map((r) => "M" + r.map((c) => P.px(c).map(f1).join(",")).join("L") + "Z").join("")).join("");
  return polys || linesOf(g).map((l) => "M" + l.map((c) => P.px(c).map(f1).join(",")).join("L")).join("");
};
function inRing(x, y, r) {
  let o = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) o = !o;
  }
  return o;
}
const segDist = (x, y, [ax, ay], [bx, by]) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, u = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)) : 0; return Math.hypot(x - ax - u * dx, y - ay - u * dy); };
// a label point inside a polygon (the most inner of a 14 x 14 sample - the pole of inaccessibility, roughly), its pixel
// box, or a point / the middle of a line
// vw = the sheet's [0, 0, W, H]: a polygon cut by the sheet's edge is labelled in its visible part (the sheet's edge
// counts as an edge), a line at its middle visible vertex
function anchor(P, g, vw) {
  const [vx0, vy0, vx1, vy1] = vw || [-1e9, -1e9, 1e9, 1e9];
  if (g.type === "Point") { const [x, y] = P.px(g.coordinates); return { x, y, w: 0, h: 0, room: 0 }; }
  const polys = ringsOf(g).map((poly) => poly.map((r) => r.map((c) => P.px(c))));
  if (!polys.length) {
    const l = linesOf(g)[0].map((c) => P.px(c)), vis = l.filter((p) => p[0] > vx0 + 20 && p[0] < vx1 - 20 && p[1] > vy0 + 20 && p[1] < vy1 - 20), m = (vis.length ? vis : l)[Math.floor((vis.length ? vis : l).length / 2)];
    return { x: m[0], y: m[1], w: 0, h: 0, room: 0 };
  }
  const big = polys.sort((a, b) => b[0].length - a[0].length)[0];
  const xs = big[0].map((p) => p[0]), ys = big[0].map((p) => p[1]);
  const x0 = Math.max(vx0, Math.min(...xs)), x1 = Math.min(vx1, Math.max(...xs)), y0 = Math.max(vy0, Math.min(...ys)), y1 = Math.min(vy1, Math.max(...ys));
  let best = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, room: -1 };
  for (let i = 1; i < 16; i++) for (let j = 1; j < 16; j++) {
    const x = x0 + ((x1 - x0) * i) / 16, y = y0 + ((y1 - y0) * j) / 16;
    if (!inRing(x, y, big[0]) || big.slice(1).some((h) => inRing(x, y, h))) continue;
    let d = Math.min(x - vx0, vx1 - x, y - vy0, vy1 - y);
    for (const r of big) for (let k = 0; k < r.length - 1; k++) d = Math.min(d, segDist(x, y, r[k], r[k + 1]));
    if (d > best.room) best = { x, y, room: d };
  }
  return { ...best, w: x1 - x0, h: y1 - y0 };
}

// ---------------- the sheets of a company ----------------
const SMALL = ["building", "well", "tank", "solar", "yard", "camera"];
function sheetsOf(d) {
  const out = [];
  for (const s of d.sheets || []) {
    if (!s.bbox) continue;
    out.push({ id: s.id, bbox: s.bbox, site: s.id });
    // the farm: a detail sheet around the yard, where the buildings, the tank, the wells and the planned things sit
    if (s.id === "qesalo") {
      const yardF = d.features.filter((f) => f.site === "qesalo" && SMALL.includes(f.kind) && f.kind !== "camera");
      let w = Infinity, so = Infinity, e = -Infinity, n = -Infinity;
      const walk = (c) => { if (typeof c[0] === "number") { w = Math.min(w, c[0]); e = Math.max(e, c[0]); so = Math.min(so, c[1]); n = Math.max(n, c[1]); } else c.forEach(walk); };
      yardF.forEach((f) => walk(f.geom.coordinates));
      if (Number.isFinite(w)) { const m = 0.00022; out.push({ id: "yard", bbox: [w - m, so - m, e + m, n + m], site: "qesalo" }); }
    }
  }
  return out;
}
const inBox = (f, b) => { let hit = false; const walk = (c) => { if (hit) return; if (typeof c[0] === "number") { if (c[0] >= b[0] && c[0] <= b[2] && c[1] >= b[1] && c[1] <= b[3]) hit = true; } else c.forEach(walk); }; walk(f.geom.coordinates); return hit; };

// ---------------- marks: the day's verdicts on the blocks (map.ts marksOf) ----------------
function markSvg(lv, x, y) {
  const halo = `stroke="var(--q-surface)" stroke-width="3" paint-order="stroke"`;
  if (lv === "bad") return `<rect class="mk bad" x="${f1(x - 5)}" y="${f1(y - 5)}" width="10" height="10" transform="rotate(45 ${f1(x)} ${f1(y)})" ${halo}/>`;
  if (lv === "warn") return `<path class="mk warn" d="M${f1(x)},${f1(y - 6.5)}L${f1(x + 6.5)},${f1(y + 5)}L${f1(x - 6.5)},${f1(y + 5)}Z" ${halo}/>`;
  if (lv === "info") return `<circle class="mk info" cx="${f1(x)}" cy="${f1(y)}" r="5" ${halo}/>`;
  return `<path class="mk okk" d="M${f1(x - 4.5)},${f1(y)}L${f1(x - 1)},${f1(y + 4)}L${f1(x + 5)},${f1(y - 4.5)}"/>`;
}

// a pin's status: ○ running · ▲ ends in 30 days · ✓ the works done, the care runs on · ◆ overdue · ◌ being signed
function stSvg(st, x, y) {
  const halo = `stroke="var(--q-surface)" stroke-width="2.5" paint-order="stroke"`;
  if (st === "overdue") return `<rect class="mk bad" x="${f1(x - 4.5)}" y="${f1(y - 4.5)}" width="9" height="9" transform="rotate(45 ${f1(x)} ${f1(y)})" ${halo}/>`;
  if (st === "soon") return `<path class="mk warn" d="M${f1(x)},${f1(y - 5.5)}L${f1(x + 5.5)},${f1(y + 4.5)}L${f1(x - 5.5)},${f1(y + 4.5)}Z" ${halo}/>`;
  if (st === "care") return `<path class="mk okk" d="M${f1(x - 4)},${f1(y)}L${f1(x - 1)},${f1(y + 3.5)}L${f1(x + 4.5)},${f1(y - 4)}"/>`;
  return `<circle class="mk info" cx="${f1(x)}" cy="${f1(y)}" r="4" ${halo}${st === "signing" ? ' stroke-dasharray="2 2"' : ""}/>`;
}

// ---------------- the drawing ----------------
const PAT = { almond: "h45", pomegranate: "h135", cypress: "hv" };
function plan(co, d, sh, W, H) {
  const lang = DATA[co].lang, P = projector(sh.bbox, W, H, 16), sel = ST.sel[co];
  const feats = d.features.filter((f) => f.site === sh.site && (sh.id !== "yard" || inBox(f, sh.bbox)));
  const day = ST.day[co] || (d.weather && d.weather.tonight), marks = (d.weather && d.weather.marks && d.weather.marks[day]) || {};
  const id = (k) => `mp-${k}-${co}`;
  const defs = `<defs>`
    + `<pattern id="${id("h45")}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="pb" width="6" height="6"/><line class="pl" x1="0" y1="0" x2="0" y2="6"/></pattern>`
    + `<pattern id="${id("h135")}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(135)"><rect class="pb" width="6" height="6"/><line class="pl" x1="0" y1="0" x2="0" y2="6"/></pattern>`
    + `<pattern id="${id("hv")}" width="6" height="6" patternUnits="userSpaceOnUse"><rect class="pb" width="6" height="6"/><line class="pl" x1="3" y1="0" x2="3" y2="6"/></pattern>`
    + `<pattern id="${id("hx")}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="pb" width="6" height="6"/><line class="pl" x1="0" y1="0" x2="0" y2="6"/><line class="pl" x1="0" y1="0" x2="6" y2="0"/></pattern>`
    + `<pattern id="${id("hs")}" width="4" height="4" patternUnits="userSpaceOnUse"><rect class="pb" width="4" height="4"/><line class="pl" x1="0" y1="2" x2="4" y2="2"/></pattern>`
    + `<pattern id="${id("hd")}" width="6" height="6" patternUnits="userSpaceOnUse"><rect class="pb" width="6" height="6"/><circle class="pd" cx="3" cy="3" r="1"/></pattern>`
    + `</defs>`;
  const order = ["country", "district", "river", "canal", "lease", "parcel", "servitude", "block", "yard", "road", "fence", "solar", "tank", "building", "well", "camera", "pin_site", "pin_contract"];
  // the main company: a district a care contract covers is hatched (45°), the kindergartens' districts dotted
  const hatchOf = new Map();
  for (const f of feats) if (f.kind === "pin_contract" && f.districts) for (const x of f.districts) if (hatchOf.get(x) !== "care") hatchOf.set(x, f.hatch || "care");
  const stOf = (fid) => { const pn = (d.pins || []).find((x) => x.id === fid); return pn && pn.contract ? pn.contract.status : null; };
  const taken = [];
  const byKind = (k) => feats.filter((f) => f.kind === k);
  const planned = (f) => f.status === "planned";
  let g = "", tx = "", hit = "", nums = [];
  const anchors = new Map(), boxes = [], VW = [0, 0, W, H];
  const num_ = new Map();
  for (const k of order) for (const f of byKind(k)) {
    const p = pathOf(P, f.geom), cls = `${k}${planned(f) ? " pln" : ""}${f.id === sel ? " sel" : ""}`;
    if (k === "block") g += `<path class="${cls}" d="${p}" style="fill:url(#${id(PAT[f.crop] || "hv")})" fill-rule="evenodd"/>`;
    else if (k === "district" && hatchOf.has(f.district)) g += `<path class="${cls} dh" d="${p}" style="fill:url(#${id(hatchOf.get(f.district) === "kinder" ? "hd" : "h45")})" fill-rule="evenodd"/>`;
    else if (k === "pin_site") { const [x, y] = P.px(f.geom.coordinates); g += `<rect class="${cls}" x="${f1(x - 6)}" y="${f1(y - 6)}" width="12" height="12"/>`; }
    else if (k === "pin_contract") {
      const [x, y] = P.px(f.geom.coordinates), st = stOf(f.id);
      if (!f.districts) g += `<rect class="${cls}" x="${f1(x - 4.5)}" y="${f1(y - 4.5)}" width="9" height="9"/>`;
      if (st && !f.districts) g += stSvg(st, x + 11, y - 9);
    }
    else if (k === "yard") g += `<path class="${cls}" d="${p}" style="fill:url(#${id("hx")})"/>`;
    else if (k === "solar" && !planned(f)) g += `<path class="${cls}" d="${p}" style="fill:url(#${id("hs")})"/>`;
    else if (k === "road") g += `<path class="road-o" d="${p}"/><path class="road-i" d="${p}"/>`;
    else if (k === "well") { const [x, y] = P.px(f.geom.coordinates); g += `<circle class="${cls}" cx="${f1(x)}" cy="${f1(y)}" r="5"/><circle class="wc" cx="${f1(x)}" cy="${f1(y)}" r="1.6"/>`; }
    else if (k === "camera") { const [x, y] = P.px(f.geom.coordinates); g += `<rect class="${cls}" x="${f1(x - 3.5)}" y="${f1(y - 3.5)}" width="7" height="7"/>`; }
    else g += `<path class="${cls}" d="${p}" fill-rule="evenodd"/>`;
    // planned: a ring at its middle; built with a date: a check (ink - the weather's ✓ is the green one)
    const a = anchor(P, f.geom, VW);
    const onSheet = a.x > 4 && a.x < W - 4 && a.y > 4 && a.y < H - 4;
    anchors.set(f.id, a);
    if (planned(f) && k !== "fence" && k !== "camera") g += `<circle class="ring" cx="${f1(a.x)}" cy="${f1(a.y)}" r="3.5"/>`;
    if (f.built_on && f.status === "built" && k !== "servitude") g += `<path class="bchk" d="M${f1(a.x + 6)},${f1(a.y - 3)}l2.5,3l5,-6"/>`;
    // the tap target: the shape itself (polygons) or a 22 px circle (points, lines)
    if (f.geom.type === "Point" || k === "river" || k === "canal" || k === "road" || k === "fence") hit += `<circle class="hit" data-mp-f="${esc(f.id)}" cx="${f1(a.x)}" cy="${f1(a.y)}" r="22"/>`;
    else if (k !== "parcel" && k !== "lease") hit += `<path class="hit" data-mp-f="${esc(f.id)}" d="${p}"/>`;
    // labels: the parcels, the lease, the river and the servitude by name when the name fits inside; the rest by its
    // number in the legend. On the farm sheet a block is told by its hatch (the legend) and the yard by its frame;
    // the canal, the fence and the cameras by the legend only.
    if (k === "canal" || k === "fence" || k === "camera" || k === "country") continue;
    const nm = nameOf(f, lang), lines = String(nm).split(" · "), lw = Math.max(...lines.map((s) => s.length)) * (lang === "ka" ? 6.6 : 5.8), lh = lines.length * 12;
    const named = ["parcel", "lease", "river", "servitude", "district"].includes(k) || (sh.id === "yard" && k === "block");
    if (!onSheet) continue;
    const fits = k === "river" || (a.room >= lh / 2 + 2 && a.room * 3 >= lw);
    if (named && fits) {
      const y0 = a.y - (lines.length - 1) * 6 + 4, lx = Math.max(lw / 2 + 4, Math.min(W - lw / 2 - 4, a.x));
      tx += `<text class="tx${k === "river" ? " it" : ""}" x="${f1(lx)}" y="${f1(y0)}">${lines.map((s, i) => `<tspan x="${f1(lx)}" dy="${i ? 12 : 0}">${esc(lab(s, lang))}</tspan>`).join("")}</text>`;
      boxes.push([lx - lw / 2, y0 - 10, lx + lw / 2, y0 + (lines.length - 1) * 12 + 3]);
    } else if (k !== "district" && (sh.id === "yard" ? true : k !== "block" && k !== "yard" && !SMALL.includes(k))) {
      const n = nums.length + 1; nums.push(f); num_.set(f.id, n);
      let bx = a.x + (k === "well" ? 7 : k === "pin_contract" && !f.districts ? -12 : 0), by = a.y - (k === "well" ? 7 : 0);
      while (taken.some(([tx0, ty0]) => Math.abs(tx0 - bx) < 15 && Math.abs(ty0 - by) < 15)) bx += 16;   // pins at one point side by side
      taken.push([bx, by]);
      tx += `<g class="nb${f.id === sel ? " sel" : ""}" data-mp-f="${esc(f.id)}"><rect x="${f1(bx - 7)}" y="${f1(by - 7)}" width="14" height="14"/><text x="${f1(bx)}" y="${f1(by + 3.6)}">${n}</text></g>`;
      boxes.push([bx - 7, by - 7, bx + 7, by + 7]);
    }
  }
  // the parcels and the lease are tapped where nothing smaller is
  const under = feats.filter((f) => f.kind === "parcel" || f.kind === "lease").map((f) => `<path class="hit" data-mp-f="${esc(f.id)}" d="${pathOf(P, f.geom)}" fill-rule="evenodd"/>`).join("");
  // the day's marks on the blocks: at the block's inner point, lifted above a label or a number it would cover
  let mk = "";
  for (const f of feats) {
    const m = marks[f.id]; if (!m) continue;
    const a = anchors.get(f.id) || anchor(P, f.geom, VW);
    if (a.x < 4 || a.x > W - 4 || a.y < 4 || a.y > H - 4) continue;
    let x = a.x, y = a.y;
    for (let i = 0; i < 4; i++) { const b = boxes.find((q) => x > q[0] - 8 && x < q[2] + 8 && y > q[1] - 8 && y < q[3] + 8); if (!b) break; y = b[1] - 10; }
    boxes.push([x - 7, y - 7, x + 7, y + 7]);
    mk += markSvg(m.lv, x, y);
  }
  // the farm sheet: the yard drawn small - a frame that opens the yard sheet
  let yardBox = "";
  if (sh.id === "qesalo" && sheetsOf(d).some((s) => s.id === "yard")) {
    const yb = sheetsOf(d).find((s) => s.id === "yard").bbox, [x0, y1] = P.px([yb[0], yb[1]]), [x1, y0] = P.px([yb[2], yb[3]]);
    yardBox = `<g data-mp-sheet="yard" class="yb"><rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(x1 - x0)}" height="${f1(y1 - y0)}"/><text x="${f1(x0)}" y="${f1(y0 - 4)}">${esc(lab(L("yard_go"), lang))} ›</text><rect class="hit" x="${f1(x0 - 10)}" y="${f1(y0 - 16)}" width="${f1(x1 - x0 + 20)}" height="${f1(y1 - y0 + 26)}"/></g>`;
  }
  // north arrow + the day's wind, a surveyor's scale bar
  const NA = `<g class="na" transform="translate(${W - 22},24)"><rect class="plq" x="-11" y="-18" width="22" height="42"/><path d="M0,-14L6,6L0,2L-6,6Z"/><text y="18">${esc(L("north"))}</text></g>`;
  const mpp = 1 / P.sc, nice = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
  const len = nice.find((m) => m / mpp >= 70) || nice[nice.length - 1], bw = len / mpp, sx = 14, sy = H - 14;
  const unit = (m) => (m >= 1000 ? num(m / 1000) + " " + L("km") : num(m) + " " + L("m"));
  const SB = `<g class="sb"><rect class="plq" x="${sx - 6}" y="${sy - 20}" width="${f1(bw + 40)}" height="26"/><rect class="b" x="${sx}" y="${sy - 4}" width="${f1(bw / 4)}" height="4"/><rect class="w" x="${f1(sx + bw / 4)}" y="${sy - 4}" width="${f1(bw / 4)}" height="4"/>`
    + `<rect class="b" x="${f1(sx + bw / 2)}" y="${sy - 4}" width="${f1(bw / 2)}" height="4"/><text x="${sx}" y="${sy - 7}">0</text><text x="${f1(sx + bw / 2)}" y="${sy - 7}">${esc(unit(len / 2).replace(/ .*/, ""))}</text>`
    + `<text x="${f1(sx + bw)}" y="${sy - 7}">${esc(unit(len))}</text></g>`;
  const svg = `<svg class="mp-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(L("aria", { s: L("sh_" + sh.id) }))}">${defs}`
    + `<g class="hits">${under}</g><g>${g}</g>${yardBox}<g class="hits">${hit}</g><g>${mk}</g><g>${tx}</g>${NA}${SB}</svg>`;
  return { svg, nums };
}
const nameOf = (f, lang) => (f.names && (f.names[lang] || f.names.ru || f.names.en || f.names.ka)) || "";

// ---------------- the weather band ----------------
function band(co, d) {
  const w = d.weather || {}, lang = DATA[co].lang;
  if (w.state !== "ok") return `<div class="mp-wx"><div class="empty">${esc(w.fetched_at ? A("empty", { d: dt(String(w.fetched_at).slice(0, 10)) }) : A("empty_never"))}</div></div>`;
  const t0 = w.days[0], kinds = w.kinds || [];
  // the takeaway: the agro hero's rule - the most severe effect, else what is not in sight for this person's kinds
  const eff = w.outlook ? effects({ outlook: w.outlook, today: w.today, kinds, company: d.company, investor: d.investor }) : [];
  const top = eff.find((e) => e.lv === "bad") || eff.find((e) => e.lv === "warn");
  const none = (d.company === "nursery" ? kinds : kinds.filter((k) => k === "agro_heat")).map((k) => A("none_" + k));
  const list = none.length < 2 ? none.join("") : none.slice(0, -1).join(", ") + A("and") + none[none.length - 1];
  const take = !w.outlook ? A("no_outlook") : top ? top.head : none.length ? A("all_clear", { n: Math.min(9, w.days.length), list }) : "";
  const lv = top ? top.lv : "ok";
  const day = ST.day[co] || w.tonight;
  const dayLv = (dd) => { let b = null; for (const m of Object.values((w.marks && w.marks[dd]) || {})) if (b == null || RANK[m.lv] < RANK[b]) b = m.lv; return b; };
  const cells = w.days.map((c) => {
    const m = dayLv(c.day);
    return `<button class="${c.day === day ? "on" : ""}" data-mp-day="${c.day}" aria-pressed="${c.day === day}"><b>${esc(c.day === w.today ? A("today_s") : A("dow")[wday(c.day)])}</b><span>${new Date(c.day + "T12:00:00Z").getUTCDate()}</span>`
      + `<em>${esc(degR(c.tmax))}</em><em class="lo">${esc(degR(ok(c.low) ? c.low : c.tmin))}</em><i>${m ? `<i class="dot ${m}"></i>` : "·"}</i></button>`;
  }).join("");
  return `<div class="mp-wx"><div class="mp-wh"><div class="mp-wv">${esc(degR(ok(t0.low) ? t0.low : t0.tmin))}<span>/</span>${esc(degR(t0.tmax))}</div>`
    + `<div class="mp-wm"><div class="mp-l">${esc(lab(A("hero_l", { d: dt(w.today) }), lang))}</div><div>${esc(A("rain"))} ${esc(num(t0.rain_mm ?? 0, 1))} · ${esc(L("wind_v", { v: ok(t0.wind_max) ? num(t0.wind_max) : "—" }))}</div></div></div>`
    + `<div class="mp-take">${w.outlook ? `<i class="dot ${lv}"></i>` : ""}<span>${esc(take)}</span></div>`
    + `<div class="mp-days" style="--n:${w.days.length}">${cells}</div>`
    + (!d.features.some((f) => f.crop) ? "" : `<div class="mp-cap">${esc(L("marks_on", { d: day === w.today ? A("today") : day ? A("dow_on")[wday(day)] + ", " + dt(day) : "—" }))}</div>`) + `</div>`;
}

// ---------------- the legend ----------------
function legend(co, d, sh, nums, view) {
  const lang = DATA[co].lang, feats = d.features.filter((f) => f.site === sh.site && (sh.id !== "yard" || inBox(f, sh.bbox)));
  const has = (k, fn = () => true) => feats.some((f) => f.kind === k && fn(f));
  const sw = (cls, extra = "") => `<svg class="mp-k" viewBox="0 0 22 12" aria-hidden="true">${extra || `<rect class="${cls}" x="1" y="1" width="20" height="10"/>`}</svg>`;
  const pat = (p) => `<svg class="mp-k" viewBox="0 0 22 12" aria-hidden="true"><rect x="1" y="1" width="20" height="10" fill="url(#mp-${p}-${co})" class="block"/></svg>`;
  const items = [];
  if (has("parcel")) items.push([sw("parcel"), L("leg_parcel")]);
  if (has("lease")) items.push([sw("lease"), L("leg_lease")]);
  if (has("servitude")) items.push([sw("servitude"), L("leg_serv")]);
  // on the photo the orchards are their parcels and the beds a dotted line; on the plan each crop has its hatch
  if (view === "sat") { if (has("block", (f) => f.crop === "cypress")) items.push([sw("", `<rect class="servitude" x="1" y="1" width="20" height="10"/>`), L("leg_cypress")]); }
  else {
    for (const c of ["almond", "pomegranate", "cypress"]) if (has("block", (f) => f.crop === c)) items.push([pat(PAT[c]), L("leg_" + c)]);
    if (has("yard")) items.push([pat("hx"), L("leg_yard")]);
  }
  if (has("building", (f) => f.status !== "planned")) items.push([sw("building"), L("leg_building")]);
  if (has("road")) items.push([sw("", `<path class="road-o" d="M1,6H21"/><path class="road-i" d="M1,6H21"/>`), L("leg_road")]);
  if (has("river")) items.push([sw("", `<path class="river" d="M1,6H21"/>`), L("leg_river")]);
  if (has("well")) items.push([sw("", `<circle class="well" cx="11" cy="6" r="4.5"/><circle class="wc" cx="11" cy="6" r="1.4"/>`), L("leg_well")]);
  if (feats.some((f) => f.status === "planned")) items.push([sw("", `<rect class="building pln" x="1" y="1" width="20" height="10"/><circle class="ring" cx="11" cy="6" r="3"/>`), L("leg_planned")]);
  if (feats.some((f) => f.built_on && f.status === "built")) items.push([sw("", `<path class="bchk" d="M5,6l3,3.5l7,-7"/>`), L("leg_built")]);
  if (has("district")) items.push([sw("", `<rect class="district" x="1" y="1" width="20" height="10"/>`), L("leg_district")]);
  if (feats.some((f) => f.kind === "pin_contract" && f.hatch === "care")) items.push([pat("h45"), L("leg_care")]);
  if (feats.some((f) => f.kind === "pin_contract" && f.hatch === "kinder")) items.push([pat("hd"), L("leg_kinder")]);
  if (has("pin_site")) items.push([sw("", `<rect class="pin_site" x="6" y="1" width="10" height="10"/>`), L("leg_site")]);
  if (has("pin_contract", (f) => !f.districts)) items.push([sw("", `<rect class="pin_contract" x="6.5" y="1.5" width="9" height="9"/>`), L("leg_pin")]);
  const isMain = d.company === "main", stOf = (fid) => { const pn = (d.pins || []).find((x) => x.id === fid); return pn && pn.contract ? pn.contract.status : null; };
  const marks = isMain ? `<div class="mp-lm">${["running", "soon", "care", "overdue"].map((k) => `<span><svg class="mp-k" viewBox="0 0 22 12" aria-hidden="true">${stSvg(k, 11, 6)}</svg>${esc(L("st_" + k))}</span>`).join("")}</div>` : `<div class="mp-lm"><span><i class="dot bad"></i>${esc(A("w_bad"))}</span><span><i class="dot warn"></i>${esc(A("w_warn"))}</span><span><i class="dot info"></i>${esc(A("w_info"))}</span><span><i class="dot ok"></i>${esc(L("w_cold"))}</span></div>`;
  const stWord = (f) => (isMain && stOf(f.id) ? ` <em>${esc(L("st_" + stOf(f.id)))}</em>` : f.status === "planned" ? ` <em>${esc(L("st_planned"))}</em>` : f.status === "in_progress" ? ` <em>${esc(L("st_in_progress"))}</em>` : "") + (f.region ? ` <em>${esc(L("region"))}</em>` : "");
  const numbered = nums.length ? `<ol class="mp-nl">${nums.map((f, i) => `<li data-mp-f="${esc(f.id)}" class="${f.id === ST.sel[co] ? "on" : ""}"><b>${i + 1}</b><span>${esc(nameOf(f, lang))}${stWord(f)}</span></li>`).join("")}</ol>` : "";
  // the contracts with no place (city-wide), never a guessed point
  const un = isMain && sh.site === "tbilisi" && (d.unplaced || []).length ? `<div class="mp-un"><div class="mp-l">${esc(lab(L("no_addr"), lang))}</div>${d.unplaced.map((c) => `<div class="mp-kv" data-mp-c="${esc(c.id)}"><span>${esc(cutT(c.subject, 70))}</span><b>${c.remaining != null ? esc((c.approx ? "≈ " : "") + gel(c.remaining)) : "—"}</b></div>`).join("")}</div>` : "";
  return `<div class="mp-leg"><div class="mp-l">${esc(lab(L("legend"), lang))}</div><div class="mp-li">${items.map(([s, w]) => `<span>${s}${esc(w)}</span>`).join("")}</div>${marks}${numbered}${un}</div>`;
}

// ---------------- a tapped feature's sheet ----------------
function featureSheet(co, d) {
  const id = ST.sel[co], f = id && d.features.find((x) => x.id === id);
  if (!f) return "";
  const lang = DATA[co].lang, w = d.weather || {}, day = ST.day[co] || w.tonight, m = w.marks && w.marks[day] && w.marks[day][f.id];
  const rows = [];
  const kv = (k, v) => rows.push(`<div class="mp-kv"><span>${esc(k)}</span><b>${v}</b></div>`);
  kv(L("f_kind"), esc(L("kind." + f.kind)) + (f.region ? " · " + esc(L("region")) : ""));
  const pn = (d.pins || []).find((x) => x.id === f.id), c = pn && pn.contract;
  if (c) {
    rows.push(`<div class="mp-subj">${esc(c.subject)}</div>`);
    kv(L("f_procurer"), esc(c.procurer));
    if (c.value) kv(L("f_value"), esc(gel(c.value)));
    if (c.start || c.end) kv(L("f_term"), esc((c.start ? dt(c.start) + " " + c.start.slice(0, 4) : "") + " – " + (c.end ? dt(c.end) + " " + c.end.slice(0, 4) : "")));
    if (c.remaining != null) kv(L("f_remaining"), esc((c.approx ? "≈ " : "") + gel(c.remaining)));
    kv(L("f_status"), `<svg class="mp-k" viewBox="0 0 22 12" aria-hidden="true">${stSvg(c.status, 11, 6)}</svg> ${esc(L("st_" + c.status))}`);
    if (c.care_until) kv(L("f_care"), esc(L("care_until", { d: dt(c.care_until) + " " + c.care_until.slice(0, 4) })) + "<br>" + esc(L("care." + (d.season || "autumn"))));
    if ((c.deadlines || []).length) rows.push(`<div class="mp-dl"><div class="mp-l">${esc(lab(L("f_deadlines"), lang))}</div>${c.deadlines.map((r) => `<div class="mp-kv"><span>${esc(L("dl." + r.kind))}${r.note === "text" ? " · " + esc(L("dl_text")) : ""}</span><b>${esc(r.due ? dt(r.due) + " " + r.due.slice(0, 4) : "—")}</b></div>`).join("")}</div>`);
  }
  if (f.area_m2) kv(L("f_area"), esc(f.area_m2 >= 10000 ? num(f.area_m2 / 10000, 2) + " " + L("ha") : num(f.area_m2) + " " + L("m2")));
  if (f.crop) kv(L("f_crop"), esc(A("crop." + f.crop)));
  if (f.trees) kv(L("f_trees"), esc(num(f.trees)));
  if (f.planted_year) kv(L("f_planted"), esc(String(f.planted_year)));
  if (f.status && f.kind !== "block") kv(L("f_status"), `<span class="mp-st ${f.status}">${esc(L("st_" + f.status))}</span>${f.built_on ? " · " + esc(dt(f.built_on)) : ""}`);
  if (f.irrigation) kv(L("f_irr"), esc(L("irr_" + f.irrigation)));
  // the crop's stage (the agro tab's), the day's frost margin and verdict
  const stg = f.crop && (w.stages || []).find((s) => s.crop === f.crop);
  if (stg) kv(L("f_stage"), esc(A("stage." + stg.stage)));
  if (m) {
    const verdict = m.lv === "ok" ? L("v_ok") : m.why.includes("frost") ? A("w_" + m.lv) : m.why.includes("gap") ? L("v_gap") : A("w_" + m.lv);
    const parts = [m.low != null ? deg(m.low) : null, m.t10 != null ? L("margin", { t: deg(m.t10) }) : null].filter(Boolean).join(" · ");
    kv(day === w.today ? A("today") : A("dow_on")[wday(day)] + ", " + dt(day), `<i class="dot ${m.lv}"></i> ${esc((parts ? parts + ": " : "") + verdict)}${m.why.includes("heat") ? " · " + esc(L("why_heat")) : ""}${m.why.includes("disease") ? " · " + esc(L("why_disease")) : ""}`);
  }
  // NDVI: the block's mean of the newest scene and its months (M4)
  const ser = (d.ndvi && d.ndvi.series) || [], pts = ser.map((s) => ({ day: s.day, v: s.means && s.means[f.id] })).filter((s) => ok(s.v));
  if (pts.length) {
    const last = pts[pts.length - 1], byM = new Map();
    for (const p of pts) byM.set(p.day.slice(0, 7), p.v);
    const ms = [...byM.entries()].slice(-12), bars = ms.map(([k, v]) => `<i title="${esc(k)}" style="height:${Math.max(2, Math.round(Math.max(0, Math.min(1, v)) * 26))}px"></i>`).join("");
    kv("NDVI", `${esc(num(last.v, 2))} · ${esc(dt(last.day))}<span class="mp-spark">${bars}</span>`);
  }
  let muted = "";
  if (f.provisional) muted += `<div class="mp-prov">${esc(f.status === "planned" ? L("prov_place") : f.from_photo ? L("prov_photo") : L("prov"))}</div>`;
  if (f.approx) muted += `<div class="mp-prov">${esc(L("approx"))}</div>`;
  if (f.cadastre || (f.source_keys || []).length) muted += `<div class="mp-src">${f.cadastre ? esc(L("code")) + ": " + esc(f.cadastre) : ""}${f.cadastre && (f.source_keys || []).length ? "<br>" : ""}${(f.source_keys || []).length ? esc(L("src")) + ": " + esc(f.source_keys.join("; ")) : ""}</div>`;
  return `<div class="card mp-fs"><div class="card-h"><div class="card-t">${esc(nameOf(f, lang))}</div><div class="card-n"><button class="mp-x" data-mp-f="" aria-label="${esc(L("close"))}">✕</button></div></div>${rows.join("")}${muted}</div>`;
}

// ---------------- the title block ----------------
function titleBlock(co, d, view) {
  const w = d.weather || {}, lines = [];
  if (d.company === "nursery") lines.push([L("tb_draw"), d.sources ? L("tb_draw_v_full") : L("tb_draw_v")]);
  if (d.company === "main") lines.push([L("tb_draw"), L(ST.sheet[co] === "georgia" ? "tb_draw_ge" : "tb_draw_tb")]);
  if (d.company === "main" && ST.sheet[co] === "georgia") lines.push([A("tb_src"), L("wx_georgia")]);
  if (d.company === "main" && (d.pins || []).length) lines.push([L("tb_pins"), L("tb_pins_v")]);
  if (d.sources && d.features.some((f) => f.kind === "block")) lines.push([L("tb_plant"), L("tb_plant_v")]);
  if (w.state === "ok") lines.push([A("tb_src"), A("attr") + " · " + L("tb_fc", { t: w.fetched_at ? dt(String(w.fetched_at).slice(0, 10)) + " " + hhmm(w.fetched_at) : "—" })]);
  if (view === "sat") lines.push([L("tb_ortho"), L("tb_ortho_v")]);
  if (view === "sat" && ST.ndvi[co] && d.ndvi && d.ndvi.image) lines.push(["NDVI", L("tb_ndvi_v", { y: String(d.ndvi.image.day).slice(0, 4) })]);
  if (d.features.some((f) => f.provisional)) lines.push([L("tb_prov"), L("tb_prov_v")]);
  return `<div class="mp-tb">${lines.map(([k, v]) => `<div><span>${esc(k)}</span>${esc(v)}</div>`).join("")}</div>`;
}

// ---------------- the whole sheet of one company ----------------
function render(co) {
  const { d, lang } = DATA[co];
  const sheets = sheetsOf(d);
  if (!ST.sheet[co] || !sheets.some((s) => s.id === ST.sheet[co])) ST.sheet[co] = sheets[0] ? sheets[0].id : null;
  const view = ST.view[co] || "plan";
  const title = d.company === "main" ? L("title_m") : L("title_n");
  const cell = (k, on, attr) => `<button class="${on ? "on" : ""}" ${attr} aria-pressed="${!!on}">${esc(lab(L(k), lang))}</button>`;
  const seg = `<div class="mp-seg" role="group">${cell("v_plan", view === "plan", `data-mp-view="plan"`)}${cell("v_sat", view === "sat", `data-mp-view="sat"`)}`
    + `${view === "sat" && d.company === "nursery" ? cell("v_ndvi", ST.ndvi[co], `data-mp-ndvi="1"`) : ""}</div>`;
  let s = `<div class="card mp-c"><div class="card-h"><div class="card-t">${esc(title)}</div></div>${seg}`;
  s += band(co, d);
  if (d.state !== "ok" || !sheets.length) {
    s += `<div class="empty">${esc(L("empty_feat"))}</div></div>`;
    return s + titleBlock(co, d, view);
  }
  if (sheets.length > 1) s += `<div class="mp-sh">${sheets.map((x) => `<button class="${x.id === ST.sheet[co] ? "on" : ""}" data-mp-sheet="${x.id}">${esc(lab(L("sh_" + x.id), lang))}</button>`).join("")}</div>`;
  const sh = sheets.find((x) => x.id === ST.sheet[co]);
  const W = Math.max(300, Math.min(560, (typeof window !== "undefined" ? window.innerWidth : 390) - 26));
  const H = Math.round(Math.max(300, Math.min(460, W * 0.62 * 1.25)));
  const { svg, nums } = plan(co, d, sh, W, H);
  NUMS[co] = new Map(nums.map((f, i) => [f.id, i + 1]));
  if (view === "sat") {
    s += `<div class="mp-sheet mp-sat" data-mp-satbox="${co}" style="height:${Math.round(H * 1.1) * (100 / W)}vw;max-height:${Math.round(H * 1.1)}px"></div>`
      + `<div class="mp-satnote" hidden>${esc(L("sat_fail"))}</div>` + (d.company === "nursery" ? ndviNote(d, ST.ndvi[co]) : "");
  } else s += `<div class="mp-sheet" style="height:${H * (100 / W)}vw;max-height:${H}px">${svg}</div>`;
  s += legend(co, d, sh, nums, view) + `</div>`;
  s += `<div class="mp-fsw">${featureSheet(co, d)}</div>`;
  return s + titleBlock(co, d, view);
}
const NUMS = {};

// the NDVI cell's chip and ramp legend: the scene's date and cloud cover; a cloudy month says when the last clear one was
function ndviNote(d, on) {
  if (!on) return "";
  const nd = d.ndvi || {}, im = nd.image, last = nd.last;
  if (im) return `<div class="mp-ndvi-on"><div class="mp-chip">${esc(L("ndvi_chip", { d: dt(im.day), c: num(im.cloud_pct ?? 0) }))}</div>`
    + `<div class="mp-ramp"><span>${esc(L("ndvi_lo"))}</span><div class="mp-rb"><i class="r1"></i><i class="r2"></i><i class="r3"></i><i class="r4"></i><i class="r5"></i>`
    + [0.1, 0.3, 0.5, 0.7].map((v, i) => `<b style="left:${(i + 1) * 20}%">${esc(num(v, 1))}</b>`).join("") + `</div><span>${esc(L("ndvi_hi"))}</span></div></div>`;
  return `<div class="mp-ndvi-none">${esc(last ? L("ndvi_cloudy", { d: dt(last.day) }) : L("ndvi_none"))}</div>`;
}

// the satellite paper (views/map-sat.js, loaded on the first press - never in the default path)
let SAT = null, RELOAD = null;
const satMod = () => (SAT = SAT || import(new URL("./map-sat.js" + new URL(import.meta.url).search, import.meta.url).href));
function drawSat(el, co) {
  const box = el.querySelector(`[data-mp-satbox="${co}"]`);
  if (!box || !DATA[co]) return;
  const { d, lang } = DATA[co], sh = sheetsOf(d).find((x) => x.id === ST.sheet[co]);
  const day = ST.day[co] || (d.weather && d.weather.tonight), marks = (d.weather && d.weather.marks && d.weather.marks[day]) || {};
  satMod().then((m) => m.draw(box, { co, d, sheet: sh, lang, ndvi: !!ST.ndvi[co], sel: ST.sel[co], marks, nums: NUMS[co],
    onTap: (id) => { ST.sel[co] = ST.sel[co] === id ? null : id; const w = el.querySelector(`.mp[data-mp="${co}"] .mp-fsw`); if (w) { w.innerHTML = featureSheet(co, d); caps(w); const fs = w.querySelector(".mp-fs"); if (fs) fs.scrollIntoView({ block: "nearest", behavior: "smooth" }); } } }))
    .catch(() => { const n = box.parentNode && box.parentNode.querySelector(".mp-satnote"); if (n) n.hidden = false; });
}

export default function view(d, me, _t, company) {
  css();
  const co = company || (d && d.company) || "nursery";
  if (!d || d.state === "none") return `<div class="card"><div class="card-h"><div class="card-t">${esc(L("title"))}</div></div><div class="empty">${esc(L("none"))}</div></div>`;
  DATA[co] = { d, lang: (me && me.lang) || "ka" };
  return `<div class="mp" data-mp="${co}">${render(co)}</div>`;
}

function redraw(el, co) {
  const box = el.querySelector(`.mp[data-mp="${co}"]`);
  if (!box || !DATA[co]) return;
  box.innerHTML = render(co);
  caps(box);
  if (ST.view[co] === "sat") drawSat(el, co);
}

export function mount(el, o) {
  RELOAD = (o && o.reload) || RELOAD;
  for (const box of el.querySelectorAll(".mp[data-mp]")) if (ST.view[box.dataset.mp] === "sat") drawSat(el, box.dataset.mp);
  if (el.__mpBound) return;
  el.__mpBound = true;
  el.addEventListener("click", (e) => {
    const box = e.target.closest && e.target.closest(".mp[data-mp]");
    if (!box) return;
    const co = box.dataset.mp, tg = window.Telegram && window.Telegram.WebApp;
    const hap = () => { if (tg && tg.HapticFeedback) try { tg.HapticFeedback.selectionChanged(); } catch (x) {} };
    const day = e.target.closest("[data-mp-day]"), sh = e.target.closest("[data-mp-sheet]"), f = e.target.closest("[data-mp-f]"), v = e.target.closest("[data-mp-view]");
    if (day) { ST.day[co] = day.dataset.mpDay; hap(); return redraw(el, co); }
    if (sh) { ST.sheet[co] = sh.dataset.mpSheet; hap(); return redraw(el, co); }
    const nd = e.target.closest("[data-mp-ndvi]");
    if (nd) {
      ST.ndvi[co] = !ST.ndvi[co]; hap();
      // the image comes only when asked (params() asks while the cell is pressed): the first press loads the tab again
      if (ST.ndvi[co] && !(DATA[co].d.ndvi && DATA[co].d.ndvi.image) && DATA[co].d.ndvi && DATA[co].d.ndvi.last && RELOAD) return RELOAD(params());
      return redraw(el, co);
    }
    if (v) {
      const was = ST.view[co] || "plan"; ST.view[co] = v.dataset.mpView; hap();
      if (was === "sat" && ST.view[co] !== "sat" && SAT) SAT.then((m) => m.leave(co));
      return redraw(el, co);
    }
    if (f) {
      const id = f.dataset.mpF;
      ST.sel[co] = !id || ST.sel[co] === id ? null : id; hap(); redraw(el, co);
      const fs = box.querySelector(".mp-fs");
      if (fs && ST.sel[co]) fs.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
}

function css() {
  if (typeof document === "undefined" || document.getElementById("mp-css")) return;
  const st = document.createElement("style"); st.id = "mp-css";
  st.textContent = `
.mp-l{font:600 11px/14px var(--ff);font-stretch:75%;letter-spacing:.09em;color:var(--q-muted)}
html:not([lang="ka"]) .mp-l,html:not([lang="ka"]) .mp-sh button,html:not([lang="ka"]) .mp-seg button,html:not([lang="ka"]) .mp-days b{text-transform:uppercase}
.mp-seg{display:flex;margin:0 0 10px;border:3px solid var(--q-rule);background:var(--q-surface)}.mp-seg button{flex:1 1 0}
.mp-seg button,.mp-sh button{min-height:44px;min-width:44px;padding:0 10px;border:0;border-radius:0;background:var(--q-surface);font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.06em;color:var(--q-ink);cursor:pointer}
.mp-seg button+button,.mp-sh button+button{border-left:1.5px solid var(--q-rule)}
.mp-seg button.on,.mp-sh button.on{background:var(--q-invert);color:var(--q-on-invert)}
.mp-c .card-h{align-items:center}.mp-c .card-n{white-space:normal}
.mp-wx{border:1.5px solid var(--q-rule);margin:2px 0 10px}
.mp-wh{display:flex;align-items:center;gap:12px;padding:8px 10px 4px}
.mp-wv{font:800 30px/32px var(--ff);font-stretch:62.5%;white-space:nowrap}.mp-wv span{font-weight:400;color:var(--q-muted);font-size:.62em;margin:0 3px}
.mp-wm{font-size:12.5px;line-height:17px;color:var(--q-ink-2);min-width:0}
.mp-take{display:flex;gap:8px;align-items:baseline;padding:2px 10px 8px;font:600 13px/18px var(--ff);color:var(--q-ink)}.mp-take .dot{position:relative;top:1px}
.mp-days{display:grid;grid-template-columns:repeat(var(--n,9),minmax(0,1fr));border-top:1.5px solid var(--q-rule)}
.mp-days button{display:flex;flex-direction:column;align-items:center;gap:1px;min-height:44px;padding:4px 0 3px;border:0;border-radius:0;background:var(--q-surface);color:var(--q-ink);cursor:pointer;min-width:0}
.mp-days button+button{border-left:1px solid var(--q-rule-light)}
.mp-days b{font:700 10px/12px var(--ff);font-stretch:75%;letter-spacing:.04em;color:var(--q-ink-2)}.mp-days span{font:800 14px/15px var(--ff);font-stretch:62.5%}
.mp-days em{font:700 11px/12px var(--ff);font-stretch:75%;font-style:normal}.mp-days em.lo{color:var(--q-ink-2)}
.mp-days>button>i{height:14px;display:flex;align-items:center;font-style:normal;color:var(--q-muted)}.mp-days .dot{transform:scale(.8)}.mp-days .dot.bad{transform:rotate(45deg) scale(.6)}.mp-days .dot.ok{transform:rotate(45deg) scale(.8)}
.mp-days button.on{background:var(--q-invert);color:var(--q-on-invert)}.mp-days button.on b,.mp-days button.on em.lo{color:var(--q-on-invert)}
.mp-cap{padding:5px 10px 6px;border-top:1px solid var(--q-rule-light);font-size:11.5px;line-height:15px;color:var(--q-muted)}
.mp-sh{display:flex;border:1.5px solid var(--q-rule);border-bottom:0;width:max-content;max-width:100%}
.mp-sheet{position:relative;border:1.5px solid var(--q-rule);background:var(--q-surface);overflow:hidden;min-height:300px}
.mp-svg{display:block;width:100%;height:100%}
.mp-svg .pb{fill:var(--q-viz-alt)}.mp-svg .pl{stroke:var(--q-viz-fill);stroke-width:1}
.mp-svg .parcel{fill:none;stroke:var(--q-rule);stroke-width:1.5}
.mp-svg .lease{fill:none;stroke:var(--q-ink-2);stroke-width:1.5;stroke-dasharray:6 4}
.mp-svg .servitude{fill:none;stroke:var(--q-ink-2);stroke-width:1;stroke-dasharray:2 3}
.mp-svg .block{stroke:var(--q-ink);stroke-width:.8}
.mp-svg .yard{stroke:var(--q-ink);stroke-width:1}
.mp-svg .river{fill:none;stroke:var(--q-info);stroke-width:1.5;stroke-dasharray:7 3 2 3}
.mp-svg .canal{fill:none;stroke:var(--q-info);stroke-width:1;stroke-dasharray:4 2}
.mp-svg .road-o{fill:none;stroke:var(--q-ink);stroke-width:4.5;stroke-linejoin:round}.mp-svg .road-i{fill:none;stroke:var(--q-surface);stroke-width:2;stroke-linejoin:round}
.mp-svg .fence{fill:none;stroke:var(--q-ink-2);stroke-width:1;stroke-dasharray:1 3}
.mp-svg .building{fill:var(--q-ink);stroke:var(--q-ink);stroke-width:1}
.mp-svg .tank,.mp-svg .solar{fill:var(--q-surface-2);stroke:var(--q-ink);stroke-width:1.5}
.mp-svg .well{fill:var(--q-surface);stroke:var(--q-ink);stroke-width:1.5}.mp-svg .wc{fill:var(--q-ink)}
.mp-svg .camera{fill:none;stroke:var(--q-ink);stroke-width:1.2}
.mp-svg .country{fill:var(--q-surface-2);stroke:var(--q-rule);stroke-width:1.5}.mp-svg .district{fill:none;stroke:var(--q-ink-2);stroke-width:.8}.mp-svg .district.dh{stroke:var(--q-ink);stroke-width:1.2}.mp-svg .pd{fill:var(--q-viz-fill)}
.mp-svg .pin_site{fill:var(--q-main);stroke:var(--q-ink);stroke-width:1.5}.mp-svg .pin_contract{fill:var(--q-ink);stroke:var(--q-surface);stroke-width:1.5}
.mp-svg .pln{fill:none!important;stroke:var(--q-ink);stroke-width:1.5;stroke-dasharray:4 3}
.mp-svg .ring{fill:none;stroke:var(--q-ink);stroke-width:1.2}.mp-svg .bchk{fill:none;stroke:var(--q-ink);stroke-width:2}
.mp-svg .sel{stroke:var(--q-accent)!important;stroke-width:2.5!important}
.mp-svg .hit{fill:transparent;stroke:none;cursor:pointer}
.mp-svg text{font:600 10.5px/1 var(--ff);fill:var(--q-ink);stroke:var(--q-surface);stroke-width:3px;paint-order:stroke;stroke-linejoin:round;text-anchor:middle}
.mp-svg .tx.it{font-style:italic;fill:var(--q-info)}
.mp-svg .nb rect{fill:var(--q-invert);stroke:var(--q-surface);stroke-width:1.5}.mp-svg .nb text{fill:var(--q-on-invert);stroke:none;font-weight:800;font-size:10.5px}
.mp-svg .nb{cursor:pointer}.mp-svg .nb.sel rect{fill:var(--q-accent)}
.mp-svg .yb rect{fill:none;stroke:var(--q-ink);stroke-width:1.2;stroke-dasharray:3 2}.mp-svg .yb text{text-anchor:start;font-weight:700}.mp-svg .yb{cursor:pointer}.mp-svg .yb .hit{fill:transparent;stroke:none}
.mp-svg .plq{fill:var(--q-surface);opacity:.88}.mp-svg .na path{fill:var(--q-ink)}.mp-svg .na text{font-weight:800}
.mp-svg .sb .b{fill:var(--q-ink)}.mp-svg .sb .w{fill:var(--q-surface);stroke:var(--q-ink);stroke-width:1}.mp-svg .sb text{font-size:10.5px}
.mp-svg .mk.bad{fill:var(--q-crit)}.mp-svg .mk.warn{fill:var(--q-warn)}.mp-svg .mk.info{fill:var(--q-surface);stroke:var(--q-info);stroke-width:2}.mp-svg .mk.okk{fill:none;stroke:var(--q-good);stroke-width:2.5}
.mp-leg{padding:9px 0 4px}
.mp-li{display:flex;flex-wrap:wrap;gap:5px 14px;margin-top:5px;font-size:12px;line-height:16px;color:var(--q-ink-2)}
.mp-li span{display:inline-flex;align-items:center;gap:6px}
.mp-k{width:22px;height:12px;flex:none}
.mp-k .parcel,.mp-k .lease,.mp-k .servitude,.mp-k .building,.mp-k .block{stroke-width:1.2}
.mp-k .parcel{fill:none;stroke:var(--q-rule)}.mp-k .lease{fill:none;stroke:var(--q-ink-2);stroke-dasharray:4 2}.mp-k .servitude{fill:none;stroke:var(--q-ink-2);stroke-dasharray:2 2}
.mp-k .building{fill:var(--q-ink);stroke:var(--q-ink)}.mp-k .block{stroke:var(--q-ink)}.mp-k .pln{fill:none;stroke:var(--q-ink);stroke-dasharray:3 2}
.mp-k .road-o{stroke:var(--q-ink);stroke-width:4.5}.mp-k .road-i{stroke:var(--q-surface);stroke-width:2}.mp-k .river{stroke:var(--q-info);stroke-width:1.5;stroke-dasharray:5 2}
.mp-k .district{fill:none;stroke:var(--q-ink-2);stroke-width:1}.mp-k .pin_site{fill:var(--q-main);stroke:var(--q-ink);stroke-width:1.2}.mp-k .pin_contract{fill:var(--q-ink)}
.mp-k .mk.bad{fill:var(--q-crit)}.mp-k .mk.warn{fill:var(--q-warn)}.mp-k .mk.info{fill:var(--q-surface);stroke:var(--q-info);stroke-width:1.5}.mp-k .mk.okk{fill:none;stroke:var(--q-good);stroke-width:2.2}.mp-k .pd{fill:var(--q-viz-fill)}
.mp-k .well{fill:var(--q-surface);stroke:var(--q-ink);stroke-width:1.3}.mp-k .wc{fill:var(--q-ink)}.mp-k .ring{fill:none;stroke:var(--q-ink)}.mp-k .bchk{fill:none;stroke:var(--q-ink);stroke-width:2}
.mp-lm{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px;font-size:12px;line-height:16px;color:var(--q-ink-2)}.mp-lm span{display:inline-flex;align-items:center;gap:6px}.mp-lm .dot{transform:scale(.85)}.mp-lm .dot.bad{transform:rotate(45deg) scale(.62)}.mp-lm .dot.ok{transform:rotate(45deg) scale(.85)}
.mp-nl{list-style:none;margin:8px 0 0;padding:0;border-top:1px solid var(--q-rule-light);display:grid;grid-template-columns:1fr 1fr;column-gap:12px}
.mp-nl li{display:flex;gap:8px;align-items:center;min-height:44px;min-width:0;border-bottom:1px solid var(--q-rule-light);font-size:13px;line-height:17px;cursor:pointer}
.mp-nl li b{flex:none;width:20px;height:20px;display:flex;align-items:center;justify-content:center;background:var(--q-invert);color:var(--q-on-invert);font:800 11px/1 var(--ff)}
.mp-nl li span{min-width:0;overflow-wrap:anywhere;font-size:12.5px;line-height:16px}.mp-nl li.on b{background:var(--q-accent)}.mp-nl em{font-style:normal;color:var(--q-muted);font-size:12px}
.mp-fs .mp-kv{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px solid var(--q-rule-light);font-size:13px;line-height:18px}
.mp-fs .mp-kv span{color:var(--q-muted)}.mp-fs .mp-kv b{font-weight:600;text-align:right;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.mp-fs .mp-kv .dot{transform:scale(.85)}.mp-fs .mp-kv .dot.bad{transform:rotate(45deg) scale(.62)}.mp-fs .mp-kv .dot.ok{transform:rotate(45deg) scale(.85)}
.mp-st.planned,.mp-st.in_progress{color:var(--q-warn)}.mp-st.built,.mp-st.partial{color:var(--q-good)}
.mp-spark{display:inline-flex;align-items:flex-end;gap:2px;height:26px;margin-left:8px}.mp-spark i{width:5px;background:var(--q-viz-fill)}
.mp-prov{margin-top:6px;padding:6px 8px;background:var(--q-surface-2);font-size:12.5px;line-height:17px;color:var(--q-ink-2)}
.mp-subj{padding:6px 0 8px;font-size:13px;line-height:18px;color:var(--q-ink)}.mp-dl,.mp-un{margin-top:8px}.mp-un .mp-kv{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px solid var(--q-rule-light);font-size:12.5px;line-height:17px}.mp-un .mp-kv b{white-space:nowrap;font-weight:600}
.mp-src{margin:6px 0 10px;font-size:11.5px;line-height:16px;color:var(--q-muted);word-break:break-word}
.mp-x{min-width:44px;min-height:44px;border:1.5px solid var(--q-rule);border-radius:0;background:var(--q-surface);color:var(--q-ink);font:700 14px/1 var(--ff);cursor:pointer}
.mp-tb{margin:0 12px 12px;border:1.5px solid var(--q-rule);font-size:12px;line-height:16px;color:var(--q-ink-2)}
.mp-tb div{padding:6px 8px}.mp-tb div+div{border-top:1px solid var(--q-rule-light)}
.mp-tb span{display:block;font:600 11px/14px var(--ff);font-stretch:75%;letter-spacing:.09em;color:var(--q-muted);margin-bottom:2px}
#view>.mp>.mp-tb{margin-top:12px}
`;
  document.head.appendChild(st);
}

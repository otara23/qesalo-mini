// აგრო (wave W-AGROTAB, plans/bot-v3.md §3.7, 9.11.2026; Otar's item 12, Q1 = a): the site of one company - the nursery's
// farm near Marneuli, შპს მწვანე სახლი's Tbilisi site - from mini/functions/mini/agro.ts: MET Norway's forecast per day
// (weather_daily) and, per forecast day, the verdicts of the agronomist's rules (weather_outlook, lib/agrotab/outlook.mjs
// - the same functions that raise the frost / heat / disease alerts). Every effect line here words one of those
// verdicts; nothing is judged in this file. A gap stays a gap (spray weather has no source: no verdict; a stage with no
// published critical value is named, never shown as a clear night). Attribution „ამინდი: MET Norway (CC BY 4.0)".
//
// Design C „ნახაზი": the framed sheet. 1 the title cell + today at the site (the hero: min / max, rain, wind, ET0, wet
// hours; the takeaway = the most severe effect). 2 the 9-day strip, a drawing's table: day heads; a temperature plot on
// one axis - each day a dimension line from the frost read (the lower of the 6-hour and the hourly minimum) to the
// maximum, the critical temperature of the most tender crop part that day as a hatched band (T10) with the margin above
// it (+1.7 °C), the heat threshold (T95) with each day's mean when it is near; then rows of cells - rain as a hatched
// block, wind as chevrons (Beaufort ≤ 2 / 3 / 4 / ≥ 5), wet hours, ET0 - and the day's mark (shape: ◆ urgent, ▲ watch,
// ○ early / gap, ✓ a cold night with no risk). 3 the effect lines (shape + word + the rule's numbers). 4 the stages per
// crop with the season ribbon and the ✓ / „ჯერ არა" for whom the bot asks (the bot's ph: buttons as a tab action).
// 5 water: ET0 against rain, the balance, the almond's line April-October. 6 disease weather: wet hours against the
// rules' 4 h / 12 h. 7 the weekly advisory (never the investor's). 8 the warnings sent. 9 the title block.
// Who sees which effect: the function sends only the kinds the matrix routes to the person (the investor: frost).
import { t, esc, num, dt } from "../ui.js?v=16459b0.202611101234";

const L = (k, p) => t("agro." + k, p);
const MINUS = "−";
const ok = (v) => v != null && Number.isFinite(Number(v));
const sg = (v, d = 0) => (!ok(v) ? "—" : (Number(v) < 0 && Math.abs(Number(v)) >= 0.5 * 10 ** -d ? MINUS : "") + num(Math.abs(Number(v)), d));
const deg = (v, d = 1) => (!ok(v) ? "—" : sg(v, d) + "\u00a0°C");
const degR = (v) => (!ok(v) ? "" : sg(Math.round(Number(v))) + "°");
const mm = (v, d = 1) => (!ok(v) ? "—" : num(v, d));
const SITE = { qesalo: { lat: 41.4278, lon: 45.1048, alt: 284 }, tbilisi: { lat: 41.715, lon: 44.827, alt: 629 } };
const DAY = 864e5;
const addDays = (d, n) => new Date(Date.parse(d) + n * DAY).toISOString().slice(0, 10);
const wday = (s) => new Date(s + "T12:00:00Z").getUTCDay();
const hhmm = (ms) => { const x = new Date(Number(ms) + 4 * 3600e3); return String(x.getUTCHours()).padStart(2, "0") + ":" + String(x.getUTCMinutes()).padStart(2, "0"); };
const atTime = (iso) => (iso ? dt(String(iso).slice(0, 10)) + " " + hhmm(Date.parse(iso)) : "—");
const capW = (s) => `<span class="ag-l">${esc(s)}</span>`;
// „ხუთშაბათს, 12 ნოე, 06:00" / „დღეს, 06:00"
function when(day, today, at) {
  const d = day === today ? L("today") : day === addDays(today, 1) ? L("tomorrow") : L("dow_on")[wday(day)] + ", " + dt(day);
  return at ? L("at", { d, t: hhmm(at) }) : d;
}
const crop = (c) => L("crop." + c);
const stage = (s) => L("stage." + s);
const part = (h) => (h.crop === "cypress" ? crop("cypress") + " · " + L("part." + h.part) : crop(h.crop) + " (" + stage(h.stage) + ")");
const word = (lv) => `<span class="w ${lv}">${esc(L("w_" + lv))}</span>`;
const shape = (lv) => `<i class="dot ${lv}"></i>`;

// ---------------- the effects: one entry per verdict of the outlook rows ----------------
// level: bad (◆ urgent) | warn (▲ watch) | info (○ early, gap, water, spray) | ok (✓ no risk)
export function effects(d) {
  const rows = (d.outlook && d.outlook.days) || [], today = d.today, out = [], kinds = d.kinds || [];
  const T = (rows[0] && rows[0].risks.today) || {}, R = T.rules || {};
  for (const r of rows) {
    const f = r.risks.frost, at = r.risks.wx && r.risks.wx.tmin_at;
    if (!f || (r.risks.partial && !f.alert)) continue;   // the forecast's last, partial day: a few hours, beyond any alert
    const head = when(r.day, today, at) + " · " + deg(f.low);
    if (f.hits.length) {
      const lv = f.alert ? (f.alert.level === "urgent" ? "bad" : "warn") : "info";
      const lines = [f.hits.map((h) => L(h.t90 != null ? "crit_t90" : "crit_t", { p: part(h), t: deg(h.t10), t90: deg(h.t90) })).join("; ")];
      lines.push(lv === "bad" ? L("frost_do_urgent") : lv === "warn" ? L("frost_do_watch", { m: num(R.margin ?? 1.7, 1) }) : L("frost_early", { h: num(R.frost_h ?? 72) }));
      if (f.hits.some((h) => h.part === "container_roots")) lines.push(L("frost_pots"));
      out.push({ day: r.day, kind: "frost", lv, head, lines, tag: lv === "info" ? L("w_early") : null });
    } else if (f.cold) {
      const tender = f.crit.slice().sort((a, b) => b.t10 - a.t10)[0];
      const gaps = f.gaps.map((g) => L("gap_one", { p: crop(g.crop) + " (" + stage(g.stage) + ")" }));
      const rest = tender ? L(gaps.length ? "frost_others" : "frost_clear", { p: part(tender), t: deg(tender.t10), m: num(f.low - tender.t10, 1) }) : "";
      const lines = [...gaps, rest].filter(Boolean);
      out.push({ day: r.day, kind: "frost", lv: gaps.length ? "info" : "ok", head, lines, tag: gaps.length ? L("w_gap") : null });
    }
  }
  // heat: each run of window-start days (heatAlerts' list) as one line
  if (kinds.includes("agro_heat")) {
    const hd = rows.filter((r) => r.risks.heat && r.risks.heat.start);
    let run = [];
    const flush = () => { if (!run.length) return; const a = run[0], b = run[run.length - 1];
      out.push({ day: a.day, kind: "heat", lv: "warn", head: L("heat_head", { a: dt(a.day), b: dt(addDays(b.day, 2)) }),
        lines: [L("heat_why", { t: num(a.risks.heat.t95, 1), e: num(Math.max(...run.map((x) => x.risks.heat.ehf || 0)), 1) }), L(d.company === "nursery" ? "heat_do_n" : "heat_do_m")] }); run = []; };
    for (const r of hd) { if (run.length && r.day !== addDays(run[run.length - 1].day, 1)) flush(); run.push(r); }
    flush();
  }
  // disease: per code its days within the 7-day horizon (diseaseAlerts' lines)
  if (kinds.includes("agro_disease")) {
    const by = {};
    for (const r of rows) if (r.risks.disease && r.risks.disease.in_horizon) for (const c of r.risks.disease.codes) (by[c] = by[c] || []).push(r.day);
    for (const [c, ds] of Object.entries(by)) out.push({ day: ds[0], kind: "disease", lv: "warn", head: L("dis." + c) + ": " + ds.map(dt).join(", "), lines: [L("dis_do." + c), L("dis_reg")] });
  }
  // water: the almond's line of the week (April-October, the farm)
  if (T.water) out.push({ day: T.water.from, kind: "water", lv: "info", head: L("irr_head", { mm: num(T.water.need_mm), l: num(T.water.litres_per_tree), a: dt(T.water.from), b: dt(T.water.to) }),
    lines: [L("irr_why", { e: num(T.water.etc_mm), r: num(T.water.rain_mm) })], tag: L("w_info") });
  // spray weather: no verdict (thresholds.json spray.status = gap); not on the investor's tab (no plant protection there)
  if (!d.investor && rows.length && (R.spray || "gap") === "gap") out.push({ day: "9999", kind: "spray", lv: "info", head: L("spray_head"), lines: [L("spray_gap")], tag: L("w_gap") });
  const rank = { bad: 0, warn: 1, info: 2, ok: 3 };
  return out.sort((a, b) => (a.kind === "spray") - (b.kind === "spray") || (a.kind === "water") - (b.kind === "water") || a.day.localeCompare(b.day) || rank[a.lv] - rank[b.lv]);
}

// the day's mark in the strip: the most severe verdict of that day among the person's kinds
function markOf(r, kinds) {
  if (!r) return null;
  const f = r.risks.frost, h = r.risks.heat, ds = r.risks.disease;
  if (f && f.alert && f.alert.level === "urgent") return "bad";
  if ((f && f.alert) || (kinds.includes("agro_heat") && h && h.in) || (ds && ds.in_horizon && ds.codes.length)) return "warn";
  if (f && (f.hits.length || (f.cold && f.gaps.length))) return "info";
  if (f && f.cold) return "ok";
  return null;
}

// ---------------- the 9-day strip ----------------
function strip(d, O) {
  const cols = d.days.slice(0, 9), n = cols.length, W = 100 / n, kinds = d.kinds || [], today = d.today;
  const T = (O.get(today) || { risks: {} }).risks.today || {}, R = T.rules || {};
  const lows = cols.map((c) => (ok(c.low) ? c.low : c.tmin)), vals = [...lows, ...cols.map((c) => c.tmax)].filter(ok);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  // the frost band: per day the most tender critical value with a number (the outlook's crit for that day)
  const crit = cols.map((c) => { const f = (O.get(c.day) || { risks: {} }).risks.frost; return f && f.crit.length ? f.crit.slice().sort((a, b) => b.t10 - a.t10)[0] : null; });
  const cmin = Math.min(...crit.filter(Boolean).map((x) => x.t10)), onScale = Number.isFinite(cmin) && cmin >= lo - 12;
  if (onScale) lo = Math.min(lo, cmin - 1);
  const t95 = R.t95, means = cols.map((c) => (ok(c.tmin) && ok(c.tmax) ? (c.tmin + c.tmax) / 2 : null));
  const heatOn = kinds.includes("agro_heat") && ok(t95) && Math.max(...means.filter(ok)) >= t95 - 6;
  if (heatOn) hi = Math.max(hi, t95 + 1);
  const step = hi - lo > 32 ? 10 : 5;
  lo = Math.floor((lo - 0.5) / step) * step; hi = Math.ceil((hi + 0.5) / step) * step;
  const y = (v) => ((hi - v) / (hi - lo)) * 100;
  let g = "";
  for (let v = lo; v <= hi; v += step) g += `<div class="ag-gl${v === 0 ? " z" : ""}" style="top:${y(v).toFixed(2)}%"><span>${degR(v)}</span></div>`;
  if (heatOn) g += `<div class="ag-t95" style="top:${y(t95).toFixed(2)}%"><span>T95</span></div>`;
  const heads = cols.map((c) => `<div class="${c.day === today ? "on" : ""}"><b>${esc(c.day === today ? L("today_s") : L("dow")[wday(c.day)])}</b><span>${new Date(c.day + "T12:00:00Z").getUTCDate()}</span></div>`).join("");
  const plot = cols.map((c, i) => {
    const r = O.get(c.day), f = r && r.risks.frost, hz = r && r.risks.heat, low = lows[i];
    let s = `<div class="ag-c${c.day === today ? " on" : ""}" style="left:${(i * W).toFixed(3)}%;width:${W.toFixed(3)}%" title="${esc(dt(c.day) + ": " + deg(low) + " … " + deg(c.tmax))}">`;
    const k = crit[i];
    if (k && onScale) s += `<i class="ag-fw" style="top:${y(k.t10 + (R.margin ?? 1.7)).toFixed(2)}%;height:${(y(k.t10) - y(k.t10 + (R.margin ?? 1.7))).toFixed(2)}%"></i><i class="ag-fb" style="top:${y(k.t10).toFixed(2)}%"></i>`;
    if (kinds.includes("agro_heat") && hz && hz.in) s += `<i class="ag-hb"></i>`;
    if (ok(low) && ok(c.tmax)) s += `<div class="ag-r" style="top:${y(c.tmax).toFixed(2)}%;height:${Math.max(0.5, y(low) - y(c.tmax)).toFixed(2)}%"><b class="hi">${degR(c.tmax)}</b><b class="lo">${degR(low)}</b></div>`;
    if (heatOn && ok(means[i])) s += `<i class="ag-m" style="top:${y(means[i]).toFixed(2)}%"></i>`;
    if (f && f.hits.length) s += `<i class="dot ${f.alert ? (f.alert.level === "urgent" ? "bad" : "warn") : "info"} ag-fx" style="top:${y(low).toFixed(2)}%"></i>`;
    return s + `</div>`;
  }).join("");
  // the legend: what the band is, or where the most tender value sits when it is far below the forecast
  const tender = crit.filter(Boolean).sort((a, b) => b.t10 - a.t10)[0];
  let leg = "";
  if (d.company === "nursery" && kinds.includes("frost")) {
    if (tender && onScale) leg = `<span><i class="ag-k fb"></i>${esc(L("leg_crit"))}</span><span><i class="ag-k fw"></i>${esc(L("leg_watch", { m: num(R.margin ?? 1.7, 1) }))}</span>`;
    else if (tender) leg = `<span><i class="ag-k fb"></i>${esc(L("leg_far", { t: deg(tender.t10), p: part(tender) }))}</span>`;
  }
  if (heatOn) leg += `<span><i class="ag-k t95"></i>${esc(L("leg_t95", { t: num(t95, 1) }))}</span>`;
  leg += `<span><i class="ag-k rg"></i>${esc(L("leg_range"))}</span>`;
  const maxRain = Math.max(5, ...cols.map((c) => c.rain_mm || 0));
  const chev = (v) => (!ok(v) ? "" : v < 12 ? "›" : v < 20 ? "››" : v < 29 ? "›››" : "››››");
  const cells = (cls, f) => `<div class="ag-g ${cls}">${cols.map((c) => `<div class="${c.day === today ? "on" : ""}">${f(c)}</div>`).join("")}</div>`;
  let s = `<div class="card ag-st" style="--n:${n}"><div class="card-h"><div class="card-t">${esc(L("strip", { n: n }))}</div><div class="card-n">${esc(L("strip_n"))}</div></div>`
    + `<div class="ag-g ag-dh">${heads}</div>`
    + `<div class="ag-plot" role="img" aria-label="${esc(L("strip_aria"))}"><div class="ag-pin">${g}${plot}</div></div>`
    + `<div class="ag-leg">${leg}</div>`
    + `<div class="ag-cap">${capW(L("cap_rain"))}</div>` + cells("ag-rain", (c) => `${c.rain_mm > 0 ? `<i style="height:${Math.max(2, Math.round(22 * c.rain_mm / maxRain))}px"></i>` : ""}<span class="${c.rain_mm > 0 ? "" : "mut"}">${c.rain_mm > 0 ? mm(c.rain_mm, c.rain_mm < 10 ? 1 : 0) : "0"}</span>`)
    + `<div class="ag-cap">${capW(L("cap_wind"))}</div>` + cells("ag-wind", (c) => `<b>${chev(c.wind_max)}</b><span>${ok(c.wind_max) ? num(c.wind_max) : "—"}</span>`)
    + `<div class="ag-cap">${capW(L("cap_wet"))}</div>` + cells("ag-wet", (c) => `<i class="ag-wb"><i style="height:${Math.min(100, (100 * (c.wet_h || 0)) / 24).toFixed(1)}%"></i></i><span class="${c.wet_h ? "" : "mut"}">${ok(c.wet_h) ? num(c.wet_h) : "—"}</span>`)
    + `<div class="ag-cap">${capW(L("cap_et0"))}</div>` + cells("ag-et", (c) => `<span>${mm(c.et0_mm)}</span>`)
    + `<div class="ag-cap">${capW(L("cap_mark"))}</div>` + cells("ag-mk", (c) => { const m = markOf(O.get(c.day), kinds); return m ? shape(m) : `<span class="mut">·</span>`; });
  return s + `</div>`;
}

// ---------------- water: ET0 against rain, and the balance ----------------
function waterCard(d) {
  const cols = d.days.slice(0, 9), today = d.today, O = new Map(((d.outlook && d.outlook.days) || []).map((r) => [r.day, r]));
  const T = (O.get(today) || { risks: {} }).risks.today || {};
  const et = cols.map((c) => c.et0_mm || 0), rn = cols.map((c) => c.rain_mm || 0);
  const sE = et.reduce((a, b) => a + b, 0), sR = rn.reduce((a, b) => a + b, 0), top = Math.max(2, ...et, ...rn);
  const H = 40, bars = cols.map((c, i) => `<div class="${c.day === today ? "on" : ""}"><i class="up" style="height:${((H * rn[i]) / top).toFixed(1)}px"></i><i class="dn" style="height:${((H * et[i]) / top).toFixed(1)}px"></i></div>`).join("");
  let s = `<div class="card ag-wa" style="--n:${cols.length}"><div class="card-h"><div class="card-t">${esc(L("water"))}</div><div class="card-n">${esc(L("water_n", { n: cols.length }))}</div></div>`
    + `<div class="ag-g ag-wbars">${bars}</div><div class="ag-wl"><span><i class="ag-k up"></i>${esc(L("water_rain"))}</span><span><i class="ag-k dn"></i>${esc(L("water_et0"))}</span></div></div>`
    + `<div class="grid2"><div class="stat"><div class="stat-l">${esc(L("w_et0"))}</div><div class="stat-v">${num(sE, 1)}</div><div class="stat-s">${esc(L("u_mm"))}</div></div>`
    + `<div class="stat"><div class="stat-l">${esc(L("w_rain"))}</div><div class="stat-v">${num(sR, 1)}</div><div class="stat-s">${esc(L("u_mm"))}</div></div>`
    + `<div class="stat"><div class="stat-l">${esc(L("w_bal"))}</div><div class="stat-v">${sg(sR - sE, 1)}</div><div class="stat-s">${esc(L("w_bal_s"))}</div></div>`;
  if (d.company === "nursery") {
    const mon = today.slice(5, 7), months = (T.rules && T.rules.irrigation_months) || [];
    s += T.water ? `<div class="stat"><div class="stat-l">${esc(L("w_irr"))}</div><div class="stat-v">${num(T.water.litres_per_tree)} ${esc(L("u_l"))}</div><div class="stat-s">${esc(L("w_irr_s", { mm: num(T.water.need_mm), a: dt(T.water.from), b: dt(T.water.to) }))}</div></div>`
      : `<div class="stat"><div class="stat-l">${esc(L("w_irr"))}</div><div class="stat-v">—</div><div class="stat-s">${esc(months.includes(mon) ? L("w_irr_none") : L("w_irr_off"))}</div></div>`;
  }
  return s + `</div>`;
}

// ---------------- disease weather: wet hours against the rules' 4 h and 12 h ----------------
function diseaseCard(d) {
  const cols = d.days.slice(0, 9), today = d.today, O = new Map(((d.outlook && d.outlook.days) || []).map((r) => [r.day, r]));
  const T = (O.get(today) || { risks: {} }).risks.today || {}, R = T.rules || {}, a = R.wet_any ?? 4, o = R.wet_over ?? 12;
  const bars = cols.map((c) => { const r = O.get(c.day), hit = r && r.risks.disease && r.risks.disease.codes.length;
    return `<div class="${c.day === today ? "on" : ""}"><i class="${hit ? "hit" : ""}" style="height:${Math.min(100, (100 * (c.wet_h || 0)) / 24).toFixed(1)}%"></i></div>`; }).join("");
  const open = ((O.get(today) || { risks: {} }).risks.disease || {}).open || [];
  const all = ["brown_rot", "shot_hole", "anthracnose"], shut = all.filter((c) => !open.includes(c));
  const any = [...O.values()].some((r) => r.risks.disease && r.risks.disease.in_horizon && r.risks.disease.codes.length);
  return `<div class="card ag-ds" style="--n:${cols.length}"><div class="card-h"><div class="card-t">${esc(L("dis_title"))}</div><div class="card-n">${esc(L("dis_n"))}</div></div>`
    + `<div class="ag-dplot"><div class="ag-gl" style="top:0"><span>24</span></div><div class="ag-gl rf" style="top:${(100 - (100 * o) / 24).toFixed(2)}%"><span>${o}</span></div>`
    + `<div class="ag-gl rf" style="top:${(100 - (100 * a) / 24).toFixed(2)}%"><span>${a}</span></div><div class="ag-gl z" style="top:100%"><span>0</span></div>`
    + `<div class="ag-g ag-dbars">${bars}</div></div>`
    + `<div class="ag-dn"><div class="mut">${esc(L("dis_refs", { a, da: L("dis.brown_rot"), o, do: L("dis.shot_hole") }))}</div>${open.length ? `<div><b>${esc(L("dis_open"))}</b> ${esc(open.map((c) => L("dis." + c)).join(", "))}</div>` : ""}${shut.length ? `<div><b>${esc(L("dis_shut"))}</b> ${esc(shut.map((c) => L("dis." + c)).join(", "))}</div>` : ""}`
    + `<div>${esc(any ? L("dis_some") : L("dis_none", { n: R.disease_days ?? 7 }))}</div><div class="mut">${esc(L("dis_note"))}</div></div></div>`;
}

// ---------------- the stages ----------------
function stagesCard(d) {
  const S = d.stages || [];
  if (!S.length) return "";
  const today = d.today, T = (((d.outlook && d.outlook.days) || [])[0] || { risks: {} }).risks.today || {}, se = T.season || {};
  const by = (b) => (!b ? "" : (b[(d._lang || "ka")] || b.ka || "").split(/\s+/)[0]);
  const items = S.map((s) => {
    const idx = s.order.indexOf(s.stage), seen = s.seen;
    const rib = s.order.map((x, i) => `<i class="${i < idx ? "p" : i === idx ? "on" : ""}" title="${esc(stage(x))}"></i>`).join("");
    const crit = !s.crit.length ? L("crit_gap") : s.crop === "cypress" ? s.crit.map((c) => L("part." + c.part) + " " + deg(c.t10)).join(" · ")
      : s.crit[0].t90 != null ? L("crit_s90", { t: deg(s.crit[0].t10), t90: deg(s.crit[0].t90) }) : L("crit_s", { t: deg(s.crit[0].t10) });
    let basis = s.basis === "model" ? `<span class="pill p-grey">${esc(L("basis.model"))}</span>` : `<span class="pill p-ok">${esc(L("basis." + s.basis))}</span>`;
    let lines = [esc(crit)];
    if (s.next && s.next_day) lines.push(esc(L("next", { s: stage(s.next), d: dt(s.next_day) })));
    if (s.basis === "model") lines.push(esc(L("model_note")));
    if (seen && seen.newer) lines.push(esc(seen.not_yet ? L("seen_not", { s: stage(seen.not_yet), at: atTime(seen.at) }) + (seen.by ? " · " + by(seen.by) : "") : L("seen_new", { s: stage(seen.stage), at: atTime(seen.at) }) + (seen.by ? " · " + by(seen.by) : "")) + " " + esc(L("seen_later")));
    else if (seen && s.basis !== "model") lines.push(esc(L("seen_by", { at: atTime(seen.at) }) + (seen.by ? " · " + by(seen.by) : "")));
    let ask = "";
    if (s.ask) ask = `<div class="ag-ask${s.ask.change ? "" : " seed"}"><div>${esc(s.ask.change ? L("ask", { s: stage(s.ask.stage), p: stage(s.ask.prev) }) : L("ask_seed", { s: stage(s.ask.stage) }))}</div>`
      + `<div class="ag-btn"><button data-ag-ph="${s.ask.id}" data-ans="y">${esc(L("yes"))}</button>${s.ask.change ? `<button data-ag-ph="${s.ask.id}" data-ans="n">${esc(L("no"))}</button>` : ""}</div></div>`;
    return `<div class="ag-sp"><div class="ag-sh"><span class="ag-l">${esc(crop(s.crop))}</span>${basis}</div><div class="ag-sv">${esc(stage(s.stage))}</div><div class="ag-rib">${rib}</div>`
      + `<div class="ag-sl">${lines.map((x) => `<div>${x}</div>`).join("")}</div>${ask}</div>`;
  }).join("");
  const sums = se.chill_from ? L("season", { cp: num(se.chill_cp, 1), d: dt(se.chill_from) }) + (se.heat_gdh != null ? " · " + L("season_heat", { g: num(se.heat_gdh), d: dt(se.heat_from) }) : "") : "";
  return `<div class="card ag-stg"><div class="card-h"><div class="card-t">${esc(L("stages"))}</div><div class="card-n">${esc(L("stages_n"))}</div></div>${items}${sums ? `<div class="note">${esc(sums)}</div>` : ""}</div>`;
}

// ---------------- the sheet ----------------
export default function view(d, me, _t, company) {
  css();
  const title = (n) => `<div class="card-h"><div class="card-t">${esc(L("title_site", { s: L("site." + ((d && d.site) || (company === "main" ? "tbilisi" : "qesalo"))) }))}</div>${n ? `<div class="card-n">${n}</div>` : ""}</div>`;
  if (!d || d.state === "none") return `<div class="card">${title("")}<div class="empty">${esc(L("none"))}</div></div>`;
  if (d.state !== "ok") return `<div class="card">${title("")}<div class="empty">${esc(d.fetched_at ? L("empty", { d: atTime(d.fetched_at) }) : L("empty_never"))}</div></div>`
    + `<div class="ag-tb"><div><span>${esc(L("tb_src"))}</span>${esc(L("attr"))}</div></div>`;
  d._lang = (me && me.lang) || "ka";
  const O = new Map(((d.outlook && d.outlook.days) || []).map((r) => [r.day, r]));
  const today = d.today, t0 = d.days[0], T = (O.get(today) || { risks: {} }).risks.today || {}, kinds = d.kinds || [];
  const eff = d.outlook ? effects(d) : [];
  const top = eff.find((e) => e.lv === "bad") || eff.find((e) => e.lv === "warn");
  // the takeaway: the most severe effect, else what is not in sight (only the kinds this person gets)
  const none = (d.company === "nursery" ? kinds : kinds.filter((k) => k === "agro_heat")).map((k) => L("none_" + k));
  const list = none.length < 2 ? none.join("") : none.slice(0, -1).join(", ") + L("and") + none[none.length - 1];
  const gapN = eff.filter((e) => e.kind === "frost" && e.tag === L("w_gap")).length;
  const take = !d.outlook ? L("no_outlook") : top ? top.head : gapN ? L("take_gap", { g: gapN }) : none.length ? L("all_clear", { n: Math.min(9, d.days.length), list }) : "";
  const takeLv = top ? top.lv : gapN ? "info" : "ok";
  let s = "";
  if (d.done) s += d.done.ok ? `<div class="banner ok">${esc(d.done.ans === "y" ? L("done_y", { c: crop(d.done.crop), s: stage(d.done.stage) }) : L("done_n", { c: crop(d.done.crop) }))}</div>`
    : `<div class="banner">${esc(L("done_" + (d.done.why || "fail")))}</div>`;
  if (d.outlook && d.outlook.stale) s += `<div class="banner">${esc(L("stale", { t: atTime(d.outlook.computed_at) }))}</div>`;
  s += `<div class="card ag-hero">${title(esc(L("met", { t: d.fetched_at ? hhmm(Date.parse(d.fetched_at)) : "—" })))}`
    + `<div class="hero"><div class="hero-l">${esc(L("hero_l", { d: dt(today) }))}</div><div class="hero-v">${esc(degR(t0.low ?? t0.tmin))}<span class="ag-sep">/</span>${esc(degR(t0.tmax))}</div>`
    + `<div class="hero-s">${d.outlook ? shape(takeLv) + " " : ""}${esc(take)}</div></div>`
    + `<div class="grid2"><div class="stat"><div class="stat-l">${esc(L("rain"))}</div><div class="stat-v">${mm(t0.rain_mm)}</div><div class="stat-s">${esc(L("rain_s", { h: num(t0.rain_h || 0) }))}</div></div>`
    + `<div class="stat"><div class="stat-l">${esc(L("wind"))}</div><div class="stat-v">${ok(t0.wind_max) ? num(t0.wind_max) : "—"}</div><div class="stat-s">${esc(L("u_kmh"))}</div></div>`
    + `<div class="stat"><div class="stat-l">${esc(L("et0"))}</div><div class="stat-v">${mm(t0.et0_mm)}</div><div class="stat-s">${esc(L("u_mm_day"))}</div></div>`
    + `<div class="stat"><div class="stat-l">${esc(L("wet"))}</div><div class="stat-v">${ok(t0.wet_h) ? num(t0.wet_h) : "—"}</div><div class="stat-s">${esc(ok(t0.rh_min) ? L("wet_s", { rh: num(t0.rh_min) }) : L("u_h"))}</div></div></div></div>`;
  s += strip(d, O);
  // the effect lines
  s += `<div class="card ag-ef"><div class="card-h"><div class="card-t">${esc(L("eff"))}</div><div class="card-n">${esc(L("eff_n"))}</div></div>`
    + (!d.outlook ? `<div class="empty">${esc(L("no_outlook"))}</div>`
      : (!eff.some((e) => e.lv === "bad" || e.lv === "warn") && !gapN && none.length ? `<div class="row"><i class="dot ok"></i><div class="row-m"><div class="row-t">${esc(take)}</div></div><div class="row-v">${word("ok")}</div></div>` : "")
        + eff.map((e) => `<div class="row ag-e"><i class="dot ${e.lv}"></i><div class="row-m"><div class="row-t">${esc(e.head)}</div>${e.lines.map((l) => `<div class="row-c">${esc(l)}</div>`).join("")}</div><div class="row-v">${e.tag ? `<span class="w ${e.lv}">${esc(e.tag)}</span>` : word(e.lv)}</div></div>`).join(""))
    + `</div>`;
  s += stagesCard(d);
  s += waterCard(d);
  if (d.company === "nursery" && kinds.includes("agro_disease")) s += diseaseCard(d);
  if (d.weekly_shown) {
    const w = d.weekly, txt = w && (w.texts[d._lang] || w.texts.ka);
    s += `<div class="card ag-wk"><div class="card-h"><div class="card-t">${esc(L("weekly"))}</div><div class="card-n">${w ? esc(dt(w.week)) : ""}</div></div>`
      + (txt ? `<div class="ag-wt">${esc(txt)}</div>${!w.texts[d._lang] && d._lang !== "ka" ? `<div class="note">${esc(L("weekly_ka"))}</div>` : ""}`
        : `<div class="empty">${esc(L("weekly_none", { w: L(d.company === "nursery" ? "weekly_when_n" : "weekly_when_m") }))}</div>`) + `</div>`;
  }
  if ((d.alerts || []).length) s += `<div class="card"><div class="card-h"><div class="card-t">${esc(L("sent"))}</div><div class="card-n">${esc(L("sent_n"))}</div></div>`
    + d.alerts.map((a) => `<div class="row"><i class="dot ${a.level === "urgent" ? "bad" : a.level === "warn" ? "warn" : "info"}"></i><div class="row-m"><div class="row-t">${esc(L("kind." + a.kind))}${a.day ? " · " + esc(dt(a.day)) : ""}</div><div class="row-c">${esc(L("sent_at", { t: atTime(a.at) }))}${a.ack ? " · " + esc(L("sent_ack")) : ""}</div></div></div>`).join("") + `</div>`;
  const st = SITE[d.site] || {};
  s += `<div class="ag-tb"><div><span>${esc(L("tb_src"))}</span>${esc(L("attr"))} · ${esc(L("tb_fc", { t: d.outlook && d.outlook.forecast_at ? atTime(d.outlook.forecast_at) : "—", r: atTime(d.fetched_at) }))}</div>`
    + `<div><span>${esc(L("tb_rules"))}</span>${esc(d.outlook ? L("tb_rules_v", { v: dt(T.rules ? T.rules.th_version : today), t: atTime(d.outlook.computed_at) }) : L("no_outlook"))}</div>`
    + `<div><span>${esc(L("tb_site"))}</span>${esc(L("tb_site_v", { lat: num(st.lat, 2), lon: num(st.lon, 2), alt: num(st.alt) }))}</div>`
    + `<div><span>${esc(L("tb_method"))}</span>${esc(L("tb_method_v"))}</div></div>`;
  return s;
}

// the ✓ / „ჯერ არა" buttons: the tab loads again with the answer (the function writes it as the real person)
export function mount(el, { reload }) {
  el.querySelectorAll("[data-ag-ph]").forEach((b) => b.addEventListener("click", () => {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.HapticFeedback) try { tg.HapticFeedback.selectionChanged(); } catch (e) {}
    el.querySelectorAll("[data-ag-ph]").forEach((x) => { x.disabled = true; });
    reload({ agro_phen: { id: Number(b.dataset.agPh), ans: b.dataset.ans } });
  }));
}

function css() {
  if (typeof document === "undefined" || document.getElementById("ag-css")) return;
  const st = document.createElement("style"); st.id = "ag-css";
  st.textContent = `
.ag-l{font:600 11px/14px var(--ff);font-stretch:75%;letter-spacing:.09em;color:var(--q-muted)}
html:not([lang="ka"]) .ag-l,html:not([lang="ka"]) .ag-dh b{text-transform:uppercase}
.ag-hero .hero-v{display:flex;align-items:baseline;gap:6px}
.ag-sep{font-weight:400;color:var(--q-muted);font-size:.62em}
.ag-hero .hero-s{display:flex;gap:8px;align-items:baseline;font-weight:600;color:var(--q-ink)}
.ag-hero .hero-s .dot{transform-origin:center;flex:none;position:relative;top:1px}
.ag-st{padding-bottom:10px}
.ag-g{display:grid;grid-template-columns:repeat(var(--n,9),minmax(0,1fr));margin-left:26px}
.ag-g>div{min-width:0;text-align:center}
.ag-g>div+div{border-left:1px solid var(--q-rule-light)}
.ag-g>div.on{background:color-mix(in srgb,var(--q-surface-2) 70%,transparent)}
.ag-dh{border:1.5px solid var(--q-rule);border-bottom:0;margin-top:2px}
.ag-dh>div{padding:4px 0 3px}
.ag-dh>div+div{border-left:1.5px solid var(--q-rule)}
.ag-dh b{display:block;font:700 10.5px/13px var(--ff);font-stretch:75%;letter-spacing:.05em;color:var(--q-ink-2)}
.ag-dh span{display:block;font:800 15px/17px var(--ff);font-stretch:62.5%}
.ag-dh>div.on{background:var(--q-invert);color:var(--q-on-invert)}.ag-dh>div.on b{color:var(--q-on-invert)}
.ag-plot{position:relative;height:184px;margin-left:26px;border:1.5px solid var(--q-rule)}
.ag-pin{position:absolute;left:0;right:0;top:18px;bottom:18px}
.ag-gl{position:absolute;left:0;right:0;border-top:1px solid var(--q-rule-light)}
.ag-gl.z{border-top:1.5px solid var(--q-rule)}
.ag-gl span{position:absolute;right:100%;margin-right:5px;transform:translateY(-50%);font:600 10.5px/12px var(--ff);font-stretch:75%;color:var(--q-muted);white-space:nowrap}
.ag-t95{position:absolute;left:0;right:0;border-top:1.5px dashed var(--q-warn)}
.ag-t95 span{position:absolute;right:100%;margin-right:5px;transform:translateY(-50%);font:700 10px/12px var(--ff);font-stretch:75%;color:var(--q-warn)}
.ag-c{position:absolute;top:0;bottom:0}
.ag-c+.ag-c{border-left:1px solid var(--q-rule-light)}
.ag-c.on{background:color-mix(in srgb,var(--q-surface-2) 70%,transparent)}
.ag-fb{position:absolute;left:0;right:0;bottom:-18px;background:repeating-linear-gradient(135deg,var(--q-crit) 0 1px,var(--q-crit-bg) 1px 5px)}
.ag-fw{position:absolute;left:0;right:0;background:repeating-linear-gradient(135deg,var(--q-warn) 0 1px,var(--q-warn-bg) 1px 7px);opacity:.85}
.ag-hb{position:absolute;left:0;right:0;top:-18px;height:10px;background:repeating-linear-gradient(135deg,var(--q-warn) 0 1px,var(--q-warn-bg) 1px 4px)}
.ag-r{position:absolute;left:50%;width:0;border-left:2px solid var(--q-ink);transform:translateX(-1px)}
.ag-r::before,.ag-r::after{content:"";position:absolute;left:-5px;width:8px;border-top:2px solid var(--q-ink)}
.ag-r::before{top:-1px}.ag-r::after{bottom:-1px}
.ag-r b{position:absolute;left:0;transform:translateX(-50%);font:800 12.5px/13px var(--ff);font-stretch:62.5%;white-space:nowrap;color:var(--q-ink);background:var(--q-surface);padding:0 1px}
.ag-c.on .ag-r b{background:transparent}
.ag-r b.hi{bottom:100%;margin-bottom:3px}.ag-r b.lo{top:100%;margin-top:3px;color:var(--q-ink-2)}
.ag-m{position:absolute;left:50%;width:6px;height:6px;border:1.5px solid var(--q-warn);background:var(--q-surface);transform:translate(-50%,-50%)}
.ag-fx{position:absolute;left:calc(50% + 5px);transform:translateY(-50%) scale(.85)}
.ag-fx.bad{transform:translateY(-50%) rotate(45deg) scale(.62)}
.ag-leg,.ag-wl{display:flex;flex-wrap:wrap;gap:4px 14px;margin:7px 0 2px 26px;font-size:11.5px;line-height:15px;color:var(--q-ink-2)}
.ag-k{display:inline-block;width:14px;height:9px;margin-right:5px;vertical-align:-1px;border:1px solid var(--q-rule)}
.ag-k.fb{background:repeating-linear-gradient(135deg,var(--q-crit) 0 1px,var(--q-crit-bg) 1px 4px);border-color:var(--q-crit)}
.ag-k.fw{background:repeating-linear-gradient(135deg,var(--q-warn) 0 1px,var(--q-warn-bg) 1px 5px);border-color:var(--q-warn)}
.ag-k.t95{height:0;border:0;border-top:1.5px dashed var(--q-warn);vertical-align:3px}
.ag-k.rg{width:8px;height:11px;border:0;border-top:2px solid var(--q-ink);border-bottom:2px solid var(--q-ink);background:linear-gradient(var(--q-ink),var(--q-ink)) center/2px 100% no-repeat;margin:0 6px 0 3px}
.ag-k.up{background:repeating-linear-gradient(90deg,var(--q-ink) 0 1px,transparent 1px 3px)}
.ag-k.dn{background:var(--q-ink)}
.ag-cap{margin:9px 0 2px 26px}
.ag-rain>div,.ag-wind>div,.ag-wet>div,.ag-et>div,.ag-mk>div{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:3px 0 2px}
.ag-rain>div{height:42px}
.ag-rain i{display:block;width:58%;border:1px solid var(--q-ink);background:repeating-linear-gradient(90deg,var(--q-ink) 0 1px,transparent 1px 3px);margin-bottom:2px}
.ag-rain span,.ag-wind span,.ag-wet span,.ag-et span{font:700 11.5px/13px var(--ff);font-stretch:75%;white-space:nowrap}
.ag-wind b{font:800 14px/14px var(--ff);font-stretch:62.5%;letter-spacing:-.06em;height:14px}
.ag-wet>div{height:40px}
.ag-wb{display:block;position:relative;width:9px;height:22px;border:1px solid var(--q-rule);margin-bottom:2px}
.ag-wb i{position:absolute;left:0;right:0;bottom:0;background:var(--q-ink)}
.ag-mk>div{height:24px;justify-content:center}
.ag-mk .dot.bad{transform:rotate(45deg) scale(.62)}
.ag-e .row-c+.row-c{margin-top:2px}
.ag-e .row-v{align-self:flex-start;padding-top:1px}
.ag-e>.dot,.ag-ef .row>.dot{align-self:flex-start;margin-top:4px}
.ag-ef .dot.bad{transform:rotate(45deg) scale(.72)}
.ag-sp{padding:10px 0 12px;border-top:1px solid var(--q-rule-light)}
.card-h+.ag-sp{border-top:0;padding-top:2px}
.ag-sh{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ag-sv{font:800 22px/25px var(--ff);font-stretch:62.5%;margin-top:3px}
.ag-rib{display:flex;gap:2px;margin:7px 0 6px}
.ag-rib i{flex:1 1 0;height:8px;border:1px solid var(--q-rule)}
.ag-rib i.p{background:var(--q-rule-light);border-color:var(--q-rule-light)}
.ag-rib i.on{background:var(--q-ink);border-color:var(--q-ink)}
.ag-sl{font-size:12.5px;line-height:17px;color:var(--q-ink-2)}
.ag-ask{margin-top:9px;border:1.5px solid var(--q-rule);background:var(--q-surface-2);padding:8px 10px;font:600 13px/18px var(--ff)}
.ag-btn{display:flex;gap:0;margin-top:8px;border:1.5px solid var(--q-rule)}
.ag-ask.seed{display:flex;align-items:center;gap:10px;padding:6px 6px 6px 10px}.ag-ask.seed>div:first-child{flex:1 1 auto}.ag-ask.seed .ag-btn{margin-top:0;flex:none;min-width:96px}
.ag-btn button{flex:1 1 0;min-height:44px;border:0;border-radius:0;background:var(--q-surface);font:700 12.5px/15px var(--ff);font-stretch:75%;letter-spacing:.05em;color:var(--q-ink);cursor:pointer;transition:background-color 90ms var(--step),color 90ms var(--step)}
.ag-btn button+button{border-left:1.5px solid var(--q-rule)}
.ag-btn button:active{background:var(--q-invert);color:var(--q-on-invert)}
.ag-btn button:disabled{color:var(--q-muted)}
.ag-wbars>div{position:relative;height:84px}
.ag-wbars>div::after{content:"";position:absolute;left:0;right:0;top:42px;border-top:1.5px solid var(--q-rule)}
.ag-wbars i{position:absolute;left:24%;right:24%}
.ag-wbars i.up{bottom:42px;border:1px solid var(--q-ink);border-bottom:0;background:repeating-linear-gradient(90deg,var(--q-ink) 0 1px,transparent 1px 3px)}
.ag-wbars i.dn{top:42px;background:var(--q-ink)}
.ag-wa .ag-wl{margin-bottom:10px}
.ag-dplot{position:relative;height:96px;margin:6px 0 4px 26px;border-bottom:0}
.ag-dplot .ag-gl em{position:absolute;right:0;bottom:1px;font:600 10.5px/12px var(--ff);font-style:normal;color:var(--q-muted);background:var(--q-surface);padding-left:4px}
.ag-dplot .ag-gl.rf{border-top:1.5px dashed var(--q-ink-2)}
.ag-dbars{position:absolute;inset:0;margin-left:0}
.ag-dbars>div{position:relative}
.ag-dbars i{position:absolute;left:28%;right:28%;bottom:0;background:var(--q-ink)}
.ag-dbars i.hit{background:repeating-linear-gradient(135deg,var(--q-warn) 0 1.5px,var(--q-warn-bg) 1.5px 4px);border:1px solid var(--q-warn)}
.ag-dn{font-size:12.5px;line-height:17px;color:var(--q-ink-2);padding:6px 0 10px}
.ag-dn b{font-weight:600;color:var(--q-ink)}
.ag-dn div+div{margin-top:2px}
.ag-wt{white-space:pre-wrap;font-size:14px;line-height:20px;padding:2px 0 12px;color:var(--q-ink)}
.ag-tb{margin:0 12px 12px;border:1.5px solid var(--q-rule);font-size:12px;line-height:16px;color:var(--q-ink-2)}
.ag-tb div{padding:6px 8px}.ag-tb div+div{border-top:1px solid var(--q-rule-light)}
.ag-tb span{display:block;font:600 11px/14px var(--ff);font-stretch:75%;letter-spacing:.09em;color:var(--q-muted);margin-bottom:2px}
#view>.ag-tb{margin-top:12px}
@media (max-width:360px){.ag-g,.ag-plot,.ag-cap,.ag-leg,.ag-wl,.ag-dplot{margin-left:22px}.ag-r b{font-size:11.5px}}
`;
  document.head.appendChild(st);
}

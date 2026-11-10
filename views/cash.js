// ფული - plain for both companies (wave W-DRILL, plans/bot-v3.md §3.2, Otar's item 7, 9.11.2026: „In ფული tab, I do not
// need the ბუღალტერია differences. It should look plain and simple, just like in მწვანე სახლი ფული tab"): the main
// company's layout (the bot's card M1, lib/cards-main.mjs) for the nursery too - a warning banner (bank older than 2
// days, a missing rate), the total, one row per bank x currency (accounts, the bank's time, the NBG rate, the share),
// the zero-balance count. A bank row opens to its accounts (GE…1234 for everyone but the admin; the investor's rows do
// not open). The bank <-> books gap is on the ბუღალტერია tab now. ● ლაივი while the bank was read less than 3 minutes
// ago (the minute runner, schema/029; W-RT adds the socket condition).
// W-LIVE (9.11): the bank's time from fetched_at (the minute runner, schema/029) when it is of the balance's day, and the
// till (სალარო) from ORIS in both companies (Otar 9.11; ./functions/mini/till.ts, schema/029b): the hero is banks + till,
// the „სად არის" card keeps the bank total the bot's card shows.
// The numbers: the nursery's bank total = Σ v_v1_cash.gel_equivalent (card N2), the main company's = v_main_cash
// total_gel (card M1); the rows are ./functions/mini/cash.ts's.
// otar-1011 (10.11): no „ბანკის მონაცემი {n} დღისაა" banner and no „დღეს ჯერ არ წაკითხულა" note (§1.7 A - the bank's own
// time stands on each row; a missing rate still says so, it changes the total); „ფულის მოძრაობა" after „სად არის"
// (§1.5): closed by default; open = the period (7 / 30 days, this month, a range), the source chips, in / out totals and
// the movements by day from ./functions/mini/moves.ts (schema/042), 200 at a time. Inflows carry the 3 px ink bar at the
// left, outflows none; the direction is the bar + the word + the sign, never a colour. The filter lives here and goes
// with every load of the tab (params()), so a company switch and the live refresh keep it; „ორივე" = one card per company.
import { t, tOr, esc, num, gel, dt, tm, card, row, barRow, span, fxAmt, SYM, caps, stat, mt } from "../ui.js?v=f1ab646.202611101300";

const ymd = (s) => { const d = new Date(s); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const at = (asOf, fetched) => (fetched && asOf && ymd(fetched) === String(asOf).slice(0, 10) ? tm(fetched) : dt(asOf));
function where(bank, till) {
  if (!till) return "";
  const note = till.last_entry ? t("cash.till_note", { d: dt(till.last_entry), t: till.synced_at ? tm(till.synced_at) : "—" }) : t("cash.till_empty", { t: till.synced_at ? tm(till.synced_at) : "—" });
  return card(t("cash.where"), "", row(t("cash.banks"), "", gel(bank)) + row(t("cash.till"), note, gel(till.gel)));
}
// ● ლაივი: the bank read less than 3 minutes ago; the dot goes when that is no longer true (a timer, no refetch). A
// re-read that moved nothing bumps only checked_at (schema/029): the page fires qesalo:checked and the dot of that
// company stays 3 minutes from then (W-RT's PR-RT-2) - so it no longer fades on a quiet evening; CHECKED keeps that time
// per company, so a redraw (a tapped bank row) draws the dot again
const LIVE_MS = 3 * 60e3, CHECKED = {};
const live = (fetched, co) => {
  const until = fetched ? Math.max(Date.parse(fetched), CHECKED[co] || 0) + LIVE_MS : 0;
  return until > Date.now() ? ` <span class="ca-live" data-live-until="${until}" data-live-co="${esc(co || "")}">${esc(t("cash.live"))}</span>` : "";
};
const S = { open: {} };

function sheet(d, co) {
  const L = d.lines || [], tot = d.till ? Math.round(Number(d.total_gel || 0)) + Math.round(Number(d.till.gel || 0)) : d.total_gel;   // the rounded parts add up on screen
  const warn = (d.fx_missing || []).length ? t("cash.fx_missing", { c: d.fx_missing.join(", ") }) : "";
  let s = warn ? `<div class="banner">${esc(warn)}</div>` : "";
  s += `<div class="card hero"><div class="hero-l">${t(d.till ? "cash.total_all" : "cash.total")}</div><div class="hero-v">${gel(tot)}</div><div class="hero-s">${t("cash.main_sub", { d: at(d.as_of, d.fetched_at) })}${live(d.fetched_at, co)}</div></div>`;
  s += where(d.total_gel, d.till);
  s += moves(co);
  s += card(t("cash.by_bank"), "", L.map((x, i) => {
    const key = `${co}|${x.bank}|${x.currency}`, acc = x.accounts_list || [], open = !!S.open[key] && acc.length > 0;
    const sub = `${t("cash.accounts", { n: num(x.accounts_nonzero) })} · ${at(x.as_of, x.fetched_at) === dt(x.as_of) ? span(x.as_of, x.as_of_newest) : at(x.as_of, x.fetched_at)}${x.currency !== "GEL" && x.fx_rate ? " · " + t("cash.rate", { r: num(x.fx_rate, 4) }) : ""}`;
    const value = x.currency === "GEL" ? gel(x.balance) : fxAmt(x.balance, x.currency) + `<small>${x.gel_equivalent == null ? "—" : gel(x.gel_equivalent)}</small>`;
    const bar = barRow(esc(tOr("bank." + x.bank, x.bank) + " · " + x.currency), sub, value, x.share);
    if (!acc.length) return bar;
    return `<div class="ca-b${open ? " on" : ""}" role="button" tabindex="0" data-ca="${esc(key)}" aria-expanded="${open}">${bar}<span class="chev">›</span></div>`
      + (open ? `<div class="ca-p">${acc.map((a) => row(`<span class="mono">${esc(a.account)}</span>`, a.fetched_at ? at(a.as_of, a.fetched_at) : dt(a.as_of),
          (x.currency === "GEL" ? gel(a.balance, 2) : fxAmt(a.balance, x.currency) + `<small>${a.gel == null ? "—" : gel(a.gel)}</small>`))).join("")}</div>` : "");
  }).join("") + (d.empty_accounts ? row(t("cash.zero"), t("cash.zero_sub"), `<span class="mut">${num(d.empty_accounts)}</span>`) : "")
    + (L.length ? "" : `<div class="empty">${esc(t("cash.none"))}</div>`));
  if (d.top_bank && d.top_bank.pct != null) s += `<div class="note">${t("cash.top_bank", { p: d.top_bank.pct, b: esc(tOr("bank_in." + d.top_bank.bank, d.top_bank.bank)) })}</div>`;
  return s;
}

// ---------------- „ფულის მოძრაობა" (otar-1011 §1.5) ----------------
// per company: open, the filter { p: 7 | 30 | m | r, from, to, bank }, the answer (rows of every page fetched), busy, err
const MV = { open: {}, f: {}, data: {}, busy: {}, err: {}, custom: {} };
const MINUS = "−";
const API = () => document.querySelector('meta[name="qesalo-api"]').content;
const flt = (co) => (MV.f[co] ||= { p: "30", from: null, to: null, bank: null });
const srcName = (b) => (b === "TILL" ? t("cash.till") : tOr("bank." + b, b));
const amt = (v, ccy) => { const a = Math.abs(Number(v) || 0), s = Number(v) < 0 ? MINUS : "+"; return s + (ccy && ccy !== "GEL" ? fxAmt(a, ccy) : gel(a, a < 100 && a % 1 ? 2 : 0)); };
const dayHead = (d) => `${dt(d)} · ${(t("cash.wd") || [])[new Date(d + "T00:00:00").getDay()] || ""}`;
// a word the function sends as w: cash.w.<w>, else the kind's word cash.kind.<w> (w: "wages" - a salary line „ხელფასი"
// alone for a level outside lib/cash-kinds.json wage_names, Otar's Q23)
const wWord = (w, dflt) => tOr("cash.w." + w, tOr("cash.kind." + w, dflt));
const whoText = (x) => (x.who ? esc(x.who) : x.w === "bank" ? esc(srcName(x.bank)) : esc(wWord(x.w, "—")));
// the row: who; „შემოვიდა · {bank} · {kind}" (no kind where who already says it: an exchange, own accounts); for admin /
// masters the bank's purpose text under it unless it only repeats the kind or who („ხელფასი", „ვალუტის გაცვლა")
const norm = (a) => String(a || "").replace(/[\s.]+/g, " ").trim().toLowerCase();
const same = (a, b) => norm(a) === norm(b);
function mrow(x) {
  const kind = tOr("cash.kind." + x.kind, x.kind), who = x.who || (x.w === "bank" ? srcName(x.bank) : wWord(x.w, ""));
  const c = `${esc(t(x.dir === "in" ? "cash.in" : "cash.out"))} · ${esc(srcName(x.bank))}${same(kind, who) ? "" : " · " + esc(kind)}`;
  const p = x.purpose && !same(x.purpose, kind) && !same(x.purpose, who) ? x.purpose : null;
  const v = x.currency === "GEL" ? amt(x.amount) : amt(x.amount, x.currency) + `<small>${x.gel == null ? "—" : amt(x.gel)}</small>`;
  return `<div class="row cm-row${x.dir === "in" ? " in" : ""}"><div class="row-m"><div class="row-t">${whoText(x)}</div><div class="row-c">${c}</div>`
    + (p ? `<div class="row-c cm-p">${esc(p)}</div>` : "") + `</div><div class="row-v">${v}</div></div>`;
}
function movesBody(co) {
  const f = flt(co), d = MV.data[co], pre = (p, k) => `<button data-cm-p="${co}|${p}" aria-pressed="${f.p === p}">${esc(mt(t("cash." + k)))}</button>`;
  let s = `<div class="cm-f"><div class="cm-seg">${pre("7", "p7")}${pre("30", "p30")}${pre("m", "pm")}<button data-cm-custom="${co}" aria-pressed="${f.p === "r" || !!MV.custom[co]}">${esc(mt(t("cash.pr")))}</button></div>`;
  if (MV.custom[co] || f.p === "r") {
    const max = new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10);
    s += `<div class="cm-in"><label><span>${esc(t("cash.from"))}</span><input type="date" data-cm-a="${co}" value="${esc(f.from || (d && d.from) || "")}" max="${max}"></label>`
      + `<label><span>${esc(t("cash.to"))}</span><input type="date" data-cm-z="${co}" value="${esc(f.to || (d && d.to) || "")}" max="${max}"></label><button data-cm-go="${co}">${esc(mt(t("cash.show")))}</button></div>`;
  }
  const banks = d ? (d.by_bank || []).map((b) => b.bank) : [];
  if (banks.length > 1) s += `<div class="cm-src">${[null, ...banks].map((b) => `<button data-cm-b="${co}|${b || ""}" aria-pressed="${(f.bank || null) === b}">${esc(b ? srcName(b) : t("cash.all"))}</button>`).join("")}</div>`;
  s += `</div>`;
  if (MV.err[co]) return s + `<div class="note">${esc(t("drill.err"))} <button class="cm-more" data-cm-retry="${co}">${esc(t("app.retry"))}</button></div>`;
  if (!d) return s + `<div class="note">${esc(t("drill.loading"))}</div>`;
  const T = d.totals || {};
  s += `<div class="grid2 cm-tot">${stat(esc(t("cash.in")), "+" + gel(T.in_gel || 0), esc(t("cash.ops", { n: num(T.n_in || 0) })))}${stat(esc(t("cash.out")), MINUS + gel(T.out_gel || 0), esc(t("cash.ops", { n: num(T.n_out || 0) })))}</div>`;
  if (!d.bank && (d.by_bank || []).length > 1) s += `<div class="cm-bb">${d.by_bank.map((b) => `<div>${esc(srcName(b.bank))}: +${gel(b.in_gel)} · ${MINUS}${gel(b.out_gel)}</div>`).join("")}</div>`;
  if ((T.fx_missing || []).length) s += `<div class="note">${esc(t("cash.fx_missing", { c: T.fx_missing.join(", ") }))}</div>`;
  const rows = d.rows || [];
  if (!rows.length) return s + `<div class="empty">${esc(t("cash.none_p"))}</div>`;
  let last = null;
  for (const x of rows) { if (x.day !== last) { s += `<div class="cm-day">${esc(dayHead(x.day))}</div>`; last = x.day; } s += mrow(x); }
  if (d.more) s += `<button class="cm-more" data-cm-more="${co}">${esc(t("cash.more_n", { n: 200 }))}</button>`;
  return s;
}
function moves(co) {
  const open = !!MV.open[co], busy = !!MV.busy[co];
  return `<div class="card cm${busy ? " cm-busy" : ""}" aria-busy="${busy}"><div class="row tap cm-h${open ? " on" : ""}" role="button" tabindex="0" data-cm-open="${co}" aria-expanded="${open}">`
    + `<div class="row-m"><div class="row-t cm-t">${esc(mt(t("cash.moves")))}</div></div><span class="chev">›</span></div>${open ? movesBody(co) : ""}</div>`;
}
// the movements of one company as the filter says; offset > 0 = the next 200 after the ones on screen
async function fetchMoves(co, offset = 0) {
  const f = flt(co), TG = window.Telegram && window.Telegram.WebApp;
  MV.busy[co] = true; MV.err[co] = null; redraw();
  try {
    const r = await fetch(API(), { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: TG ? TG.initData : "", tab: "cash", company: co, cash: { moves: { ...f, offset, only: true } } }) });
    const b = await r.json(); if (!r.ok || b.tab !== "cash") throw new Error(b.error || r.status);
    const m = (((b.sections || []).find((x) => x.company === co) || (b.sections || [])[0] || {}).data || {}).moves;
    if (!m) throw new Error("no moves");
    MV.data[co] = offset && MV.data[co] ? { ...m, rows: [...(MV.data[co].rows || []), ...(m.rows || [])] } : m;
    if (m.preset === "r") { f.from = m.from; f.to = m.to; }
  } catch (e) { MV.err[co] = String(e.message || e); }
  MV.busy[co] = false; redraw();
}
// the shell's params() hook: the open companies' filters go with every load of the tab (a switch, the live refresh)
export function params() {
  const open = Object.keys(MV.open).filter((c) => MV.open[c]);
  return open.length ? { cash: { moves: Object.fromEntries(open.map((c) => [c, { ...flt(c), offset: 0 }])) } } : null;
}

// the page draws each section once per tab load; a tap on a bank row redraws #view from the same sections
const P = { me: null, secs: [], pass: false };
export default function view(d, me, _t, co) {
  css();
  if (!P.pass) { P.pass = true; P.secs = []; S.open = {}; queueMicrotask(() => { P.pass = false; }); }
  P.me = me; P.secs.push({ company: co, data: d });
  // a load that carried this company's filter answers its movements (first page): the card stays open with them
  if (co) { MV.open[co] = !!(d && d.moves); if (d && d.moves) MV.data[co] = d.moves; MV.busy[co] = false; }
  return sheet(d, co);
}
function redraw() {
  const el = document.getElementById("view"); if (!el || !P.me) return;
  const on = document.querySelector(".tab.on"); if (on && on.dataset.t !== "cash") return;
  const both = P.me.scope === "both";
  el.innerHTML = (both ? `<div class="note">${t("app.both_note")}</div>` : "")
    + P.secs.map((x) => (both && x.company ? `<div class="co-h">${SYM[x.company] || ""} ${esc(P.me.companies[x.company].name)}</div>` : "") + sheet(x.data, x.company)).join("");
  caps(el);
}
if (typeof document !== "undefined" && !window.__cashView) {
  window.__cashView = true;
  const act = (el) => { const TG = window.Telegram && window.Telegram.WebApp; if (TG && TG.HapticFeedback) TG.HapticFeedback.selectionChanged(); S.open[el.dataset.ca] = !S.open[el.dataset.ca]; redraw(); };
  document.addEventListener("click", (e) => { const el = e.target.closest("[data-ca]"); if (el) act(el); });
  document.addEventListener("keydown", (e) => { const el = (e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("[data-ca]"); if (el) { e.preventDefault(); act(el); } });
  // „ფულის მოძრაობა": open / close, the period, a range, the source, the next 200
  const tick = () => { const TG = window.Telegram && window.Telegram.WebApp; if (TG && TG.HapticFeedback) TG.HapticFeedback.selectionChanged(); };
  const openMoves = (co) => { tick(); MV.open[co] = !MV.open[co]; if (MV.open[co]) fetchMoves(co); else redraw(); };
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-cm-open],[data-cm-p],[data-cm-custom],[data-cm-go],[data-cm-b],[data-cm-more],[data-cm-retry]");
    if (!el || !P.me) return;
    const ds = el.dataset;
    if (ds.cmOpen) return openMoves(ds.cmOpen);
    tick();
    if (ds.cmP) { const [co, p] = ds.cmP.split("|"); Object.assign(flt(co), { p, from: null, to: null }); MV.custom[co] = false; return fetchMoves(co); }
    if (ds.cmCustom) { MV.custom[ds.cmCustom] = !MV.custom[ds.cmCustom]; return redraw(); }
    if (ds.cmGo) {
      const co = ds.cmGo, a = (document.querySelector(`[data-cm-a="${co}"]`) || {}).value, z = (document.querySelector(`[data-cm-z="${co}"]`) || {}).value, ok = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x || "");
      if (!ok(a) || !ok(z)) return;
      Object.assign(flt(co), { p: "r", from: a <= z ? a : z, to: a <= z ? z : a }); return fetchMoves(co);
    }
    if (ds.cmB) { const [co, b] = ds.cmB.split("|"); flt(co).bank = b || null; return fetchMoves(co); }
    if (ds.cmMore) return fetchMoves(ds.cmMore, (MV.data[ds.cmMore]?.rows || []).length);
    if (ds.cmRetry) return fetchMoves(ds.cmRetry);
  });
  document.addEventListener("keydown", (e) => { const el = (e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("[data-cm-open]"); if (el) { e.preventDefault(); openMoves(el.dataset.cmOpen); } });
  // a typed date survives a redraw (it is sent only with „ჩვენება")
  document.addEventListener("change", (e) => { const el = e.target; if (!el || !el.dataset) return; if (el.dataset.cmA) flt(el.dataset.cmA).from = el.value || null; if (el.dataset.cmZ) flt(el.dataset.cmZ).to = el.value || null; });
  // the live dot leaves when its 3 minutes are over
  setInterval(() => { document.querySelectorAll("[data-live-until]").forEach((x) => { if (Number(x.dataset.liveUntil) <= Date.now()) x.remove(); }); }, 15e3);
  // the bank was re-read and nothing moved (mini/app.js: detail = { company, surface, at }): that company's dot lives on
  document.addEventListener("qesalo:checked", (e) => { const x = e.detail || {}, at = Date.parse(x.at); if (x.surface !== "cash" || !(at > 0)) return;
    if (x.company) CHECKED[x.company] = Math.max(CHECKED[x.company] || 0, at);
    document.querySelectorAll("[data-live-until]").forEach((el) => { if (!x.company || !el.dataset.liveCo || el.dataset.liveCo === x.company) el.dataset.liveUntil = String(Math.max(Number(el.dataset.liveUntil) || 0, at + LIVE_MS)); }); });
}

function css() {
  if (document.getElementById("ca-css")) return;
  const st = document.createElement("style"); st.id = "ca-css";
  st.textContent = `
.ca-b{position:relative;cursor:pointer;transition:background-color 90ms var(--step)}
.ca-b:active{background:var(--q-surface-2)}
.ca-b .row{padding-right:20px}
.ca-b>.chev{position:absolute;right:0;top:14px}
.ca-b.on{box-shadow:inset 3px 0 0 var(--q-ink)}
.ca-b.on .row{padding-left:9px}
.ca-b.on>.chev{transform:rotate(90deg)}
.ca-p{background:var(--q-surface-2);margin:0 -12px;padding:0 12px 4px;box-shadow:inset 3px 0 0 var(--q-ink)}
.ca-live{display:inline-flex;align-items:center;gap:5px;margin-left:6px;font-weight:600;color:var(--q-ink);white-space:nowrap}
.ca-live::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--q-good)}
.cm-h{position:relative}
.cm-h .cm-t{font:800 20px/23px var(--ff);font-stretch:62.5%;letter-spacing:.02em}
.cm-h.on{box-shadow:inset 3px 0 0 var(--q-ink);padding-left:9px}
.cm-h.on>.chev{transform:rotate(90deg)}
.cm-busy .cm-f~*{opacity:.45}
.cm-f{display:grid;gap:8px;padding:2px 0 10px}
.cm-seg,.cm-src{display:flex;border:3px solid var(--q-rule);background:var(--q-surface)}
.cm-src{flex-wrap:wrap;gap:1.5px;border-width:1.5px;background:var(--q-rule)}
.cm-seg button,.cm-src button{flex:1 1 0;min-width:0;min-height:44px;border:0;border-radius:0;background:var(--q-surface);padding:0 4px;font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.05em;color:var(--q-ink);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background-color 90ms var(--step),color 90ms var(--step)}
.cm-src button{flex:1 1 auto;min-height:40px;padding:0 8px;font-weight:600;letter-spacing:.03em}
.cm-seg button+button{border-left:1.5px solid var(--q-rule)}
.cm-seg button:active,.cm-src button:active{background:var(--q-surface-2)}
.cm-seg button[aria-pressed="true"],.cm-src button[aria-pressed="true"]{background:var(--q-invert);color:var(--q-on-invert)}
.cm-in{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;border:1.5px solid var(--q-rule);background:var(--q-rule);gap:1.5px}
.cm-in label{display:flex;flex-direction:column;background:var(--q-surface);padding:5px 8px 4px;min-width:0}
.cm-in label span{font:600 11px/13px var(--ff);font-stretch:75%;letter-spacing:.08em;color:var(--q-muted)}
.cm-in input{font:600 15px/22px var(--ff);color:var(--q-ink);background:transparent;border:0;border-radius:0;padding:0;min-width:0;width:100%;color-scheme:inherit}
.cm-in button{border:0;border-radius:0;background:var(--q-invert);color:var(--q-on-invert);padding:0 12px;min-height:46px;font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.05em;cursor:pointer}
.cm-tot{margin:0 -12px;border-top:1.5px solid var(--q-rule);border-bottom:1.5px solid var(--q-rule)}
.cm-bb{padding:6px 0 2px;font-size:12.5px;line-height:17px;color:var(--q-muted)}
.cm-day{margin:10px -12px 0;padding:6px 12px 5px;background:var(--q-surface-2);border-top:1.5px solid var(--q-rule);font:700 12px/15px var(--ff);font-stretch:75%;letter-spacing:.06em;color:var(--q-ink-2)}
.cm-day+.cm-row{border-top:0}
.cm-row.in{box-shadow:inset 3px 0 0 var(--q-ink);padding-left:9px}
.cm-row .row-t{overflow-wrap:anywhere}
.cm-p{font-size:12px;line-height:16px;overflow-wrap:anywhere}
.cm-more{border:1.5px solid var(--q-rule);border-radius:0;background:var(--q-surface);color:var(--q-ink);min-height:40px;padding:0 12px;margin:10px 0 8px;font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.05em;cursor:pointer}
`;
  document.head.appendChild(st);
}

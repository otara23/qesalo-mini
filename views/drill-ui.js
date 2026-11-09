// The tap-to-detail of the ბუღალტერია and საბრუნავი tabs (wave W-DRILL, plans/bot-v3.md §3.4, §3.5, 9.11.2026) - not a
// tab (the hyphen keeps mini/app.js from loading it as one); mini/views/books.js and wc.js import it. An account opens
// to the months it has lines in (turnover, the month-end balance where the books give it right), a month to its lines
// (date, the other side, document, amount, the running balance), 40 lines a page. Each open asks the `mini` function
// itself (the same endpoint and body as mini/app.js, plus `drill: { op, ... }`) and draws into the slot under the row;
// nothing is fetched before a tap. The data: mini/functions/mini/drill.ts (walls, masking, exactness are decided there).
// Design C: rows on one sheet, a 3 px ink rule marks the open level (no indentation - the phone is narrow), condensed
// tabular figures, nothing eases (90 ms two-frame steps), 44 px targets.
import { t, esc, num, dt, caps, SYM } from "../ui.js?v=86cc6d3.202611091626";

const L = (k, p) => t("drill." + k, p);
const MINUS = "−";
const API = () => document.querySelector('meta[name="qesalo-api"]').content;
export const sgn = (v, d = 2) => (Number(v) < 0 ? MINUS : Number(v) > 0 ? "+" : "") + num(Math.abs(Number(v) || 0), d);
export const amt = (v, d = 2) => (Number(v) < 0 ? MINUS : "") + num(Math.abs(Number(v) || 0), d);
// compact figures for the matrix cells: 1.5 მლნ, 820 ათ., 640
export function cpt(v) {
  const a = Math.abs(Number(v) || 0), s = Number(v) < 0 ? MINUS : "";
  if (!a) return "";
  if (a >= 1e6) return s + (a >= 1e7 ? Math.round(a / 1e6) : Math.round(a / 1e5) / 10) + " " + L("u_m");
  if (a >= 1e3) return s + Math.round(a / 1e3) + " " + L("u_k");
  return s + Math.round(a);
}
// a bank account in ORIS is named by its IBAN first: on screen the last four digits are enough (the data keeps what the
// function sent; for non-admins it is already masked there) - mini/views/pnl.js acctName's rule
export const acctName = (n) => String(n || "").replace(/\bGE\d{2}[A-Z]{2}\d{12}(\d{4})\b\s*-?\s*/g, "…$1 · ").replace(/\bGE…(\d{4})\s*-?\s*/g, "…$1 · ");
export const monShort = (ym) => t("mon_short")[Number(String(ym).slice(5, 7)) - 1] || "";
export const monLong = (ym) => (t("month")[Number(String(ym).slice(5, 7)) - 1] || "") + " " + String(ym).slice(0, 4);

// ---------------- state: what is open, what was fetched ----------------
// key of a slot: <company>|<tab>|<op>|<account>|<month>; S.data[key] = the drill answer (or { err }), S.open[key] = shown
const S = { data: {}, open: {}, busy: {}, page: {}, more: {} };
export const resetDrill = () => { S.data = {}; S.open = {}; S.busy = {}; S.page = {}; S.more = {}; };
const k = (...a) => a.map((x) => (x == null ? "" : String(x))).join("|");

async function call(company, tab, drill) {
  const TG = window.Telegram && window.Telegram.WebApp;
  const r = await fetch(API(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: TG ? TG.initData : "", tab, company, drill }) });
  const b = await r.json(); if (!r.ok || b.tab !== tab) throw new Error(b.error || r.status);
  const sec = (b.sections || []).find((x) => x.company === company) || (b.sections || [])[0] || {};
  return (sec.data && sec.data.drill) || {};
}

// ---------------- drawing ----------------
// an account row that opens to its months: ctx = { co, tab, sign (1, or -1 where a credit balance reads as a positive
// debt: the wc payables), can (the person may open lines) }
export function accountRow(ctx, a, right, sub) {
  const key = k(ctx.co, ctx.tab, "account", a.account), open = !!S.open[key];
  const name = a.name ? esc(acctName(a.name)) : `<span class="mut">${esc(a.account)}</span>`;
  const head = `<div class="dr-a${open ? " on" : ""}${ctx.can ? "" : " no"}"${ctx.can ? ` role="button" tabindex="0" data-dr="${esc(key)}" aria-expanded="${open}"` : ""}>`
    + `<span class="n">${name}<small><span class="c">${esc(a.account)}</span>${sub ? " · " + sub : ""}</small></span><span class="v">${right}</span>${ctx.can ? `<span class="chev">›</span>` : ""}</div>`;
  return head + (open ? `<div class="dr-p">${accountBody(ctx, a.account)}</div>` : "");
}
function accountBody(ctx, account) {
  const key = k(ctx.co, ctx.tab, "account", account), d = S.data[key];
  if (!d) return `<div class="dr-l mut">${esc(L("loading"))}</div>`;
  if (d.err) return `<div class="dr-l mut">${esc(L("err"))} <button class="dr-btn" data-dr-retry="${esc(key)}">${esc(t("app.retry"))}</button></div>`;
  if (d.refused || !(d.months || []).length) return `<div class="dr-l mut">${esc(L("no_lines"))}</div>`;
  const sg = ctx.sign || 1, more = S.more[key] || 12, months = d.months.slice(0, more);
  let s = `<div class="dr-h">${esc(L("months_h", { n: d.months.length }))}${d.balance != null ? ` · ${esc(L("balance"))} <b>${amt(sg * d.balance)}</b>` : ` · ${esc(L("no_balance"))}`}</div>`;
  for (const m of months) {
    const mk = k(ctx.co, ctx.tab, "lines", account, m.m), open = !!S.open[mk];
    s += `<div class="dr-m${open ? " on" : ""}" role="button" tabindex="0" data-dr="${esc(mk)}" aria-expanded="${open}">`
      + `<span class="n">${esc(monLong(m.m))}<small>${esc(L("lines_n", { n: num(m.lines) }))}</small></span>`
      + `<span class="v"><span>${esc(L("d"))} ${num(m.debit, 2)}</span><span>${esc(L("c"))} ${num(m.credit, 2)}</span>${m.close != null ? `<span class="b">${esc(L("close"))} ${amt(sg * m.close)}</span>` : ""}</span><span class="chev">›</span></div>`
      + (open ? `<div class="dr-p2">${linesBody(ctx, account, m.m)}</div>` : "");
  }
  if (d.months.length > more) s += `<button class="dr-btn" data-dr-more="${esc(key)}">${esc(L("more_months", { n: d.months.length - more }))}</button>`;
  return s;
}
function linesBody(ctx, account, month) {
  const key = k(ctx.co, ctx.tab, "lines", account, month), d = S.data[key];
  if (!d) return `<div class="dr-l mut">${esc(L("loading"))}</div>`;
  if (d.err) return `<div class="dr-l mut">${esc(L("err"))} <button class="dr-btn" data-dr-retry="${esc(key)}">${esc(t("app.retry"))}</button></div>`;
  if (!(d.lines || []).length) return `<div class="dr-l mut">${esc(L("no_lines"))}</div>`;
  const sg = ctx.sign || 1;
  let s = d.opening != null && d.page === d.pages - 1 ? `<div class="dr-l dr-o"><span class="d"></span><span class="w">${esc(L("opening", { m: monLong(month) }))}</span><span class="v"><b>${amt(sg * d.opening)}</b></span></div>` : "";
  const rows = d.lines.map((l) => {
    const other = l.other_name ? esc(acctName(l.other_name)) : esc(l.other || "");
    const bits = [l.doc ? esc(L("doc", { d: l.doc })) : "", l.story ? esc(l.story) : "", l.qty != null ? esc(num(sg * l.qty, Number.isInteger(Number(l.qty)) ? 0 : 2) + " " + (l.unit || "")) : "",
      l.amount_ccy != null ? esc(sgn(sg * l.amount_ccy) + " " + (l.currency || "")) : ""].filter(Boolean).join(" · ");
    return `<div class="dr-l"><span class="d">${esc(dt(l.day))}</span><span class="w">${other}${bits ? `<small>${bits}</small>` : ""}</span>`
      + `<span class="v">${sgn(sg * l.amount)}${l.bal != null ? `<small>${amt(sg * l.bal)}</small>` : ""}</span></div>`;
  });
  // newest first on screen; the opening (the balance before the month's first line) closes the last page
  s = rows.join("") + s;
  const head = `<div class="dr-h">${esc(L("month_h", { m: monLong(month), n: num(d.total) }))} · ${esc(L("d"))} ${num(d.debit, 2)} · ${esc(L("c"))} ${num(d.credit, 2)}${d.exact ? "" : " · " + esc(L("no_balance"))}</div>`;
  const pager = d.pages > 1 ? `<div class="dr-pg"><button class="dr-btn" data-dr-page="${esc(key)}|${d.page - 1}"${d.page <= 0 ? " disabled" : ""} aria-label="${esc(L("newer"))}">‹</button>`
    + `<span>${esc(L("page", { p: d.page + 1, n: d.pages }))}</span><button class="dr-btn" data-dr-page="${esc(key)}|${d.page + 1}"${d.page >= d.pages - 1 ? " disabled" : ""} aria-label="${esc(L("older"))}">›</button></div>` : "";
  return head + s + pager;
}

// ---------------- the clicks (once per page; mini/app.js's own attributes are not used here) ----------------
// redraw(): the view's own redraw of #view (each view registers one while it is on screen)
let REDRAW = null;
export const onRedraw = (f) => { REDRAW = f; };
const redraw = () => { if (REDRAW) REDRAW(); };
function parse(key) { const [co, tab, op, account, month] = key.split("|"); return { co, tab, op, account, month }; }
async function fetchSlot(key, page) {
  const x = parse(key);
  S.busy[key] = true; S.data[key] = null; redraw();
  try {
    S.data[key] = await call(x.co, x.tab, x.op === "lines" ? { op: "lines", account: x.account, month: x.month, page: page || 0 } : { op: x.op, account: x.account, cls: x.account });
  } catch (e) { S.data[key] = { err: String(e.message || e) }; }
  S.busy[key] = false; redraw();
}
export function toggle(key) {
  S.open[key] = !S.open[key];
  if (S.open[key] && (!S.data[key] || S.data[key].err) && !S.busy[key]) return fetchSlot(key, S.page[key] || 0);
  redraw();
}
// a slot whose data came with the tab (the wc's six rows): open / close, nothing fetched
export function toggleLocal(key) { S.open[key] = !S.open[key]; redraw(); }
// a class's accounts (books): its own slot data, fetched the same way
export const slot = (key) => S.data[key];
export const isOpen = (key) => !!S.open[key];
export const keyOf = k;
if (typeof document !== "undefined" && !window.__drillUi) {
  window.__drillUi = true;
  const act = (e) => {
    const el = e.target.closest("[data-dr],[data-dr-more],[data-dr-page],[data-dr-retry]");
    if (!el) return false;
    const TG = window.Telegram && window.Telegram.WebApp; if (TG && TG.HapticFeedback) TG.HapticFeedback.selectionChanged();
    const ds = el.dataset;
    if (ds.drMore) { S.more[ds.drMore] = (S.more[ds.drMore] || (parse(ds.drMore).op === "class" ? 40 : 12)) + (parse(ds.drMore).op === "class" ? 40 : 12); redraw(); return true; }
    if (ds.drPage) { const i = ds.drPage.lastIndexOf("|"), key = ds.drPage.slice(0, i), p = Number(ds.drPage.slice(i + 1)); S.page[key] = p; fetchSlot(key, p); return true; }
    if (ds.drRetry) { fetchSlot(ds.drRetry, S.page[ds.drRetry] || 0); return true; }
    if (ds.dr) { toggle(ds.dr); return true; }
    return false;
  };
  document.addEventListener("click", (e) => { act(e); });
  document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("[data-dr]")) { e.preventDefault(); act(e); } });
}
export const moreOf = (key, d) => S.more[key] || d;

// ---------------- the view's sections and its redraw ----------------
// mini/app.js calls a view once per company section (twice under „ორივე") and then never again until the next tab
// load; a tap here redraws #view from the same sections. A new pass (a tab load) closes everything that was open.
const P = { tab: null, me: null, secs: [], pass: false, render: null };
export function section(tab, me, co, d, render) {
  if (!P.pass || P.tab !== tab) { P.pass = true; P.tab = tab; P.secs = []; resetDrill(); queueMicrotask(() => { P.pass = false; }); }
  P.me = me; P.render = render; P.secs.push({ company: co, data: d });
  onRedraw(redrawAll);
  return render(d, co);
}
function redrawAll() {
  const el = document.getElementById("view"); if (!el || !P.me || !P.render) return;
  const on = document.querySelector(".tab.on"); if (on && on.dataset.t !== P.tab) return;   // another tab is on screen now
  const both = P.me.scope === "both";
  el.innerHTML = (both ? `<div class="note">${t("app.both_note")}</div>` : "")
    + P.secs.map((x) => (both && x.company ? `<div class="co-h">${SYM[x.company] || ""} ${esc(P.me.companies[x.company].name)}</div>` : "") + P.render(x.data, x.company)).join("");
  caps(el);
}
export const redrawView = () => redrawAll();

// the styles (once; design C's tokens from mini/index.html)
export function drillCss() {
  if (document.getElementById("dr-css")) return;
  const st = document.createElement("style"); st.id = "dr-css";
  st.textContent = `
.dr-a,.dr-m{display:grid;grid-template-columns:minmax(0,1fr) auto 14px;gap:8px;align-items:center;min-height:44px;padding:6px 0;border-top:1px solid var(--q-rule-light);cursor:pointer;transition:background-color 90ms var(--step)}
.dr-a.no{grid-template-columns:minmax(0,1fr) auto;cursor:default}
.dr-a:active,.dr-m:active{background:var(--q-surface-2)}
.dr-a.on,.dr-m.on{box-shadow:inset 3px 0 0 var(--q-ink);padding-left:9px}
.dr-a.on .chev,.dr-m.on .chev{transform:rotate(90deg)}
.dr-a .c{font-variant-numeric:tabular-nums;letter-spacing:.02em}
.dr-p .dr-p{border-bottom:1.5px solid var(--q-rule-light);margin-bottom:0}
.dr-a .n,.dr-m .n{min-width:0;font-size:13.5px;line-height:18px;overflow:hidden;text-overflow:ellipsis}
.dr-a .n{white-space:nowrap}
.dr-a .n small{white-space:normal}
.dr-a .n small,.dr-m .n small{display:block;font-size:12px;line-height:15px;color:var(--q-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dr-a .v,.dr-m .v{font-size:13.5px;font-weight:600;white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums}
.dr-a .v small{display:block;font-size:11.5px;font-weight:400;color:var(--q-muted)}
.dr-m{grid-template-columns:minmax(0,1fr) auto 14px}
.dr-m .v span{display:block;font-size:12px;line-height:15px;font-weight:400;color:var(--q-ink-2)}
.dr-m .v span.b{font-weight:600;color:var(--q-ink)}
.dr-p,.dr-p2{background:var(--q-surface-2);margin:0 -12px;padding:2px 12px 8px;border-top:1px solid var(--q-rule-light);box-shadow:inset 3px 0 0 var(--q-ink)}
.dr-p2{background:var(--q-surface);margin:0 -12px;box-shadow:inset 6px 0 0 var(--q-rule-light)}
.dr-h{font:600 11px/14px var(--ff);font-stretch:75%;letter-spacing:.06em;color:var(--q-muted);padding:8px 0 5px}
.dr-h b{color:var(--q-ink);font-weight:700}
.dr-l{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:8px;align-items:baseline;padding:6px 0;border-top:1px solid var(--q-rule-light);font-size:13px;line-height:17px}
.dr-l.mut{display:block;color:var(--q-muted)}
.dr-l .d{color:var(--q-muted);font-size:12px;white-space:nowrap}
.dr-l .w{min-width:0;overflow-wrap:anywhere;font-weight:500;color:var(--q-ink)}
.dr-l .w small{display:block;font-size:12px;font-weight:400;color:var(--q-muted)}
.dr-l .v{font-weight:600;white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums}
.dr-l .v small{display:block;font-weight:400;font-size:11.5px;color:var(--q-muted)}
.dr-o{border-top:1.5px solid var(--q-rule)}
.dr-btn{border:1.5px solid var(--q-rule);border-radius:0;background:var(--q-surface);color:var(--q-ink);min-height:36px;min-width:44px;padding:0 12px;margin-top:8px;font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.05em;cursor:pointer}
.dr-btn:disabled{color:var(--q-rule-light);border-color:var(--q-rule-light);cursor:default}
.dr-pg{display:flex;align-items:center;gap:10px;justify-content:center;padding-top:2px}
.dr-pg span{font:600 12px/15px var(--ff);font-stretch:75%;color:var(--q-muted);margin-top:8px}
`;
  document.head.appendChild(st);
}

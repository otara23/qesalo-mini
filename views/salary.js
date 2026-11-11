// ხელფასი - the salary tab of both companies (saltab, plans/salary-tab.md §6; Otar 10.11.2026). The data:
// mini/functions/mini/salary.ts (the books' months by schema/045, the bank's people; the wall applied there).
// Top to bottom: the period (ეს წელი · 12 თვე · 24 თვე · პერიოდი); the hero - the period's accrued wages with what was paid
// out and the company's total cost; two cells - people (the last month with an accrual) and what is still to pay (the
// books' wages payable: check = all paid, ring = still to pay, triangle = paid more than accrued); „დინამიკა" - accrued
// and paid out, two columns a month on one axis, the table twin; „თვეები" - a row a month, its sheet the month's books in
// plain words (zero lines not drawn); „ადამიანები" (never the investor - the function does not send them) - who was paid,
// when last and how much, the nursery's status from its sub-account; the title block with the sources.
// A difference between the books and the bank is never drawn here - it is the accountant's nag (lib/nag.mjs N8-N10).
// No „ხელზე ასაღები" (net to pay) line per month (spec §6.5 had one): both companies book the income tax and the pension
// when the wages are paid - the next month - so a month's gross less that month's withholdings mixes two months
// (measured: the nursery's August would read „net 10 842" with 8 500 paid; main's November „−16 150"). The sheet lists the
// month's lines as the books hold them; main's „{month} ხელფასი გადახდილია {d}" (paid_for) says when that month was paid.
// Design C „ნახაზი": zero radius, 1.5 / 3 px rules, status = shape + word, colour never on a number, 90 ms two-frame steps.
import { t, esc, num, gel, dt, mt, caps } from "../ui.js?v=5aaf2cc.202611110820";

const L = (k, p) => t("salary." + k, p);
const MINUS = "−";
const sg = (v, d = 0) => (Number(v) < 0 ? MINUS : "") + gel(Math.abs(Number(v) || 0), d);
const S = { me: null, secs: [], pass: false, q: null, custom: false, sel: {}, tbl: {}, all: {}, reload: null };
const FIRST = 15;   // people drawn before „ყველა (n)"
const mon = (m) => t("mon_short")[Number(String(m).slice(5, 7)) - 1] || "";
const monthLong = (m) => (t("month")[Number(String(m).slice(5, 7)) - 1] || "") + " " + String(m).slice(0, 4);
const dY = (s, today) => (!s ? "—" : dt(s) + (String(s).slice(0, 4) !== String(today || "").slice(0, 4) ? " " + String(s).slice(0, 4) : ""));
const paidOf = (x) => (Number(x.paid_bank) || 0) + (Number(x.paid_till) || 0);
const KEYS = ["gross", "inc_tax", "pension_ee", "pension_er", "paid_bank", "paid_till", "deductions", "other_dr", "other"];
const active = (x) => KEYS.some((k) => Number(x[k])) || x.paid_for;
// the months from the first to the last one with anything in it (a company that started mid-period, or whose books
// have not reached this month yet, has no empty columns at the ends)
function span(months) { const i = months.findIndex(active); if (i < 0) return []; let j = months.length - 1; while (j > i && !active(months[j])) j--; return months.slice(i, j + 1); }

function periodWord(P) {
  if (!P) return "";
  if (P.preset === "y") return P.from.slice(0, 4);
  return mon(P.from) + " " + P.from.slice(0, 4) + " – " + mon(P.to) + " " + P.to.slice(0, 4);
}

// ---------------- the period (once per sheet) ----------------
function filter(P) {
  const b = (k, w) => `<button data-sl-p="${k}" aria-pressed="${!S.custom && P.preset === k}">${mt(L(w))}</button>`;
  const custom = S.custom || P.preset === "r";
  let s = `<div class="sl-f"><div class="sl-seg">${b("y", "p_year")}${b("12", "p12")}${b("24", "p24")}<button data-sl-custom="1" aria-pressed="${custom}">${mt(L("pr"))}</button></div>`;
  if (custom) s += `<div class="sl-in"><label><span>${esc(L("from"))}</span><input type="month" id="sl-a" value="${P.from}" max="${P.to}"></label>`
    + `<label><span>${esc(L("to"))}</span><input type="month" id="sl-b" value="${P.to}"></label><button data-sl-go="1">${mt(L("show"))}</button></div>`;
  return s + `</div>`;
}

// ---------------- the hero and the two cells ----------------
function hero(d) {
  const T = d.totals;
  return `<div class="hero sl-hero"><div class="hero-l">${esc(L("hero"))}</div><div class="hero-v">${sg(T.gross)}</div>`
    + `<div class="hero-s">${esc(L("hero_s", { p: periodWord(d.period), paid: gel(paidOf(T)), cost: gel(T.cost) }))}</div></div>`;
}
function cells(d) {
  const b = Number(d.balance) || 0;
  const due = Math.abs(b) <= 1 ? `<span class="dot ok"></span>${esc(L("due_ok"))}` : b > 0 ? `<span class="dot info"></span>${esc(L("due_t"))}` : `<span class="dot warn"></span>${esc(L("due_over"))}`;
  return `<div class="grid2"><div class="stat"><div class="stat-l">${esc(L("people_n"))}</div><div class="stat-v">${num(d.headcount_now)}</div>`
    + `<div class="stat-s">${esc(d.headcount_month ? monthLong(d.headcount_month) : "")}</div></div>`
    + `<div class="stat"><div class="stat-l">${esc(L("due_t"))}</div><div class="stat-v">${gel(Math.abs(b) <= 1 ? 0 : Math.abs(b))}</div><div class="stat-s sl-st">${due}</div></div></div>`;
}

// ---------------- the chart: paired columns on one axis (the pnl idiom, own classes) ----------------
function niceStep(x) { const e = Math.pow(10, Math.floor(Math.log10(x || 1))), f = x / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; }
function cpt(v) { const a = Math.abs(v); return a >= 1e6 ? (Math.round(a / 1e5) / 10) + " " + L("u_m") : a >= 1e3 ? Math.round(a / 1e3) + " " + L("u_k") : String(Math.round(a)); }
function chart(co, ms) {
  const vals = ms.flatMap((x) => [Number(x.gross) || 0, paidOf(x)]), hi0 = Math.max(1, ...vals), step = niceStep(hi0 / 3), hi = Math.ceil(hi0 / step) * step;
  const y = (v) => (Math.max(0, v) / hi) * 100, sel = S.sel[co] ?? ms.length - 1, every = ms.length > 12 ? Math.ceil(ms.length / 8) : 1;
  const ticks = []; for (let v = 0; v <= hi + step / 2; v += step) ticks.push(v);
  const grid = ticks.map((v) => `<div class="sl-g${v === 0 ? " z" : ""}" style="bottom:${y(v).toFixed(2)}%"><span>${cpt(v)}</span></div>`).join("");
  const cols = ms.map((x, i) => `<button class="sl-col${i === sel ? " on" : ""}" data-sl-sel="${co}|${i}" aria-pressed="${i === sel}" aria-label="${esc(L("chart_aria", { m: monthLong(x.m), g: gel(x.gross), p: gel(paidOf(x)) }))}">`
    + `<span class="sl-pair"><span><i class="sl-a" style="height:${y(x.gross).toFixed(2)}%"></i></span><span><i class="sl-b" style="height:${y(paidOf(x)).toFixed(2)}%"></i></span></span></button>`).join("");
  const edge = (sel + 0.5) / ms.length > 0.82 ? " r" : (sel + 0.5) / ms.length < 0.18 ? " l" : "";
  const lab = ms[sel] ? `<div class="sl-lab${edge}" style="left:${((sel + 0.5) / ms.length * 100).toFixed(2)}%">${cpt(Math.max(Number(ms[sel].gross) || 0, paidOf(ms[sel])))}</div>` : "";
  const xs = ms.map((x, i) => `<span${i === sel ? ' class="on"' : ""}>${i % every === 0 || i === sel ? esc(mon(x.m) + (x.m.slice(5) === "01" && ms.length > 1 && ms.length <= 8 ? " " + x.m.slice(2, 4) : "")) : ""}</span>`).join("");
  const leg = `<div class="sl-leg"><span><i class="sl-k a"></i>${esc(L("c_gross"))}</span><span><i class="sl-k b"></i>${esc(L("c_paid"))}</span></div>`;
  const tb = !S.tbl[co] ? `<button class="sl-more" data-sl-tbl="${co}">${esc(L("table"))}</button>`
    : `<button class="sl-more" data-sl-tbl="${co}">${esc(L("table_hide"))}</button><table class="sl-t"><thead><tr><th>${esc(L("col_m"))}</th><th>${esc(L("c_gross"))}</th><th>${esc(L("c_paid"))}</th></tr></thead><tbody>`
      + ms.map((x) => `<tr><td>${esc(monthLong(x.m))}</td><td>${gel(x.gross)}</td><td>${gel(paidOf(x))}</td></tr>`).join("") + `</tbody></table>`;
  return `<div class="card sl-ch"><div class="card-h"><div class="card-t">${esc(L("chart"))}</div></div>${leg}<div class="sl-plot">${grid}<div class="sl-cols">${cols}</div>${lab}</div><div class="sl-x">${xs}</div>${tb}</div>`;
}

// ---------------- the months ----------------
const kv = (k, v, strong) => `<div${strong ? ' class="sl-sum"' : ""}><span>${esc(k)}</span><b>${v}</b></div>`;
function monthSheet(x, today) {
  let h = "";
  if (Number(x.gross)) h += kv(L("gross"), gel(x.gross));
  if (Number(x.inc_tax)) h += kv(L("inc_tax"), gel(x.inc_tax));
  if (Number(x.pension_ee)) h += kv(L("pens_ee"), gel(x.pension_ee));
  if (Number(x.pension_er)) h += kv(L("pens_er"), gel(x.pension_er));
  if (Number(x.deductions)) h += kv(L("deduct"), gel(x.deductions));
  if (Number(x.paid_bank)) h += kv(L("paid_bank"), gel(x.paid_bank));
  if (Number(x.paid_till)) h += kv(L("paid_till"), gel(x.paid_till));
  if (x.paid_for) h += `<p class="sl-p">${esc(L("paid_for", { m: (L("mg") || [])[Number(x.m.slice(5, 7)) - 1] || monthLong(x.m), d: dY(x.paid_for.last, today) }))}</p>`;
  if (Number(x.cost)) h += kv(L("cost"), gel(x.cost), true);
  if (Number(x.to_wip) > 0) h += `<p class="sl-p">${esc(L("wip", { v: gel(x.to_wip) }))}</p>`;
  return h;
}
function months(co, d, ms) {
  const today = d.books_to, rows = ms.slice().reverse().filter(active), selM = ms[S.sel[co] ?? ms.length - 1]?.m;
  const body = rows.map((x) => {
    const id = `sl-${co}-m-${x.m}`, open = S.sel[co] != null && x.m === selM;
    const c = L("row_c", { n: num(x.headcount), paid: gel(paidOf(x)) });
    return `<div class="row tap sl-row${open ? " open-r" : ""}" data-det="${id}"><div class="row-m"><div class="row-t">${esc(monthLong(x.m))}</div><div class="row-c">${esc(c)}</div></div>`
      + `<div class="row-v">${gel(x.gross)}</div><span class="chev">›</span></div><div class="det${open ? " open" : ""}" id="det${id}">${monthSheet(x, today)}</div>`;
  }).join("");
  return `<div class="card"><div class="card-h"><div class="card-t">${esc(L("months"))}</div><div class="card-n">${esc(L("months_n", { n: num(rows.length) }))}</div></div>${body}</div>`;
}

// ---------------- the people (admin, masters, the accountant) ----------------
function personSheet(p, today) {
  let h = p.months.map((m) => `<div><span>${esc(monthLong(m.m))} · ${esc(m.banks.join(", "))}</span><b>${m.n > 1 ? `<small>${esc(L("n_pay", { n: num(m.n) }))}</small> ` : ""}${gel(m.gel)}</b></div>`).join("");
  if (p.books && p.books.length) h += `<div class="sl-h">${esc(L("books_h"))}</div>` + p.books.map((b) => `<p class="sl-p"><b>${esc(monthLong(b.m))}</b> · ${esc(L("books_side", { g: gel(b.gross), t: gel(b.inc_tax), p: gel(b.pension_ee), n: gel(b.paid) }))}</p>`).join("");
  return h;
}
function status(p) {
  const s = p.status; if (!s) return "";
  const b = Number(s.balance) || 0;
  return Math.abs(b) <= 1 ? `<span class="sl-st"><span class="dot ok"></span>${esc(L("st_paid"))}</span>`
    : b > 0 ? `<span class="sl-st"><span class="dot info"></span>${esc(L("st_due", { v: gel(b) }))}</span>` : `<span class="sl-st"><span class="dot warn"></span>${esc(L("due_over"))}</span>`;
}
function people(co, d) {
  const xs = d.people || [];
  if (!xs.length) return "";
  const all = S.all[co], shown = all ? xs : xs.slice(0, FIRST), max = Math.max(...xs.map((p) => p.paid)) || 1, today = d.bank_to;
  const body = shown.map((p) => {
    const id = `sl-${co}-p-${p.id}`, sub = `<span class="nw">${esc(L("last_paid", { d: dY(p.last && p.last.day, today) }))}</span> · ${esc(L("months_paid", { n: num(p.months.length) }))}`;
    return `<div class="row tap sl-row" data-det="${id}"><div class="row-m"><div class="row-t">${esc(p.name)}</div><div class="row-c">${sub}${status(p) ? "<br>" + status(p) : ""}</div>`
      + `<div class="bar"><i style="width:${Math.max(0.6, 100 * p.paid / max).toFixed(1)}%"></i></div></div><div class="row-v">${gel(p.paid)}</div><span class="chev">›</span></div>`
      + `<div class="det" id="det${id}">${personSheet(p, today)}</div>`;
  }).join("") + (!all && xs.length > FIRST ? `<button class="sl-more sl-all" data-sl-all="${co}">${esc(L("all_n", { n: num(xs.length) }))}</button>` : "");
  return `<div class="card"><div class="card-h"><div class="card-t">${esc(L("people"))}</div><div class="card-n">${num(xs.length)}</div></div>${body}</div>`;
}

// ---------------- one company's section ----------------
function section(d, co) {
  if (!d || d.empty === "no_access") return "";
  if (d.empty === "none") return `<div class="card"><div class="empty">${esc(L("none"))}</div></div>`;
  const ms = span(d.months || []), inv = !("people" in d);
  if (!ms.length) return `<div class="card"><div class="empty">${esc(L("none"))}</div></div>`;
  const src = inv ? L("src_inv", { b: dt(d.books_to) + " " + String(d.books_to || "").slice(0, 4) })
    : L("src", { b: dt(d.books_to) + " " + String(d.books_to || "").slice(0, 4), k: dt(d.bank_to) + " " + String(d.bank_to || "").slice(0, 4) });
  return hero(d) + cells(d) + chart(co, ms) + months(co, d, ms) + (inv ? "" : people(co, d))
    + `<div class="sl-tb"><div>${esc(src)}</div><div>${esc(L(d.headcount_src === "books" ? "src_hc_books" : "src_hc_bank"))}</div></div>`;
}

// the shell's params() hook: the period on screen goes with every load of this tab (the company switch, the live refresh)
export function params() { return S.q ? { salary: S.q } : null; }
export function mount(_el, { reload }) { S.reload = reload; }
export default function view(d, me, _t, co) {
  css();
  if (!S.pass) { S.pass = true; S.secs = []; queueMicrotask(() => { S.pass = false; }); }
  S.me = me; S.secs.push({ company: co, data: d });
  if (d && d.period && !S.q) S.q = { p: d.period.preset, from: d.period.from, to: d.period.to };
  const f = S.secs.length === 1 && d && d.period ? filter(d.period) : "";
  return f + `<div class="sl" data-slsec="${esc(co || "")}">${section(d, co)}</div>`;
}
// a column tap, the table or „ყველა" redraws the section from the data already here (no new request)
function draw(co) {
  const x = S.secs.find((s) => s.company === co); if (!x) return;
  const el = document.querySelector(`[data-slsec="${co}"]`); if (!el) return;
  const open = [...el.querySelectorAll(".det.open")].map((e) => e.id).filter((id) => !id.includes("-m-"));
  el.innerHTML = section(x.data, co); caps(el);
  for (const id of open) { const e = document.getElementById(id), r = el.querySelector(`[data-det="${id.slice(3)}"]`); if (e) e.classList.add("open"); if (r) r.classList.add("open-r"); }
}
function ask(q) { S.q = q; S.custom = false; S.sel = {}; if (S.reload) S.reload({ salary: q }); }
if (typeof document !== "undefined" && !window.__salaryView) {
  window.__salaryView = true;
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-sl-p],[data-sl-custom],[data-sl-go],[data-sl-sel],[data-sl-tbl],[data-sl-all]");
    if (!el || !S.me) return;
    const TG = window.Telegram && window.Telegram.WebApp; if (TG && TG.HapticFeedback) TG.HapticFeedback.selectionChanged();
    const ds = el.dataset;
    if (ds.slP) return ask({ p: ds.slP });
    if (ds.slCustom) { S.custom = !S.custom; const f = document.querySelector(".sl-f"), P = S.secs[0] && S.secs[0].data && S.secs[0].data.period; if (f && P) { f.outerHTML = filter(P); caps(document.getElementById("view")); } return; }
    if (ds.slGo) { const a = document.getElementById("sl-a").value, b = document.getElementById("sl-b").value; if (/^\d{4}-\d{2}$/.test(a) && /^\d{4}-\d{2}$/.test(b)) ask({ p: "r", from: a <= b ? a : b, to: a <= b ? b : a }); return; }
    if (ds.slSel) { const [co, i] = ds.slSel.split("|"); S.sel[co] = Number(i); return draw(co); }
    if (ds.slTbl) { S.tbl[ds.slTbl] = !S.tbl[ds.slTbl]; return draw(ds.slTbl); }
    if (ds.slAll) { S.all[ds.slAll] = true; return draw(ds.slAll); }
  });
}

// the styles of this view (once; design C's tokens from mini/index.html)
function css() {
  if (typeof document === "undefined" || document.getElementById("sl-css")) return;
  const st = document.createElement("style"); st.id = "sl-css";
  st.textContent = `
.sl-f{padding:10px 12px 12px;display:grid;gap:8px}
.sl-seg{display:flex;border:3px solid var(--q-rule);background:var(--q-surface)}
.sl-seg button{flex:1 1 0;min-width:0;min-height:44px;border:0;border-radius:0;background:var(--q-surface);padding:0 4px;font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.05em;color:var(--q-ink);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background-color 90ms var(--step),color 90ms var(--step)}
.sl-seg button+button{border-left:1.5px solid var(--q-rule)}
.sl-seg button:active{background:var(--q-surface-2)}
.sl-seg button[aria-pressed="true"]{background:var(--q-invert);color:var(--q-on-invert)}
.sl-in{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;border:1.5px solid var(--q-rule);background:var(--q-rule);gap:1.5px}
.sl-in label{display:flex;flex-direction:column;background:var(--q-surface);padding:5px 8px 4px;min-width:0}
.sl-in label span{font:600 11px/13px var(--ff);font-stretch:75%;letter-spacing:.08em;color:var(--q-muted)}
.sl-in input{font:600 15px/22px var(--ff);color:var(--q-ink);background:transparent;border:0;border-radius:0;padding:0;min-width:0;width:100%;color-scheme:inherit}
.sl-in button{border:0;border-radius:0;background:var(--q-invert);color:var(--q-on-invert);padding:0 12px;min-height:46px;font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.05em;cursor:pointer}
.sl-hero{border-bottom:1.5px solid var(--q-rule)}
.sl-hero .hero-v{font-size:min(52px,13.5vw)}
.sl-st{display:inline-flex;align-items:center;gap:6px;white-space:normal}
.stat-s.sl-st{font-size:12.5px;line-height:16px;color:var(--q-ink-2);margin-top:2px}
.sl-ch{padding-bottom:10px}
.sl-leg{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12.5px;line-height:16px;color:var(--q-ink-2);padding:0 0 8px}
.sl-k{display:inline-block;width:12px;height:12px;margin-right:6px;vertical-align:-1px}
.sl-k.a,.sl-a{background:var(--q-viz-fill)}
.sl-k.b,.sl-b{background:var(--q-viz-alt);box-shadow:inset 0 0 0 1.5px var(--q-viz-fill)}
.sl-plot{position:relative;height:150px;margin:22px 0 0 46px}
.sl-g{position:absolute;left:0;right:0;border-top:1px solid var(--q-rule-light)}
.sl-g.z{border-top:1.5px solid var(--q-rule)}
.sl-g span{position:absolute;right:calc(100% + 6px);top:-7px;font:600 11px/13px var(--ff);font-stretch:75%;color:var(--q-muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.sl-cols{position:absolute;inset:0;display:flex}
.sl-col{flex:1 1 0;min-width:0;position:relative;border:0;border-radius:0;padding:0;background:transparent;cursor:pointer;transition:background-color 90ms var(--step)}
.sl-col.on{background:var(--q-surface-2)}
.sl-pair{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:min(26px,84%);display:grid;grid-template-columns:1fr 1fr;column-gap:2px}
.sl-pair>span{position:relative}
.sl-pair i{position:absolute;left:0;right:0;bottom:0;min-height:1px}
.sl-lab{position:absolute;bottom:100%;transform:translate(-50%,0);margin-bottom:3px;font:800 13px/15px var(--ff);font-stretch:62.5%;white-space:nowrap;pointer-events:none;background:var(--q-surface);padding:0 2px}
.sl-lab.r{transform:translate(-100%,0)}.sl-lab.l{transform:translate(0,0)}
.sl-x{display:flex;margin:4px 0 0 46px}
.sl-x span{flex:1 1 0;min-width:0;text-align:center;font:600 11px/13px var(--ff);font-stretch:75%;color:var(--q-muted);white-space:nowrap}
.sl-x span.on{color:var(--q-ink)}
.sl-more{border:1.5px solid var(--q-rule);border-radius:0;background:var(--q-surface);color:var(--q-ink);min-height:36px;padding:0 12px;margin-top:10px;font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.05em;cursor:pointer}
.sl-all{display:block;width:100%;min-height:44px;margin:4px 0 10px}
.sl-t{width:100%;border-collapse:collapse;margin-top:8px;font-size:12.5px;line-height:16px;font-variant-numeric:tabular-nums}
.sl-t th{text-align:right;font:600 11px/14px var(--ff);font-stretch:75%;letter-spacing:.06em;color:var(--q-muted);padding:4px 0 4px 6px;border-bottom:1.5px solid var(--q-rule)}
.sl-t td{text-align:right;padding:5px 0 5px 6px;border-bottom:1px solid var(--q-rule-light);white-space:nowrap}
.sl-t th:first-child,.sl-t td:first-child{text-align:left;padding-left:0}
.sl-row .row-c .sl-st{margin-top:3px}
.sl .det .sl-sum{border-top:1.5px solid var(--q-rule);margin-top:2px;padding-top:4px;font-weight:700;color:var(--q-ink)}
.sl .det b{white-space:nowrap}.sl .det small{font-weight:400;color:var(--q-muted)}
.sl .det .sl-p{margin:4px 0;font-size:12.5px;line-height:17px;color:var(--q-ink-2)}
.sl .det .sl-h{font:700 11px/14px var(--ff);font-stretch:75%;letter-spacing:.08em;color:var(--q-muted);padding:8px 0 2px;border-top:1px solid var(--q-rule-light);margin-top:6px;display:block}
.sl-tb{margin:0 12px 12px;border:1.5px solid var(--q-rule);font-size:12px;line-height:16px;color:var(--q-ink-2)}
.sl-tb div{padding:6px 8px}.sl-tb div+div{border-top:1px solid var(--q-rule-light)}
@media (max-width:360px){.sl-plot,.sl-x{margin-left:38px}.sl-seg button{font-size:10.5px;letter-spacing:.02em}}
`;
  document.head.appendChild(st);
}

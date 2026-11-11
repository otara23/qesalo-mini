// ვალები (wave W-DEBT, plans/bot-v3.md §3.6, 9.11.2026; replaces მომწოდებლები): Otar's two questions - „ვისი ვალი
// გვაქვს, რამდენი და რატომ" and „ვისაც ჩვენი ვალი აქვს, რამდენი და რატომ" - as two lists with their totals at the top.
// The data: mini/functions/mini/debts.ts (schema/034b's cache; rows a person may not see are dropped there before
// anything is summed). Every row = one counterparty's account in ORIS with its balance, since when the oldest open part
// of it stands, what it was for (what the open entries were booked against, the rs.ge documents, a tender id), and on
// tap the documents. Taxes are one net row, wages and staff one row each without names. The related companies, the
// partners' accounts and the nursery's 18.06 purchase debt are listed apart and never counted in a total. No net across
// the two sides; no judgement words.
//
// Design C „ნახაზი": framed sheet, two figures as the hero cells (one per side - never a difference), a sort control
// (amount | age) as a segmented strip, rows with a scale bar (share of the largest row of that list), tap = the
// documents sheet (the shell's .det), the title block with sources and the rule at the end. Nothing eases.
import { t, esc, num, gel, dt, caps, cut } from "../ui.js?v=d919539.202611110839";

const L = (k, p) => t("debts." + k, p);
const S = { me: null, secs: [], pass: false, sort: "amount", all: {} };
// Otar 9.11 („simple"): each side opens with its 10 largest (or oldest, by the strip) rows, every row closed; „ყველა (n)"
// adds the rest in place under them (bot-v3 polish3; was 40 - main had 137 and 182 rows a side)
const FIRST = 10;   // rows drawn per list before „ყველა (n)"

const yr = (s) => String(s || "").slice(0, 4);
const dtY = (s) => (s ? dt(s) + " " + yr(s) : "—");
function age(r, opens) {
  if (r.kind === "taxes") return "";
  if (r.from_opening) return L("before", { d: dtY(opens) });
  if (r.days == null) return "";
  return r.days <= 0 ? L("today") : L("days", { n: num(r.days) });
}
const kindWord = (r) => L("kind." + r.kind);
// debug-1011 #9: a private person the investor sees as „ფიზიკური პირი" - the word ფულის მოძრაობა draws (cash.w.person)
const label = (r) => (r.name ? esc(r.name) : r.person ? esc(t("cash.w.person")) : esc(kindWord(r)));
const reasonWord = (r) => (r.reason ? L("reason." + r.reason) : "");
// the tax row's parts on one line: the three largest by name, then „… ±rest" so the parts shown plus the rest are the
// row's amount on screen to the lari (rounded as drawn; debug-1011 #10: +29 075 +3 940 −1 875 = 31 140 beside 31 488)
const TAX_SHOWN = 3;
const pm = (v) => (v < 0 ? "−" : "+") + gel(Math.abs(v));
const rd = (v) => Math.sign(v) * Math.round(Math.abs(v));   // as gel() draws it (half away from zero)
function taxShort(r) {
  const ps = r.parts || [], shown = ps.slice(0, TAX_SHOWN);
  let s = shown.map((p) => L("tax_s." + p.agg) + " " + pm(rd(p.balance))).join(", ");
  if (ps.length > TAX_SHOWN) {
    const net = ps.reduce((a, p) => a + p.balance, 0), whole = (net < 0 ? -1 : 1) * rd(r.amount);
    const rest = whole - shown.reduce((a, p) => a + rd(p.balance), 0);
    if (rest) s += ", … " + pm(rest);
  }
  return s;
}
function whyShort(r) {
  if (r.kind === "taxes") return taxShort(r);
  if (r.members) return L("members", { n: num(r.members) });
  const w = (r.why || []).map((x) => x.name).filter(Boolean);
  const g = (r.rsge && r.rsge.goods) || [];
  const parts = (g.length ? g : w).slice(0, 2).map((x) => cut(x, 34));
  if (!parts.length && r.reason) parts.push(reasonWord(r));   // no goods text, no account name (the investor's rows): the reason word
  if (r.tenders && r.tenders.length) parts.push(r.tenders[0]);
  return parts.join(", ");
}
// otar-1011 §1.7 A (Otar 10.11: accounting is the single source of truth): the rs.ge-vs-books columns of a row are not
// drawn for anyone - a second number beside a debt confuses; the accountant finds the same gap on ბუღალტერია. debts.ts
// may keep sending r.recon (the harness compares the cards).
const kv = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
function detail(r, d) {
  let h = "";
  if (r.kind === "taxes") {
    h += (r.parts || []).map((p) => kv(esc(L("tax." + p.agg)), (p.balance < 0 ? "−" : "+") + gel(Math.abs(p.balance), 2))).join("");
    return h + `<p class="db-p">${esc(L("tax_note"))}</p>`;
  }
  if (r.members) return h + kv(esc(L("d_since")), esc(r.since ? dtY(r.since) : "—")) + `<p class="db-p">${esc(L("agg_note", { n: num(r.members) }))}</p>`;
  h += kv(esc(L("d_since")), esc(r.from_opening ? L("before", { d: dtY(d.opens) }) : dtY(r.since)) + (r.days != null && !r.from_opening ? ` · ${esc(L("days", { n: num(r.days) }))}` : ""));
  if (r.from_opening && r.open_lines) h += `<p class="db-p">${esc(L("d_from_open", { d: dtY(d.opens) }))}</p>`;
  if (r.last_entry) h += kv(esc(L("last", { d: "" }).trim()), esc(dtY(r.last_entry)));
  if ((r.why || []).length) h += `<div class="db-h">${esc(L("why"))}</div>` + r.why.map((w) => kv(esc(cut(w.name, 60)), gel(w.amount))).join("");
  else if (r.reason) h += kv(esc(L("why")), esc(reasonWord(r)));
  const R = r.rsge;
  if (R && R.invoices) h += kv(esc(L("d_inv")), `${num(R.invoices)}${R.invoices_gel != null ? " · " + gel(R.invoices_gel) : ""}`);
  if (R && R.waybills) h += kv(esc(L("d_wb")), `${num(R.waybills)}${R.waybills_gel != null ? " · " + gel(R.waybills_gel) : ""}`);
  if (R && (R.goods || []).length) h += kv(esc(L("d_goods")), esc(R.goods.map((g) => cut(g, 40)).join(", ")));
  if ((r.tenders || []).length) h += kv(esc(L("d_tender")), esc(r.tenders.join(", ")));
  if (r.tin) h += kv(esc(L("d_tin")), esc(r.tin));
  if ((r.lines || []).length) {
    h += `<div class="db-h">${esc(L("d_lines", { n: r.lines.length }))}</div>` + r.lines.map((l) =>
      `<div class="db-l"><span>${esc(dtY(l.d))}${l.doc ? `<small>${esc(cut(l.doc, 30))}</small>` : ""}</span><span class="db-w">${esc(cut(l.what || l.story || "", 64))}</span><b>${gel(l.amount, 2)}</b></div>`).join("");
  } else if (r.from_opening) h += `<p class="db-p">${esc(L("d_none", { d: dtY(d.opens) }))}</p>`;
  return h;
}
function sorted(list) {
  const x = list.slice();
  if (S.sort === "age") return x.sort((a, b) => (a.kind === "taxes") - (b.kind === "taxes") || String(a.since || "9999").localeCompare(String(b.since || "9999")) || b.amount - a.amount);
  return x.sort((a, b) => b.amount - a.amount);
}
function rows(list, co, side, d) {
  if (!list.length) return `<div class="empty">${esc(L("none_side"))}</div>`;
  const key = co + "-" + side, all = S.all[key], xs = sorted(list), shown = all ? xs : xs.slice(0, FIRST);
  const max = Math.max(...list.map((r) => r.amount)) || 1;
  return shown.map((r, i) => {
    const id = `db-${key}-${i}`, a = age(r, d.opens);
    const sub = [r.name || r.person ? esc(kindWord(r)) : "", a ? `<span class="nw">${esc(a)}</span>` : "", esc(whyShort(r))].filter(Boolean).join(" · ");
    return `<div class="row tap" data-det="${id}"><div class="row-m"><div class="row-t">${label(r)}</div><div class="row-c">${sub}</div>`
      + `<div class="bar"><i style="width:${Math.max(0.6, 100 * r.amount / max).toFixed(1)}%"></i></div></div>`
      + `<div class="row-v">${gel(r.amount)}</div><span class="chev">›</span></div>`
      + `<div class="det" id="det${id}">${detail(r, d)}</div>`;
  }).join("") + (!all && xs.length > FIRST ? `<button class="db-more" data-dbmore="${key}">${esc(L("more", { n: num(xs.length) }))}</button>` : "");
}
function related(d, co) {
  const xs = [...d.related.payable.map((r) => ({ ...r, side: "payable" })), ...d.related.receivable.map((r) => ({ ...r, side: "receivable" }))];
  if (!xs.length) return "";
  return `<div class="card"><div class="card-h"><div class="card-t">${esc(L("related_t"))}</div></div><div class="note">${esc(L("related_s"))}</div>`
    + xs.map((r, i) => {
      const id = `db-${co}-rel-${i}`, a = age(r, d.opens);
      const sub = [esc(L(r.side === "payable" ? "pay_t" : "rec_t")), esc(L("rel." + r.related)), a ? `<span class="nw">${esc(a)}</span>` : ""].filter(Boolean).join(" · ");
      return `<div class="row tap" data-det="${id}"><div class="row-m"><div class="row-t">${label(r)}</div><div class="row-c">${sub}</div></div>`
        + `<div class="row-v">${gel(r.amount)}</div><span class="chev">›</span></div><div class="det" id="det${id}">${detail(r, d)}</div>`;
    }).join("") + `</div>`;
}
function section(d, co) {
  if (!d || d.empty === "no_access") return "";
  if (d.empty === "none") return `<div class="card"><div class="empty">${esc(L("empty", { d: dtY(d.books_to) }))}</div></div>`;
  const T = d.totals, cell = (side) => {
    const x = T[side], sub = [L("count", { n: num(x.count) }), x.advances ? L("adv", { a: gel(x.advances) }) : ""].filter(Boolean).join(" · ");
    return `<a class="stat db-go" href="#db-${co}-${side}"><div class="stat-l">${esc(L(side === "payable" ? "pay_t" : "rec_t"))}</div><div class="stat-v">${gel(x.total)}</div><div class="stat-s">${esc(sub)}</div></a>`;
  };
  return (d.stale && d.built_at ? `<div class="banner">${esc(L("stale", { at: dtY(d.built_at) }))}</div>` : "")
    + `<div class="grid2 db-hero">${cell("payable")}${cell("receivable")}</div>`
    + `<div class="db-seg" role="group" aria-label="${esc(L("sort"))}">${["amount", "age"].map((s) => `<button data-dbsort="${s}" aria-pressed="${S.sort === s}">${esc(L(s === "amount" ? "by_amount" : "by_age"))}</button>`).join("")}</div>`
    + `<div class="card" id="db-${co}-payable"><div class="card-h"><div class="card-t">${esc(L("pay_t"))}</div><div class="card-n">${gel(T.payable.total)}</div></div>${rows(d.payable, co, "payable", d)}</div>`
    + `<div class="card" id="db-${co}-receivable"><div class="card-h"><div class="card-t">${esc(L("rec_t"))}</div><div class="card-n">${gel(T.receivable.total)}</div></div>${rows(d.receivable, co, "receivable", d)}</div>`
    + related(d, co)
    + `<div class="db-tb"><div>${esc(L("src", { d: dtY(d.books_to), o: dtY(d.opens) }))}</div><div>${esc(L("rule"))}</div></div>`;
}

export default function view(d, me, _t, co) {
  css();
  if (!S.pass) { S.pass = true; S.secs = []; queueMicrotask(() => { S.pass = false; }); }
  S.me = me; S.secs.push({ company: co, data: d });
  return `<div class="db" data-dbsec="${esc(co || "")}">${section(d, co)}</div>`;
}
// a sort or „ყველა" redraws the sections from the data already here (no new request); „ყველა" keeps the rows that were
// open (same order, same ids), a new order closes them (the ids follow the position)
function draw(keep) {
  const open = keep ? [...document.querySelectorAll(".db .det.open")].map((el) => el.id) : [];
  for (const x of S.secs) {
    const el = document.querySelector(`[data-dbsec="${x.company || ""}"]`);
    if (el) { el.innerHTML = section(x.data, x.company); caps(el); }
  }
  for (const id of open) {
    const d = document.getElementById(id), r = document.querySelector(`[data-det="${id.slice(3)}"]`);
    if (d) d.classList.add("open"); if (r) r.classList.add("open-r");
  }
}
if (typeof document !== "undefined" && !window.__debtsView) {
  window.__debtsView = true;
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-dbsort],[data-dbmore]");
    if (!el || !S.me) return;
    const TG = window.Telegram && window.Telegram.WebApp; if (TG && TG.HapticFeedback) TG.HapticFeedback.selectionChanged();
    if (el.dataset.dbsort) { if (S.sort !== el.dataset.dbsort) { S.sort = el.dataset.dbsort; draw(); } return; }
    if (el.dataset.dbmore) { S.all[el.dataset.dbmore] = true; draw(true); }
  });
}
function css() {
  if (typeof document === "undefined" || document.getElementById("db-css")) return;
  const st = document.createElement("style"); st.id = "db-css";
  st.textContent = `
.db>*+*{border-top:1.5px solid var(--q-rule)}
.db-hero .stat{display:block;text-decoration:none;color:inherit}
.db-hero .stat-v{font-size:min(27px,7.4vw)}
.db-seg{display:flex;margin:0 12px 2px;border:1.5px solid var(--q-rule);background:var(--q-surface)}
.db-seg button{flex:1 1 0;min-height:44px;border:0;border-radius:0;background:var(--q-surface);font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.05em;color:var(--q-ink);cursor:pointer;transition:background-color 90ms var(--step),color 90ms var(--step)}
.db-seg button+button{border-left:1.5px solid var(--q-rule)}
.db-seg button:active{background:var(--q-surface-2)}
.db-seg button[aria-pressed="true"]{background:var(--q-invert);color:var(--q-on-invert)}
.db .row-v small .pill{margin-top:4px}
.db .det .db-h{font:700 11px/14px var(--ff);font-stretch:75%;letter-spacing:.08em;color:var(--q-muted);padding:8px 0 2px;border-top:1px solid var(--q-rule-light);margin-top:6px}
.db .det .db-p{margin:4px 0;font-size:12.5px;line-height:17px;color:var(--q-ink-2)}
.db .det div.db-l{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:baseline;padding:4px 0;border-top:1px solid var(--q-rule-light)}
.db .det .db-l small{display:block;color:var(--q-muted);font-size:11.5px}
.db .det .db-w{color:var(--q-ink);overflow-wrap:anywhere}
.db .det b{white-space:nowrap}
.db-more{display:block;width:100%;min-height:44px;margin:4px 0 10px;border:1.5px solid var(--q-rule);border-radius:0;background:var(--q-surface);font:700 12px/15px var(--ff);font-stretch:75%;letter-spacing:.05em;color:var(--q-ink);cursor:pointer}
.db-more:active{background:var(--q-surface-2)}
.db-tb{margin:0 12px 12px;border:1.5px solid var(--q-rule);font-size:12px;line-height:16px;color:var(--q-ink-2)}
.db-tb div{padding:6px 8px}.db-tb div+div{border-top:1px solid var(--q-rule-light)}
`;
  document.head.appendChild(st);
}

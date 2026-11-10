// ბუღალტერია. Otar 8.11.2026 „don't need a change log at all" (F1): last entry, entered on, new lines - no edits or
// deletions. The nursery: + the 15 newest lines (admin field books.recent); the main company (the bot's card M2): the
// year from ORIS without a profit line while work in progress grows (1 6 30, schema/012).
// W-DRILL (plans/bot-v3.md §3.4, Otar's item 9, 9.11.2026): + the account classes 1-9 x the last 6 months (debit or
// credit turnover - two readings, a toggle), a class opens to its accounts (turnover, balance, last entry), an account
// to its months, a month to its lines (./drill-ui.js; masters and the accountant too - Q2); the nursery also gets
// bank <-> books (today's cash tab's per-currency gap and the lines on one side only) and rs.ge <-> books (the recon
// card's rule). Balances are ORIS's for both companies (polish3, 9.11: the open period's opening + the journal since,
// schema/034a + 034b; the main company's months before 1.01.2023 show a balance only for classes 6-9), so the main
// company's matrix note is the nursery's (m_note_main said 1-5 had no balance). A view of the books - nothing here
// judges a line.
import { t, tOr, lang, esc, num, gel, dt, card, row, stat } from "../ui.js?v=ccca880.202611102005";
import { section, accountRow, keyOf, isOpen, slot, moreOf, drillCss, cpt, monShort, amt, redrawView } from "./drill-ui.js?v=ccca880.202611102005";

const L = (k, p) => t("books." + k, p);
const V = { side: "d" };   // the matrix reading: d = debit turnover, c = credit turnover
// a matrix cell in thousands of lari, the unit once in the header (6 columns fit a 360 px phone): 5,168 · 46 · 2.3 · <0.1
const kGel = (v) => { const a = Math.abs(Number(v) || 0) / 1000, s = Number(v) < 0 ? "−" : ""; return !a ? "" : a < 0.05 ? "<0.1" : s + (a < 10 ? a.toFixed(1) : num(Math.round(a))); };

function nursery(d) {
  const l = d.lag || {};
  // debug-1011 #6: days_since_entry counts from the last ENTERED line (v_books_lag: today - last_entered_on), so it goes
  // under „ბოლოს შეყვანილი", as the main company's does (main() below)
  let s = `<div class="grid2">${stat(t("books.last_entry"), dt(l.last_entry_date), "ORIS")}${stat(t("books.entered"), dt(l.last_entered_on), l.days_since_entry != null ? t("books.days_ago", { n: l.days_since_entry }) : "")}</div>`;
  s += card(t("books.new_30"), "", row(t("books.added"), "", num(d.added)));
  // the 15 newest lines are Otar's (matrix field books.recent): for everyone else the function sends none, so no card -
  // an empty „ბოლო გატარებები" heading read as a broken list under /as (debug-1011, seen as Zaza 10.11)
  if ((d.recent || []).length) s += card(t("books.recent"), (d.recent || []).length, (d.recent || []).map((r) => row(`<span class="mono">${esc(r.debit)} → ${esc(r.credit)}</span>`, dt(r.entry_date) + (r.doc ? " · " + esc(r.doc) : ""), gel(r.amount_gel, 2))).join(""));
  return s + matrix(d, "nursery") + compare(d);
}

function main(d) {
  const l = d.lag || {};
  let s = Number(l.days_since_entry) > 10 ? `<div class="banner">${t("books.entered_ago", { n: l.days_since_entry })}</div>` : "";
  s += `<div class="grid2">${stat(t("books.last_entry"), dt(l.last_entry_date), "ORIS")}${stat(t("books.entered"), dt(l.last_entered_on), l.days_since_entry != null ? t("books.days_ago", { n: l.days_since_entry }) : "")}</div>`;
  s += card(t("books.new_7"), "", row(t("books.added"), "", num(l.new_lines_7d)));
  s += card(t("books.year", { y: esc(d.year) }), "ORIS",
    row(t("books.revenue"), "", `<span class="pos">${gel(d.revenue)}</span>`)
    + row(t("books.opex"), t("books.opex_sub", { c: gel(d.opex_cost), d: gel(d.opex_delivery), a: gel(d.opex_admin) }), gel(d.opex))
    + (d.wip > 0 ? row(t("books.wip"), t("books.wip_sub"), `<span class="pill p-warn">${gel(d.wip)}</span>`) : "")
    + row(t("books.non_op"), t("books.non_op_sub", { i: gel(d.non_op_income), e: gel(d.non_op_expense) }), `<span class="${d.non_op < 0 ? "neg" : ""}">${gel(d.non_op)}</span>`)
    + row(t("books.class9"), "", gel(d.class9)));
  if (d.wip > 0) s += `<div class="note">${t("books.wip_note", { v: gel(d.wip) })}</div>`;
  // otar-1011 §1.7 A: no „bank ↔ books is not measured yet" caption under the main company's matrix (books.main_compare)
  return s + matrix(d, "main");
}

// ---------------- the account classes x the last 6 months ----------------
// a class's name: ORIS's own words in Georgian; ru / en the panel's words for classes 1-9 (books.cls, debug-1011 #12 -
// ORIS's level-1 names came through untranslated), ORIS's name when a class has none there
const clsName = (c) => (lang() === "ka" ? c.name || tOr(`books.cls.${c.cls}`, "") : tOr(`books.cls.${c.cls}`, c.name || ""));
function matrix(d, co) {
  const M = d.matrix;
  if (!M || !(M.months || []).length) return "";
  const side = V.side, active = M.classes.filter((c) => c.lines > 0);
  const head = `<div class="bk-seg" role="group" aria-label="${esc(L("m_reading"))}">`
    + ["d", "c"].map((x) => `<button data-bk-side="${x}" aria-pressed="${x === side}">${esc(L(x === "d" ? "m_debit" : "m_credit"))}</button>`).join("") + `</div>`;
  const cols = M.months.map((m, i) => `<span${i === M.months.length - 1 ? ' class="now"' : ""}>${esc(monShort(m))}</span>`).join("");
  let s = `<div class="bk-g"><div class="bk-r bk-hd"><span class="k">${esc(L("m_class"))}</span>${cols}</div>`;
  for (const c of M.classes) {
    const key = keyOf(co, "books", "class", c.cls), open = isOpen(key), vals = c[side] || [], nm = clsName(c);
    // the class's name on its own line above its six figures (debug-1011 #12: cut to „მიმდინარე აქ…" at 390 px before)
    const k = `<span class="k"><b>${c.cls}</b></span><span class="nm">${esc(nm)}</span>`;
    if (!c.lines) { s += `<div class="bk-r bk-z">${k}${vals.map(() => "<span>·</span>").join("")}</div>`; continue; }
    s += `<div class="bk-r${open ? " on" : ""}" role="button" tabindex="0" data-dr="${esc(key)}" aria-expanded="${open}" aria-label="${esc(L("m_aria", { c: c.cls, n: nm }))}">`
      + `${k}${vals.map((v, i) => `<span${i === vals.length - 1 ? ' class="now"' : ""}>${v ? esc(kGel(v)) : "·"}</span>`).join("")}</div>`;
    if (open) s += `<div class="dr-p bk-p">${classBody(d, co, c, key)}</div>`;
  }
  s += `</div>`;
  const span = `${monShort(M.months[0])}–${monShort(M.months[M.months.length - 1])} ${M.months[M.months.length - 1].slice(0, 4)} · ${L("m_unit")}`;
  const note = L("m_note");
  return `<div class="card bk-c"><div class="card-h"><div class="card-t">${esc(L("m_title"))}</div><div class="card-n">${esc(span)}</div></div>${head}${s}`
    + `<div class="note bk-n">${esc(note)}${M.pending ? " " + esc(L("m_pending", { n: M.pending })) : ""}${active.length ? "" : " " + esc(L("m_empty"))}</div></div>`;
}
function classBody(d, co, c, key) {
  const x = slot(key);
  if (!x) return `<div class="dr-l mut">${esc(t("drill.loading"))}</div>`;
  if (x.err) return `<div class="dr-l mut">${esc(t("drill.err"))} <button class="dr-btn" data-dr-retry="${esc(key)}">${esc(t("app.retry"))}</button></div>`;
  const acc = x.accounts || [];
  if (!acc.length) return `<div class="dr-l mut">${esc(t("drill.no_lines"))}</div>`;
  const more = moreOf(key, 40), ctx = { co, tab: "books", sign: 1, can: !!(d.can && d.can.lines) };
  let s = `<div class="dr-h">${esc(L("c_head", { n: num(acc.length), a: monShort(x.from), b: monShort(x.to) }))} · ${esc(t("drill.d"))} <b>${num(x.debit, 2)}</b> · ${esc(t("drill.c"))} <b>${num(x.credit, 2)}</b>`
    + (x.balance != null ? ` · ${esc(t("drill.balance"))} <b>${amt(x.balance)}</b>` : ` · ${esc(t("drill.no_balance"))}`) + `</div>`;
  for (const a of acc.slice(0, more)) {
    const right = a.balance != null ? amt(a.balance) + `<small>${esc(t("drill.d"))} ${esc(cpt(a.debit) || "0")} · ${esc(t("drill.c"))} ${esc(cpt(a.credit) || "0")}</small>`
      : `${esc(t("drill.d"))} ${num(a.debit, 2)}<small>${esc(t("drill.c"))} ${num(a.credit, 2)}</small>`;
    s += accountRow(ctx, a, right, a.last_entry ? esc(t("drill.last", { d: dt(a.last_entry) })) : "");
  }
  if (acc.length > more) s += `<button class="dr-btn" data-dr-more="${esc(key)}">${esc(t("drill.more_accounts", { n: acc.length - more }))}</button>`;
  return s;
}

// ---------------- bank <-> books, rs.ge <-> books (the nursery) ----------------
function compare(d) {
  const C = d.compare; if (!C) return "";
  const cur = (C.cash || []).map((x) => {
    const gap = x.gap != null ? Number(x.gap) : null;
    return row(esc(x.currency), x.books != null ? esc(L("bb_sub", { d: dt(x.books_as_of), b: num(x.books, 2), k: x.bank_on_books_date != null ? num(x.bank_on_books_date, 2) : "—" })) : esc(L("bb_none")),
      gap == null ? `<span class="mut">—</span>` : Math.abs(gap) < 0.005 ? esc(L("bb_equal")) : `${esc(L("bb_gap"))} ${amt(gap)} ${esc(x.currency)}`);
  }).join("");
  const nb = (C.not_booked || []).map((x) => `<div class="dr-l"><span class="d">${esc(dt(x.day))}</span><span class="w">${esc(x.counterparty || "")}${x.purpose ? `<small>${esc(x.purpose)}</small>` : ""}</span><span class="v">${amt(x.amount)} ${esc(x.currency)}</span></div>`).join("");
  const ni = (C.not_in_bank || []).map((x) => `<div class="dr-l"><span class="d">${esc(dt(x.day))}</span><span class="w">${esc(x.other_name || "")}${[x.doc ? t("drill.doc", { d: x.doc }) : "", x.story || ""].filter(Boolean).length ? `<small>${esc([x.doc ? t("drill.doc", { d: x.doc }) : "", x.story || ""].filter(Boolean).join(" · "))}</small>` : ""}</span><span class="v">${amt(x.amount)} ${esc(x.currency)}</span></div>`).join("");
  let s = card(esc(L("bb_title")), "", cur
    + `<div class="dr-h">${esc(L("bb_not_booked", { n: (C.not_booked || []).length }))}</div>` + (nb || `<div class="dr-l mut">${esc(L("bb_none_side"))}</div>`)
    + `<div class="dr-h">${esc(L("bb_not_in_bank", { n: (C.not_in_bank || []).length }))}</div>` + (ni || `<div class="dr-l mut">${esc(L("bb_none_side"))}</div>`));
  const rs = C.rsge || [];
  s += card(esc(L("rs_title")), rs.length ? num(rs.length) : "", rs.length ? rs.map((x) => row(esc(x.supplier || ""), esc(L("rs_sub", { r: gel(x.rsge), o: gel(x.oris), n: num(x.invoices) })),
    `${Number(x.gap) > 0 ? "+" : ""}${gel(x.gap)}`)).join("") + `<div class="note">${esc(L("rs_note"))}</div>` : `<div class="empty">${esc(L("rs_none"))}</div>`);
  return s;
}

function render(d, co) { return co === "main" ? main(d) : nursery(d); }
export default function view(d, me, _t, co) { css(); drillCss(); return section("books", me, co, d, render); }

// the matrix reading (the one click of this view; the drill's are ./drill-ui.js's)
if (typeof document !== "undefined" && !window.__booksView) {
  window.__booksView = true;
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-bk-side]"); if (!b) return;
    const TG = window.Telegram && window.Telegram.WebApp; if (TG && TG.HapticFeedback) TG.HapticFeedback.selectionChanged();
    if (V.side !== b.dataset.bkSide) { V.side = b.dataset.bkSide; redrawView(); }
  });
}

function css() {
  if (document.getElementById("bk-css")) return;
  const st = document.createElement("style"); st.id = "bk-css";
  st.textContent = `
.bk-c{padding-bottom:4px}
.bk-seg{display:flex;border:1.5px solid var(--q-rule);background:var(--q-surface);margin:2px 0 8px}
.bk-seg button{flex:1 1 0;min-height:40px;border:0;border-radius:0;background:var(--q-surface);font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.05em;color:var(--q-ink);cursor:pointer;transition:background-color 90ms var(--step),color 90ms var(--step)}
.bk-seg button+button{border-left:1.5px solid var(--q-rule)}
.bk-seg button[aria-pressed="true"]{background:var(--q-invert);color:var(--q-on-invert)}
.bk-g{overflow-x:auto}
.bk-r{display:grid;grid-template-columns:36px repeat(6,minmax(38px,1fr));row-gap:2px;align-items:center;min-height:44px;padding:5px 0;border-top:1px solid var(--q-rule-light);cursor:pointer;transition:background-color 90ms var(--step)}
.bk-r:active{background:var(--q-surface-2)}
.bk-r.on{box-shadow:inset 3px 0 0 var(--q-ink)}
.bk-r.on .k{padding-left:9px}
.bk-r>span{font:600 12px/15px var(--ff);font-stretch:75%;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;padding:0 0 0 4px}
.bk-r>span.now{font-weight:800}
.bk-r .k{text-align:left;min-width:0;padding:0}
.bk-r:not(.bk-hd) .k{grid-column:1;grid-row:1 / span 2}
.bk-r .k b{font:800 17px/20px var(--ff);font-stretch:62.5%}
.bk-r>span.nm{grid-column:2 / -1;grid-row:1;min-width:0;text-align:left;white-space:normal;overflow-wrap:anywhere;font:400 11px/13px var(--ff);font-stretch:normal;color:var(--q-muted)}
.bk-hd,.bk-z{cursor:default}
.bk-hd{min-height:28px;border-top:0;padding:0}
.bk-hd>span{font:600 11px/13px var(--ff);font-stretch:75%;letter-spacing:.06em;color:var(--q-muted)}
.bk-z>span{color:var(--q-rule-light)}
.bk-z .k b,.bk-z>span.nm{color:var(--q-muted)}
.bk-p{margin:0 -12px}
.bk-n{border-top:1px solid var(--q-rule-light)}
`;
  document.head.appendChild(st);
}

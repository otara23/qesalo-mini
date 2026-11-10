// საბრუნავი (the nursery): six rows of v_v5_working_capital, the bot's card N5. W-DRILL (plans/bot-v3.md §3.5, Otar's
// item 9, 9.11.2026): each row opens to the accounts behind it (schema/034a v_wc_detail, the same rules - its sums are
// the rows): suppliers with what we owe, the last entry and their rs.ge invoices; advances and claims; the saplings
// with their quantities; work in progress; other stock; the VAT row = the rs.ge card next to the books' 1 4 80 1. An
// account opens to its months and lines (./drill-ui.js; a supplier's lines read as debt: + = owed more). The 18.06
// purchase debt (3 1 10 26) is not in the payables by the standing ruling, and says so. The main company: after its
// chart of accounts is checked (§3.5). A view of the books - nothing here judges an account.
import { t, esc, num, gel, dt, card, row } from "../ui.js?v=8fb6967.202611101304";
import { section, accountRow, keyOf, isOpen, drillCss, amt, toggleLocal } from "./drill-ui.js?v=8fb6967.202611101304";

const L = (k, p) => t("wc." + k, p);
// the order and words of today's tab; payables read as a positive debt
const ROWS = [["saplings", "saplings"], ["wip", "wip"], ["stock_other", "stock_other"], ["receivables", "receivables"], ["payables", "payables"], ["vat", "vat_credit"]];

function nursery(d) {
  const w = d.wc || {}, I = d.items || {}, can = !!(d.can && d.can.lines);
  let s = "";
  for (const [k, label] of ROWS) {
    const it = I[k] || { total: 0, accounts: [], open: 0 }, key = keyOf("nursery", "wc", "item", k), open = isOpen(key);
    const value = k === "payables" ? `<span class="neg">${MINUS}${num(it.total)} ₾</span>` : k === "vat" ? gel(w.vat_credit_card) : gel(it.total);
    const sub = k === "vat" ? esc(L("vat_sub", { d: dt(d.vat_card_as_of) })) : it.accounts.length ? esc(L(k === "payables" ? "n_suppliers" : k === "saplings" || k === "stock_other" ? "n_items" : "n_accounts", { n: num(it.open) })) : "";
    s += `<div class="row tap wc-r${open ? " on" : ""}" role="button" tabindex="0" data-dr-wc="${esc(key)}" aria-expanded="${open}"><div class="row-m"><div class="row-t">${esc(L(label))}</div>${sub ? `<div class="row-c">${sub}</div>` : ""}</div><div class="row-v">${value}</div><span class="chev">›</span></div>`;
    if (open) s += `<div class="dr-p">${itemBody(k, it, d, can)}</div>`;
  }
  return card(esc(L("title")), esc(L("books_on", { d: dt(w.books_as_of) })), s) + `<div class="note">${esc(L("note"))}</div>`;
}
const MINUS = "−";
function itemBody(k, it, d, can) {
  const ctx = { co: "nursery", tab: "wc", sign: k === "payables" ? -1 : 1, can };
  let s = "";
  if (k === "vat") {
    const b = it.accounts[0];
    s += row(esc(L("vat_card")), esc(dt(d.vat_card_as_of)), gel(d.wc && d.wc.vat_credit_card, 2));
    if (b) s += accountRow(ctx, b, amt(b.amount), esc(L("vat_books")));
    return s;
  }
  if (!it.accounts.length) return `<div class="dr-l mut">${esc(L("none"))}</div>`;
  // the settled accounts (0 ₾) fold behind one button: the books keep them, the list leads with what is owed or held
  const zkey = keyOf("nursery", "wc", "zeros", k), live = it.accounts.filter((a) => a.amount !== 0), zero = it.accounts.filter((a) => a.amount === 0);
  for (const a of [...live, ...(isOpen(zkey) ? zero : [])]) {
    const q = a.qty != null && a.unit ? `<small>${esc(num(a.qty, Number.isInteger(Number(a.qty)) ? 0 : 2) + " " + a.unit)}</small>` : "";
    const bits = [a.last_entry ? t("drill.last", { d: dt(a.last_entry) }) : "", k === "payables" && a.invoices ? L("invoices", { n: num(a.invoices), d: dt(a.last_doc) }) : ""].filter(Boolean).join(" · ");
    s += accountRow(ctx, a, amt(a.amount) + q, esc(bits));
  }
  if (zero.length) s += `<button class="dr-btn" data-dr-wc="${esc(zkey)}" aria-expanded="${isOpen(zkey)}">${esc(L(isOpen(zkey) ? "zeros_hide" : "zeros", { n: num(zero.length) }))}</button>`;
  if (k === "payables") s += `<div class="dr-l mut">${esc(L("payables_ruling"))}</div>`;
  if (k === "wip") s += `<div class="dr-l mut">${esc(L("wip_note"))}</div>`;
  return s;
}

function render(d, co) {
  if (co === "main" || d.pending === "chart") return card(esc(L("title")), "", `<div class="empty">${esc(L("main_pending"))}</div>`);
  return nursery(d);
}
export default function view(d, me, _t, co) { drillCss(); css(); return section("wc", me, co, d, render); }

// a row of the six opens without a fetch (its accounts came with the tab); the drill's own clicks are ./drill-ui.js's
if (typeof document !== "undefined" && !window.__wcView) {
  window.__wcView = true;
  const act = (el) => {
    const TG = window.Telegram && window.Telegram.WebApp; if (TG && TG.HapticFeedback) TG.HapticFeedback.selectionChanged();
    toggleLocal(el.dataset.drWc);   // a static import: the published page stamps ?v= on static imports only (one module instance)
  };
  document.addEventListener("click", (e) => { const el = e.target.closest("[data-dr-wc]"); if (el) act(el); });
  document.addEventListener("keydown", (e) => { const el = (e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("[data-dr-wc]"); if (el) { e.preventDefault(); act(el); } });
}

function css() {
  if (document.getElementById("wc-css")) return;
  const st = document.createElement("style"); st.id = "wc-css";
  st.textContent = `
.wc-r.on{box-shadow:inset 3px 0 0 var(--q-ink);padding-left:9px}
.wc-r.on .chev{transform:rotate(90deg)}
`;
  document.head.appendChild(st);
}

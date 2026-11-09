// ბუღალტერია. Otar 8.11.2026 „don't need a change log at all" (F1): last entry, entered on, new lines - no edits or
// deletions. The nursery: + the 15 newest lines (admin field books.recent); the main company (the bot's card M2): the
// year from ORIS without a profit line while work in progress grows (1 6 30, schema/012).
import { t, esc, num, gel, dt, card, row, stat } from "../ui.js?v=e8f5cf1.202611091511";

function nursery(d) {
  const l = d.lag || {};
  let s = `<div class="grid2">${stat(t("books.last_entry"), dt(l.last_entry_date), l.days_since_entry != null ? t("books.days_ago", { n: l.days_since_entry }) : "")}${stat(t("books.entered"), dt(l.last_entered_on), "ORIS")}</div>`;
  s += card(t("books.new_30"), "", row(t("books.added"), "", num(d.added)));
  s += card(t("books.recent"), (d.recent || []).length, (d.recent || []).map((r) => row(`<span class="mono">${esc(r.debit)} → ${esc(r.credit)}</span>`, dt(r.entry_date) + (r.doc ? " · " + esc(r.doc) : ""), gel(r.amount_gel, 2))).join(""));
  return s;
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
  return s;
}

export default function view(d, me, _t, co) { return co === "main" ? main(d) : nursery(d); }

// გაყიდვები / შესყიდვები (the main company; the bot's cards M3 / M4): rs.ge invoices this month and year to date, the
// top five counterparties, waybills; cancelled invoices not in the sums. purchases.js is this view (d.side says which).
import { t, esc, num, gel, dt, card, row, stat, barRow, monthName } from "../ui.js?v=8fb6967.202611101304";

export default function view(d) {
  const sale = d.side === "sale", who = sale ? t("rsge.buyer") : t("rsge.supplier");
  let s = `<div class="card hero"><div class="hero-l">${t(sale ? "rsge.sales_ytd" : "rsge.purchases_ytd", { y: esc(d.year) })}</div><div class="hero-v">${gel(d.gross_ytd)}</div><div class="hero-s">${t("rsge.ytd_sub", { n: num(d.invoices_ytd), c: num(d.counterparties_ytd), who })}</div></div>`;
  s += `<div class="grid2">${stat(t("rsge.this_month", { m: monthName(d.month) }), gel(d.gross_month), t("rsge.invoices", { n: num(d.invoices_month) }))}${stat(t("rsge.waybills", { y: esc(d.year) }), num(d.waybills_ytd), t("rsge.waybills_month", { n: num(d.waybills_month) }))}</div>`;
  s += card(sale ? t("rsge.top_buyers") : t("rsge.top_suppliers"), d.top_pct != null ? t("rsge.top_pct", { p: d.top_pct }) : "",
    (d.top || []).map((x) => barRow(esc(x.name), `${t("rsge.invoices", { n: num(x.invoices) })}${x.person ? " · " + t("rsge.person") : ""}`, gel(x.gross), x.share)).join(""));
  s += card(t("rsge.year_total"), "", row(t("rsge.net"), "", gel(d.net_ytd)) + row(t("rsge.vat"), "", gel(d.vat_ytd))
    + (Number(d.dropped_ytd) ? row(t("rsge.dropped"), t("rsge.dropped_sub", { n: num(d.dropped_ytd) }), `<span class="mut">${gel(d.dropped_gross_ytd)}</span>`) : ""));
  return s + `<div class="note">${t("rsge.note", { i: dt(d.last_invoice_date), w: dt(d.last_waybill_date) })}</div>`;
}

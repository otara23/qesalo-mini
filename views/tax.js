// გადასახადები (the nursery): the rs.ge tax card vs the books, input VAT by month.
import { t, num, gel, dt, card, row } from "../ui.js?v=5309b78.202611091541";

export default function view(d) {
  const tx = d.tax || {}; const v = d.vat || [];
  let s = `<div class="card hero"><div class="hero-l">${t("tax.credit")}</div><div class="hero-v">${gel(tx.card_balance, 2)}</div><div class="hero-s">${t("tax.card_on", { d: dt(tx.card_as_of) })}</div></div>`;
  const diff = Number(tx.card_balance) - Number(tx.books_tax_account);
  s += card(t("tax.vs"), "", row(t("tax.card"), dt(tx.card_as_of), gel(tx.card_balance, 2))
    + row(t("tax.books"), "", gel(tx.books_tax_account, 2))
    + row(t("tax.diff"), "", `<span class="${Math.abs(diff) < 5 ? "pos" : "neg"}">${num(diff, 2)} ₾</span>`)
    + row(t("tax.input_vat"), "", gel(tx.input_vat_rsge, 2)));
  if (v.length) {
    const mx = Math.max(...v.map((x) => Number(x.vat)));
    s += card(t("tax.by_month"), t("tax.invoices"), `<div class="vbars">${v.map((x) => `<div class="vb"><b>${num(x.vat)}</b><i style="height:${Math.max(4, Number(x.vat) / mx * 80)}px"></i><span>${t("mon_short")[new Date(x.month).getMonth()]}</span></div>`).join("")}</div>`);
  }
  s += `<div class="note">${t("tax.note")}</div>`;
  return s;
}

// გადასახადები (the nursery): the rs.ge tax card vs the books, input VAT by month.
// taxref (11.11.2026, schema/057): the card is read on the portal by hand, so v_v6_tax's card_balance = the newest
// snapshot less the Treasury's overpayment refunds that reached the bank after it (card_snapshot, card_refunds,
// card_refund_on); when there is one, the hero says so in one line and the comparison shows the three steps.
import { t, num, gel, dt, card, row } from "../ui.js?v=80ca9ef.202611111239";

export default function view(d) {
  const tx = d.tax || {}; const v = d.vat || [];
  const ref = Number(tx.card_refunds) > 0;
  const adj = ref ? `<div class="hero-s">${t("tax.adj", { d: dt(tx.card_refund_on), r: gel(tx.card_refunds, 2) })}</div>` : "";
  let s = `<div class="card hero"><div class="hero-l">${t("tax.credit")}</div><div class="hero-v">${gel(tx.card_balance, 2)}</div><div class="hero-s">${t("tax.card_on", { d: dt(tx.card_as_of) })}</div>${adj}</div>`;
  const diff = Number(tx.card_balance) - Number(tx.books_tax_account);
  s += card(t("tax.vs"), "", row(t("tax.card"), dt(tx.card_as_of), gel(ref ? tx.card_snapshot : tx.card_balance, 2))
    + (ref ? row(t("tax.refund"), dt(tx.card_refund_on), `−${num(tx.card_refunds, 2)} ₾`) + row(t("tax.now"), "", gel(tx.card_balance, 2)) : "")
    + row(t("tax.books"), "", gel(tx.books_tax_account, 2))
    + row(t("tax.diff"), ref && Math.abs(diff + Number(tx.card_refunds)) < 5 ? t("tax.books_pending") : "", `<span class="${Math.abs(diff) < 5 ? "pos" : "neg"}">${num(diff, 2)} ₾</span>`)
    + row(t("tax.input_vat"), "", gel(tx.input_vat_rsge, 2)));
  if (v.length) {
    const mx = Math.max(...v.map((x) => Number(x.vat)));
    s += card(t("tax.by_month"), t("tax.invoices"), `<div class="vbars">${v.map((x) => `<div class="vb"><b>${num(x.vat)}</b><i style="height:${Math.max(4, Number(x.vat) / mx * 80)}px"></i><span>${t("mon_short")[new Date(x.month).getMonth()]}</span></div>`).join("")}</div>`);
  }
  s += `<div class="note">${t("tax.note")}</div>`;
  return s;
}

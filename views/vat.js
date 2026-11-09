// დღგ (the main company; the bot's card M5): VAT by month from the rs.ge invoices - not the declaration, not the tax card.
import { t, esc, gel, dt, card, row, stat, monthName } from "../ui.js?v=86cc6d3.202611091626";

export default function view(d) {
  const net = Number(d.net);
  let s = `<div class="card hero"><div class="hero-l">${t(net > 0 ? "vat.to_pay" : "vat.to_credit", { y: esc(d.year) })}</div><div class="hero-v">${gel(net)}</div><div class="hero-s">${t("vat.formula")}</div></div>`;
  s += `<div class="grid2">${stat(t("vat.output"), gel(d.output), t("vat.output_sub"))}${stat(t("vat.input"), gel(d.input), Number(d.awaiting) ? t("vat.awaiting", { v: gel(d.awaiting) }) : t("vat.input_sub"))}</div>`;
  s += card(t("vat.by_month"), t("vat.by_month_sub"), (d.months || []).map((r) => row(monthName(r.month), t("vat.month_row", { o: gel(r.output_vat), i: gel(r.input_vat) }),
    `<span class="${Number(r.net_vat) > 0 ? "" : "pos"}">${gel(r.net_vat)}</span>`)).join(""));
  return s + `<div class="note">${t("vat.note", { d: dt(d.last) })}</div>`;
}

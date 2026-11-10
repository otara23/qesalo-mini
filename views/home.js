// მთავარი (the nursery's home). A view: (data of one company's section, me, t, company) -> HTML of the sheet's cells.
// otar-1011 §1.4 (Otar 10.11): no „ყურადსაღები" card, no capex note and no „ბანკის მონაცემი … დღისაა" banner - the alerts
// live in their pushes and on the შეტყობინებები tab (the function still counts them for its badge), a stale bank feed is
// the doctor's business; the hero, the four figures and the NBG chips as before.
import { t, num, gel, dt, stat } from "../ui.js?v=ecad6c0.202611101959";

export default function view(d) {
  const h = d.home || {};
  let s = `<div class="card hero tap" data-go="cash"><div class="hero-l">${t("home.cash")}</div><div class="hero-v">${gel(h.cash_gel)}</div><div class="hero-s">${t("home.cash_sub", { d: dt(h.bank_as_of) })}</div></div>`;
  s += `<div class="grid2">`
    + stat(t("home.opex"), gel(h.opex_ytd), t("home.books_on", { d: dt(h.books_as_of) }))
    + stat(t("home.capex"), gel(h.capex_booked_net), t("home.capex_sub"))
    + stat(t("home.vat"), gel(h.vat_credit), t("home.vat_sub"))
    + stat(t("home.revenue"), gel(h.revenue_ytd), h.revenue_ytd ? "" : t("home.revenue_none"))
    + `</div>`;
  if (d.fx && d.fx.length) s += `<div class="chips">${d.fx.map((f) => `<span class="chip">${f.ccy} ${num(f.rate, 4)}</span>`).join("")}<span class="chip">${t("home.nbg", { d: dt(d.fx[0].rate_date) })}</span></div>`;
  return s;
}

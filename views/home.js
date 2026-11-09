// მთავარი (the nursery's home). A view: (data of one company's section, me, t, company) -> HTML of the sheet's cells.
import { t, esc, num, gel, dt, daysAgo, card, row, stat, lvl } from "../ui.js?v=dc00dfd.202611091715";

export default function view(d, me) {
  const h = d.home || {}; const bankOld = daysAgo(h.bank_as_of);
  let s = "";
  if (bankOld != null && bankOld > 2) s += `<div class="banner">${t("home.bank_old", { n: bankOld })}</div>`;
  s += `<div class="card hero tap" data-go="cash"><div class="hero-l">${t("home.cash")}</div><div class="hero-v">${gel(h.cash_gel)}</div><div class="hero-s">${t("home.cash_sub", { d: dt(h.bank_as_of) })}</div></div>`;
  s += `<div class="grid2">`
    + stat(t("home.opex"), gel(h.opex_ytd), t("home.books_on", { d: dt(h.books_as_of) }))
    + stat(t("home.capex"), gel(h.capex_booked_net), t("home.capex_sub"))
    + stat(t("home.vat"), gel(h.vat_credit), t("home.vat_sub"))
    + stat(t("home.revenue"), gel(h.revenue_ytd), h.revenue_ytd ? "" : t("home.revenue_none"))
    + `</div>`;
  if (d.fx && d.fx.length) s += `<div class="chips">${d.fx.map((f) => `<span class="chip">${f.ccy} ${num(f.rate, 4)}</span>`).join("")}<span class="chip">${t("home.nbg", { d: dt(d.fx[0].rate_date) })}</span></div>`;
  // the open alerts (field home.alerts); the link to the alerts tab only for a person who has that tab (bot-v3 Q2: the
  // admin keeps the pushes, not the tab)
  if (me.role !== "investor" && d.alerts && d.alerts.length) {
    const tab = (me.tabs || []).includes("alerts");
    s += card(t("home.attention"), tab ? `<span class="tap" data-go="alerts">${t("home.all", { n: h.open_alerts || "" })}</span>` : h.open_alerts ? t("home.open_n", { n: h.open_alerts }) : "",
      d.alerts.map((a) => row(`<span style="display:inline-flex;align-items:baseline;gap:9px"><span class="dot ${lvl(a.level)}"></span><span>${esc(a.title)}</span></span>`, "", null, tab ? "tap\" data-go=\"alerts" : "")).join(""));
  }
  if (me.role !== "investor" && h.capex_unassigned > 0) s += `<div class="note">${t("home.capex_unassigned", { v: gel(h.capex_unassigned) })}</div>`;
  return s;
}

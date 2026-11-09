// რადარი (the main company; wave polish1 - the tender radar of featA): every open tender on the radar, our history at
// its procurer; facts only, no advice.
import { t, esc, num, gel, card, row, stat, dy, cut, radarName } from "../ui.js?v=9d4cb1c.202611092057";

export default function view(d) {
  const T = d.tenders || [], amt = (x) => (x.estimate_gel != null ? gel(x.estimate_gel) : esc(x.estimate_ccy || "—"));
  const hist = (h) => (!h ? t("radar.never") : t("radar.history", { n: num(h.tenders), w: num(h.won), last: h.last_contract ? t("radar.history_last", { y: h.last_year, v: gel(h.last_contract) }) : "" }));
  let s = d.age == null ? `<div class="banner">${t("radar.never_ran")}</div>` : d.age > 1 ? `<div class="banner">${t("radar.last_run", { d: dy(d.last_run, d.today) })}</div>` : "";
  s += `<div class="grid2">${stat(t("radar.open"), num(T.length), t("radar.ours", { n: num(d.ours) }))}${stat(t("radar.fresh"), num(d.fresh), "")}</div>`;
  s += card(t("radar.by_deadline"), T.length, T.length ? T.map((x) => row(esc(radarName(x.procurer)), `${x.fresh ? t("radar.new") + " · " : ""}${t("radar.deadline", { d: dy(x.bids_end, d.today) })} · ${esc(cut(x.subject, 160))} · ${esc(hist(x.history))}`, `${amt(x)}<small>${esc(x.no)}</small>`)).join("")
    : `<div class="empty">${t("radar.none")}</div>`);
  return s + `<div class="note">${t("radar.note", { d: dy(d.last_run, d.today) })}</div>`;
}

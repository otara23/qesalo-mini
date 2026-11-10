// დასადასტურებელი (both companies; wave polish1 - the bot's „rs.ge დასადასტურებელი" card of featC, the whole lists):
// purchase invoices we must confirm, sales the buyer has not confirmed (the 15 largest buyers one by one), saved waybills.
import { t, esc, num, gel, card, row, stat, dy, until, detRow } from "../ui.js?v=7a1500c.202611101912";

export default function view(d) {
  const P = d.purchase || { rows: [] }, Sa = d.sale || { buyers: [] }, Wb = d.waybills || { rows: [] }, co = d.company === "main" ? "w" : "wn";
  const st = (x) => (x.status_as_of ? " · " + t("watch.status", { d: dy(x.status_as_of, d.year) }) : "");
  let s = `<div class="grid2">${stat(t("watch.purchase"), num(P.n), P.n ? t("watch.vat", { v: gel(P.vat) }) : t("watch.nothing"))}${stat(t("watch.sale_7"), num(Sa.n), Sa.n ? gel(Sa.gross) : t("watch.nothing"))}${Wb.n ? stat(t("watch.waybill"), num(Wb.n), t("watch.saved")) : ""}</div>`;
  s += card(t("watch.p_title"), P.n ? t("watch.vat", { v: gel(P.vat) }) : "", P.n ? P.rows.map((x) => row(esc(x.name), `${dy(x.issued_at, d.year)} · ${t("watch.days", { n: num(x.days) })}${st(x)}`, `${t("watch.vat", { v: gel(x.vat) })}<small>${gel(x.amount)}</small>`)).join("")
    : `<div class="empty"><span class="dot ok"></span> ${t("watch.p_none")}</div>`);
  // the 15 largest buyers one by one (a tap opens their invoices), the rest in one row that opens to the list
  const B = Sa.buyers || [], top = B.slice(0, 15), more = B.slice(15);
  if (Sa.n) s += card(t("watch.s_title"), t("watch.buyers", { n: num(B.length) }), top.map((b, i) => detRow(co + i, esc(b.name), `${t("watch.invoices", { n: num(b.n) })} · ${until(b.oldest, d.year, t("watch.since_suffix"))}`, gel(b.gross),
    b.invoices.map((x) => `<div><span>${dy(x.issued_at, d.year)} · ${t("watch.days", { n: num(x.days) })}${st(x)}</span><b>${gel(x.amount)}</b></div>`).join(""))).join("")
    + (more.length ? detRow(co + "more", t("watch.more_buyers", { n: num(more.length) }), t("watch.invoices", { n: num(more.reduce((a, b) => a + b.n, 0)) }), gel(more.reduce((a, b) => a + b.gross, 0)),
      more.map((b) => `<div><span>${esc(b.name)} · ${num(b.n)} · ${until(b.oldest, d.year, t("watch.since_suffix"))}</span><b>${gel(b.gross)}</b></div>`).join("")) : ""));
  if (Wb.n) s += card(t("watch.w_title"), Wb.n, Wb.rows.map((x) => row(esc(x.name), `${dy(x.issued_at, d.year)} · ${t("watch.days", { n: num(x.days) })}${st(x)}`, gel(x.amount))).join(""));
  return s + `<div class="note">${P.n ? t("watch.note_vat") + " " : ""}${t("watch.note", { d: dy(d.as_of, d.year), older: d.older_as_of ? " · " + t("watch.older", { d: dy(d.older_as_of, d.year) }) : "" })}</div>`;
}

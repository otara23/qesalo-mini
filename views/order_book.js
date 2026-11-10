// ხელშეკრულებები (the main company; wave polish1 - the order book of featB): live public contracts minus what rs.ge shows
// invoiced to the same procurer; „≈" where several contracts share a procurer's invoices.
import { t, esc, num, gel, card, row, stat, monthName, dy, until, shortName, detRow } from "../ui.js?v=ed7cbe0.202611101313";

export default function view(d) {
  const P = d.procurers || [], open = P.filter((p) => p.remaining > 0.5), done = P.filter((p) => p.remaining <= 0.5), ap = (p) => (p.approx ? "≈ " : "");
  const src = `<div class="note">${t("order_book.src", { m: dy(d.tm_updated, d.today), r: dy(d.rsge_as_of, d.today) })}</div>`;
  if (!P.length) return card(t("order_book.title"), "", `<div class="empty">${t("order_book.none")}</div>`) + src;
  let s = `<div class="card hero"><div class="hero-l">${t("order_book.left")}</div><div class="hero-v">${d.approx ? "≈ " : ""}${gel(d.remaining)}</div><div class="hero-s">${t("order_book.left_sub", { v: gel(d.invoiced) })}</div></div>`;
  s += `<div class="grid2">${stat(t("order_book.contracts"), gel(d.value), t("order_book.contracts_sub", { n: num(d.contracts), p: num(P.length) }))}${stat(t("order_book.this_month", { m: monthName(d.today) }), gel(d.month), t("order_book.last_invoice", { d: dy(d.last_invoice, d.today) }))}</div>`;
  s += card(t("order_book.by_procurer"), d.approx ? t("order_book.approx") : "", open.map((p, i) => detRow("ob" + i, esc(shortName(p.name)),
    `${t("order_book.p_row", { v: gel(p.value), n: num(p.contracts) })} · ${until(p.last_end, d.today, t("order_book.until_suffix"))}<div class="bar"><i style="width:${Math.max(0, Math.min(100, 100 * p.remaining / (p.value || 1)))}%"></i></div>`,
    ap(p) + gel(p.remaining), (p.live || []).map((c) => `<div><span>${esc(c.id)} · ${dy(c.start, d.today)}–${dy(c.end, d.today)}</span><b>${gel(c.value)}</b></div>`).join(""))).join(""));
  if (done.length) s += card(t("order_book.done"), done.length, done.map((p) => row(esc(shortName(p.name)), `${t("order_book.p_row", { v: gel(p.value), n: num(p.contracts) })} · ${until(p.last_end, d.today, t("order_book.until_suffix"))}`, `<span class="mut">${gel(p.remaining)}</span>`)).join(""));
  return s + src;
}

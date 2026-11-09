// ტენდერები (the main company; the bot's card M8): the current year's tenders from the KB (Tender Monitor).
import { t, esc, gel, dt, card, row, stat, cut } from "../ui.js?v=e8f5cf1.202611091511";

const STATUS = { won: "p-ok", lost: "p-bad", in_progress: "p-warn", failed: "p-grey" };

export default function view(d) {
  const tn = d.s, src = `<div class="note">${t("tenders.src", { b: dt(d.built), m: dt(d.tm_updated) })}</div>`;
  if (!tn) return card(t("tenders.title", { y: esc(d.year) }), "", `<div class="empty">${t("tenders.none")}</div>`) + src;
  let s = `<div class="card hero"><div class="hero-l">${t("tenders.won_title", { y: esc(d.year) })}</div><div class="hero-v">${esc(tn.won)} / ${esc(tn.tenders)}</div><div class="hero-s">${t("tenders.won_sub", { p: esc(tn.win_rate_pct), v: gel(tn.contract_won) })}</div></div>`;
  s += `<div class="grid2">${stat(t("tenders.lost"), esc(tn.lost), Number(tn.failed) ? t("tenders.failed_n", { n: esc(tn.failed) }) : "")}${stat(t("tenders.in_progress"), esc(tn.in_progress), "")}</div>`;
  s += card(t("tenders.last5"), "", (d.last || []).map((r) => { const cl = STATUS[r.status] || "p-grey", st = STATUS[r.status] ? t("tenders.status." + r.status) : r.status;
      return row(esc(cut(String(r.who).replace(/"([^"]*)"/g, "„$1“"), 80)), dt(r.announced) + " · " + esc(cut(r.subject, 70)), `${gel(r.amount)}<small><span class="pill ${cl}">${esc(st)}</span></small>`); }).join("")
    + `<div class="note">${t("tenders.amount_note")}</div>`);
  s += card(t("tenders.year_total"), "", row(t("tenders.won_contracts"), "", `<span class="pos">${gel(tn.contract_won)}</span>`)
    + row(t("tenders.sole"), "", esc(tn.won_sole_bidder)) + row(t("tenders.other_won"), "", `<span class="mut">${gel(tn.contract_lost_other_winner)}</span>`));
  return s + src;
}

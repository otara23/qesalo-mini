// ვადები (both companies; wave polish1 - the bot's „ვადები" card of featA, the whole list): within 90 days, later, open
// items; kind, source and days left; 14 days flagged. The `mini` function did the card's arithmetic.
import { t, esc, num, gel, card, row, stat, monthName, dy, until, daysIn, quotes, calTitle } from "../ui.js?v=a9fa4a0.202611091744";

export default function view(d) {
  const main = d.company === "main", dated = d.dated || [], open = d.open || [];
  const dueTxt = (r) => (r.precision === "year" ? r.due.slice(0, 4) : r.precision === "month" ? monthName(r.due) + " " + r.due.slice(0, 4) : dy(r.due, d.today));
  const in90 = (r) => r.precision !== "year" && (Date.parse(r.due) - Date.parse(d.today)) / 864e5 <= 90;
  const line = (r) => row(esc(calTitle(r.title)), [r.kind, r.note, r.amount_gel ? gel(r.amount_gel) : "", r.ambiguous ? t("deadlines.two_dates") : "", r.src].filter(Boolean).map(esc).join(" · "),
    dueTxt(r) + (r.days != null ? `<small>${r.soon ? `<span class="pill p-warn">${daysIn(r.days)}</span>` : daysIn(r.days)}</small>` : ""));
  let s = `<div class="grid2">` + (main ? stat(t("deadlines.in90"), num(d.in90), t("deadlines.in30", { n: num(d.in30) })) + stat(t("deadlines.guarantees"), num(d.guarantees), d.guarantees ? gel(d.guarantees_gel) : "")
    : stat(t("deadlines.open_n"), num(open.length), "") + stat(t("deadlines.in90"), num(d.in90), t("deadlines.in30", { n: num(d.in30) }))) + `</div>`;
  const near = dated.filter(in90), later = dated.filter((r) => !in90(r));
  if (dated.length || !open.length) s += card(t("deadlines.in90"), near.length, near.length ? near.map(line).join("") : `<div class="empty">${t("deadlines.none_90")}</div>`);
  if (later.length) s += card(t("deadlines.later"), later.length, later.map(line).join(""));
  if (open.length) s += card(t("deadlines.open"), open.length, open.map((r) => row(esc(quotes(r.title)), [r.note, r.src].filter(Boolean).map(esc).join(" · "), r.since ? until(r.since, d.today, t("deadlines.since_suffix")) : "—")).join(""));
  return s + `<div class="note">${t("deadlines.note", { d: dy(d.built, d.today) })}</div>`;
}

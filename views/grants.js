// გრანტები (grant radar W2 „grantB", plans/grant-radar.md §7; Otar's D1: Otar both companies, Tornike the nursery's): the
// radar list - every program row of the company with its verdict and the items it names (the bot's card shows three) -
// and, on a tap, the row's rules: what does not hold, what is to be confirmed, what holds and the computations, each with
// its evidence and date, the rule and its act and article, „(მეორადი წყარო)" for a secondary source, „(სურათიდან)" for a
// figure read off an image, and the review mark while a change of its act waits. Facts only, never advice. The data is
// mini/functions/mini/grants.ts (grants_live, written by the PC's checker lib/grants/check.mjs).
import { t, esc, num, card, stat, detRow, dy } from "../ui.js?v=a706252.202611151758";

const isOpen = (r) => r.status === "open" || r.status === "rolling";
const DOT = { fail: "bad", unknown: "warn", pass: "ok", info: "info" };
const PILL = { eligible: "p-ok", eligible_if: "p-warn", not_eligible: "p-bad", not_applicable: "p-grey", watch: "p-grey" };
const dateOf = (r, today) => (r.next_date_precision === "month" ? `${r.next_date.slice(5, 7)}.${r.next_date.slice(0, 4)}` : dy(r.next_date, today));
const S = (tier) => (tier === "S" ? " " + t("grants.secondary") : "");
// a number and its unit, a date and its case ending stay on one line („19.11.2026-ს", „100 000 ₾-დან") - the card's glue
const G = (s) => String(s).replace(/(\d) (?=\d{3}(?!\d))/g, "$1 ").replace(/(\d) (?=[ა-ჰ₾$€%])/g, "$1 ").replace(/-(?=[ა-ჰ]{1,3}(?![ა-ჰ]))/g, "-⁠").replace(/(\d)–(?=\d)/g, "$1–⁠");
const E = (s) => G(esc(s));
// lib/grants/check.mjs named(): what fails first, then what is unknown - each once by its short name; a not-eligible row
// names only what bars it
function named(r) {
  const seen = new Set(), out = [], failsOnly = r.verdict === "not_eligible";
  for (const st of failsOnly ? ["fail"] : ["fail", "unknown"]) for (const i of r.items || []) {
    if (i.status !== st || (failsOnly && i.bars === false)) continue;
    const s = i.short || i.text;
    if (!seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out;
}
const reviewOf = (r) => { const i = (r.items || []).find((x) => x.review); return r.review_since ? t("grants.review", { what: i?.review_what || "", d: dy(String(r.review_since).slice(0, 10)) }) : ""; };
function sub(r, today) {
  const parts = [];
  if (r.next_date && r.next_date >= today) parts.push(`${dateOf(r, today)}: ${esc(r.next_date_ka)}${S(r.next_date_tier)}`);
  if (!isOpen(r)) parts.push(esc(t("grants.status." + r.status)));
  const xs = r.verdict === "watch" ? [] : named(r);
  const v = r.verdict === "watch" ? esc(r.facts || "") : `<span class="pill ${PILL[r.verdict] || "p-grey"}">${esc(t("grants.verdict." + r.verdict))}</span>${xs.length ? " " + xs.slice(0, 6).map(E).join(" · ") + (xs.length > 6 ? ` · +${xs.length - 6}` : "") : ""}${S(r.tier)}`;
  parts.push(v);
  const rv = reviewOf(r); if (rv) parts.push(`<b>${esc(rv)}</b>`);
  return parts.join(" · ");
}
// one rule's line in the row's sheet
function line(i) {
  const src = `${/^R\d\d$/.test(i.rule) ? i.rule + " · " : ""}${i.source || ""}${i.tier === "P-image" ? " " + t("grants.image") : ""}`;
  const extra = [i.bars === false ? t("grants.parcel_only") : "", i.review ? t("grants.review_item", { what: i.review_what || "", d: dy(i.review) }) : ""].filter(Boolean);
  const barred = i.list && i.list.length ? `<br><small>${esc(t("grants.barred", { n: num(i.list.length) }))}: ${i.list.map(esc).join(", ")}</small>` : "";
  return `<div style="justify-content:flex-start;align-items:flex-start;padding:4px 0"><span class="dot ${DOT[i.status] || "info"}" style="margin-top:4px"></span>`
    + `<span style="flex:1;min-width:0"><b>${E(i.text)}${S(i.tier)}</b><br>${E(i.evidence || "")}<br><small>${esc(src)}${extra.length ? " · " + extra.map(esc).join(" · ") : ""}</small>${barred}</span></div>`;
}
function sheet(r) {
  const m = r.money || {}, its = r.items || [];
  let s = "";
  if (m.kpi_ka || m.act_ka) s += `<div style="justify-content:flex-start;flex-wrap:wrap;gap:4px 12px;padding:2px 0 6px"><span>${esc(t("grants.money"))}: <b>${esc(m.kpi_ka || r.value || "—")}</b>${m.kpi_sub_ka ? " · " + esc(m.kpi_sub_ka) : ""}${S(m.tier)}</span>${m.act_ka ? `<span>${esc(t("grants.act"))}: ${esc(m.act_ka)}</span>` : ""}</div>`;
  for (const st of ["fail", "unknown", "pass", "info"]) {
    const g = its.filter((i) => i.status === st);
    if (!g.length) continue;
    s += `<div style="font-weight:600;padding:8px 0 2px">${esc(t("grants.group." + st))} (${num(g.length)})</div>` + g.map(line).join("");
  }
  if (r.facts) s += `<div style="justify-content:flex-start;padding-top:6px"><small>${E(r.facts)}${S(r.tier)}${r.source ? " · " + esc(r.source) : ""}</small></div>`;
  return s;
}

export default function view(d) {
  const R = d.rows || [], today = d.today, next = R.find((r) => r.next_date && r.next_date >= today);
  let s = d.age == null ? `<div class="banner">${t("grants.never_ran")}</div>` : d.age > 1 ? `<div class="banner">${t("grants.last_run", { d: dy(d.last_run, today) })}</div>` : "";
  s += `<div class="grid2">${stat(t("grants.open"), num(d.open), [t("grants.open_sub", { f: num(d.eligible_if), e: num(d.eligible) }), d.changes_24h ? t("grants.changes", { n: num(d.changes_24h) }) : ""].filter(Boolean).join(" · "))}`
    + `${stat(t("grants.next"), next ? dateOf(next, today) : "—", next ? esc(next.next_date_ka) + S(next.next_date_tier) : "")}</div>`;
  if ((d.reviews || []).length) s += card(t("grants.reviews"), d.reviews.length, d.reviews.map((x) => `<div class="row"><div class="row-m"><div class="row-t">${esc(x.summary || "")}</div><div class="row-c">${dy(String(x.seen_at).slice(0, 10), today)}${S(x.tier)}</div></div></div>`).join(""));
  const id = (k) => `g${d.company === "main" ? "m" : "n"}${k}`;
  s += card(t("grants.rows"), R.length, R.length ? R.map((r, k) => detRow(id(k), esc(r.name), sub(r, today), esc(r.value || "—"), sheet(r))).join("") : `<div class="empty">${t("grants.none")}</div>`);
  return s + `<div class="note">${esc(t("grants.tap"))} · ${t("grants.note", { d: dy(d.last_run, today), c: d.checked_at ? dy(String(d.checked_at).slice(0, 10), today) : "—" })}</div>`;
}

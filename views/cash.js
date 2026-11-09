// ფული: the nursery's per currency (bank, books, the gap on the books' date - schema 010); the main company's per bank x
// currency (the bot's card M1, lib/cards-main.mjs; the `mini` function did the arithmetic).
// W-LIVE (9.11): the bank's time from fetched_at (the minute runner, schema/029) when it is of the balance's day, and the
// till (სალარო) from ORIS in both companies (Otar 9.11; ./functions/mini/till.ts, schema/029b): the hero is banks + till,
// the „სად არის" card keeps the bank total the bot's card shows.
import { t, tOr, esc, num, gel, dt, tm, card, row, barRow, span, fxAmt } from "../ui.js?v=e8f5cf1.202611091511";

const ymd = (s) => { const d = new Date(s); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const at = (asOf, fetched) => (fetched && asOf && ymd(fetched) === String(asOf).slice(0, 10) ? tm(fetched) : dt(asOf));
function where(bank, till) {
  if (!till) return "";
  const note = till.last_entry ? t("cash.till_note", { d: dt(till.last_entry), t: till.synced_at ? tm(till.synced_at) : "—" }) : t("cash.till_empty", { t: till.synced_at ? tm(till.synced_at) : "—" });
  return card(t("cash.where"), "", row(t("cash.banks"), "", gel(bank)) + row(t("cash.till"), note, gel(till.gel)));
}

function nursery(d) {
  const c = d.cash || []; const bank = c.reduce((a, x) => a + Number(x.gel_equivalent || 0), 0), tot = d.till ? Math.round(bank) + Math.round(Number(d.till.gel || 0)) : bank;
  let s = `<div class="card hero"><div class="hero-l">${t(d.till ? "cash.total_all" : "cash.total")}</div><div class="hero-v">${gel(tot)}</div><div class="hero-s">${t("cash.fx_today")}</div></div>`;
  s += where(bank, d.till);
  s += c.map((x) => {
    // bank vs books on the books' date (v_v1_cash.bank_books_gap = bank balance that day − books), like with like
    const gap = x.bank_books_gap != null ? Number(x.bank_books_gap) : null;
    return card(x.currency, x.fx_rate ? t("cash.rate", { r: num(x.fx_rate, 4) }) : "",
      row(t("cash.bank"), at(x.bank_as_of, x.bank_fetched_at), num(x.bank_balance, 2) + " " + x.currency + (x.fx_rate ? `<small>${gel(x.gel_equivalent)}</small>` : ""))
      + row(t("cash.books"), dt(x.books_as_of), num(x.books_balance, 2) + " " + x.currency)
      + (gap != null ? row(t("cash.gap", { d: dt(x.books_as_of) }), t("cash.gap_sub", { d: dt(x.books_as_of), v: num(x.bank_on_books_date, 2), c: x.currency }), `<span class="${Math.abs(gap) < 1 ? "pos" : "neg"}">${num(gap, 2)} ${x.currency}</span>`)
                     : `<div class="note">${t("cash.no_compare")}</div>`));
  }).join("");
  return s;
}

function main(d) {
  const L = d.lines || [];
  const warn = [d.age > 2 ? t("cash.age", { n: d.age }) : "", (d.fx_missing || []).length ? t("cash.fx_missing", { c: d.fx_missing.join(", ") }) : ""].filter(Boolean).join(" · ");
  let s = warn ? `<div class="banner">${esc(warn)}</div>` : "";
  const tot = d.till ? Math.round(Number(d.total_gel || 0)) + Math.round(Number(d.till.gel || 0)) : d.total_gel;   // the rounded parts add up on screen
  s += `<div class="card hero"><div class="hero-l">${t(d.till ? "cash.total_all" : "cash.total")}</div><div class="hero-v">${gel(tot)}</div><div class="hero-s">${t("cash.main_sub", { d: at(d.as_of, d.fetched_at) })}</div></div>`;
  s += where(d.total_gel, d.till);
  s += card(t("cash.by_bank"), "", L.map((x) => barRow(esc(tOr("bank." + x.bank, x.bank) + " · " + x.currency),
      `${t("cash.accounts", { n: num(x.accounts_nonzero) })} · ${span(x.as_of, x.as_of_newest)}${x.currency !== "GEL" && x.fx_rate ? " · " + t("cash.rate", { r: num(x.fx_rate, 4) }) : ""}`,
      x.currency === "GEL" ? gel(x.balance) : fxAmt(x.balance, x.currency) + `<small>${x.gel_equivalent == null ? "—" : gel(x.gel_equivalent)}</small>`, x.share)).join("")
    + (d.empty_accounts ? row(t("cash.zero"), t("cash.zero_sub"), `<span class="mut">${num(d.empty_accounts)}</span>`) : ""));
  if (d.top_bank && d.top_bank.pct != null) s += `<div class="note">${t("cash.top_bank", { p: d.top_bank.pct, b: esc(tOr("bank_in." + d.top_bank.bank, d.top_bank.bank)) })}</div>`;
  return s;
}

export default function view(d, me, _t, co) { return co === "main" ? main(d) : nursery(d); }

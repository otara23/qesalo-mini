// ფული - plain for both companies (wave W-DRILL, plans/bot-v3.md §3.2, Otar's item 7, 9.11.2026: „In ფული tab, I do not
// need the ბუღალტერია differences. It should look plain and simple, just like in მწვანე სახლი ფული tab"): the main
// company's layout (the bot's card M1, lib/cards-main.mjs) for the nursery too - a warning banner (bank older than 2
// days, a missing rate), the total, one row per bank x currency (accounts, the bank's time, the NBG rate, the share),
// the zero-balance count. A bank row opens to its accounts (GE…1234 for everyone but the admin; the investor's rows do
// not open). The bank <-> books gap is on the ბუღალტერია tab now. ● ლაივი while the bank was read less than 3 minutes
// ago (the minute runner, schema/029; W-RT adds the socket condition).
// W-LIVE (9.11): the bank's time from fetched_at (the minute runner, schema/029) when it is of the balance's day, and the
// till (სალარო) from ORIS in both companies (Otar 9.11; ./functions/mini/till.ts, schema/029b): the hero is banks + till,
// the „სად არის" card keeps the bank total the bot's card shows.
// The numbers: the nursery's bank total = Σ v_v1_cash.gel_equivalent (card N2), the main company's = v_main_cash
// total_gel (card M1); the rows are ./functions/mini/cash.ts's.
import { t, tOr, esc, num, gel, dt, tm, card, row, barRow, span, fxAmt } from "../ui.js?v=5309b78.202611091541";

const ymd = (s) => { const d = new Date(s); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const at = (asOf, fetched) => (fetched && asOf && ymd(fetched) === String(asOf).slice(0, 10) ? tm(fetched) : dt(asOf));
const today = () => new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10);   // Tbilisi = UTC+4
function where(bank, till) {
  if (!till) return "";
  const note = till.last_entry ? t("cash.till_note", { d: dt(till.last_entry), t: till.synced_at ? tm(till.synced_at) : "—" }) : t("cash.till_empty", { t: till.synced_at ? tm(till.synced_at) : "—" });
  return card(t("cash.where"), "", row(t("cash.banks"), "", gel(bank)) + row(t("cash.till"), note, gel(till.gel)));
}
// ● ლაივი: the bank read less than 3 minutes ago; the dot goes when that is no longer true (a timer, no refetch)
const LIVE_MS = 3 * 60e3;
const live = (fetched) => {
  const until = fetched ? Date.parse(fetched) + LIVE_MS : 0;
  return until > Date.now() ? ` <span class="ca-live" data-live-until="${until}">${esc(t("cash.live"))}</span>` : "";
};
const S = { open: {} };

function sheet(d, co) {
  const L = d.lines || [], tot = d.till ? Math.round(Number(d.total_gel || 0)) + Math.round(Number(d.till.gel || 0)) : d.total_gel;   // the rounded parts add up on screen
  const warn = [d.age > 2 ? t("cash.age", { n: d.age }) : "", (d.fx_missing || []).length ? t("cash.fx_missing", { c: d.fx_missing.join(", ") }) : ""].filter(Boolean).join(" · ");
  let s = warn ? `<div class="banner">${esc(warn)}</div>` : "";
  s += `<div class="card hero"><div class="hero-l">${t(d.till ? "cash.total_all" : "cash.total")}</div><div class="hero-v">${gel(tot)}</div><div class="hero-s">${t("cash.main_sub", { d: at(d.as_of, d.fetched_at) })}${live(d.fetched_at)}</div></div>`;
  s += where(d.total_gel, d.till);
  const day = today();
  s += card(t("cash.by_bank"), "", L.map((x, i) => {
    const key = `${co}|${x.bank}|${x.currency}`, acc = x.accounts_list || [], open = !!S.open[key] && acc.length > 0;
    const sub = `${t("cash.accounts", { n: num(x.accounts_nonzero) })} · ${at(x.as_of, x.fetched_at) === dt(x.as_of) ? span(x.as_of, x.as_of_newest) : at(x.as_of, x.fetched_at)}${x.currency !== "GEL" && x.fx_rate ? " · " + t("cash.rate", { r: num(x.fx_rate, 4) }) : ""}`;
    const value = x.currency === "GEL" ? gel(x.balance) : fxAmt(x.balance, x.currency) + `<small>${x.gel_equivalent == null ? "—" : gel(x.gel_equivalent)}</small>`;
    const bar = barRow(esc(tOr("bank." + x.bank, x.bank) + " · " + x.currency), sub, value, x.share);
    const stale = x.as_of && String(x.as_of) < day ? `<div class="note">${esc(t("cash.not_read", { b: tOr("bank." + x.bank, x.bank), d: dt(x.as_of) }))}</div>` : "";
    if (!acc.length) return bar + stale;
    return `<div class="ca-b${open ? " on" : ""}" role="button" tabindex="0" data-ca="${esc(key)}" aria-expanded="${open}">${bar}<span class="chev">›</span></div>`
      + (open ? `<div class="ca-p">${acc.map((a) => row(`<span class="mono">${esc(a.account)}</span>`, a.fetched_at ? at(a.as_of, a.fetched_at) : dt(a.as_of),
          (x.currency === "GEL" ? gel(a.balance, 2) : fxAmt(a.balance, x.currency) + `<small>${a.gel == null ? "—" : gel(a.gel)}</small>`))).join("")}</div>` : "") + stale;
  }).join("") + (d.empty_accounts ? row(t("cash.zero"), t("cash.zero_sub"), `<span class="mut">${num(d.empty_accounts)}</span>`) : "")
    + (L.length ? "" : `<div class="empty">${esc(t("cash.none"))}</div>`));
  if (d.top_bank && d.top_bank.pct != null) s += `<div class="note">${t("cash.top_bank", { p: d.top_bank.pct, b: esc(tOr("bank_in." + d.top_bank.bank, d.top_bank.bank)) })}</div>`;
  return s;
}

// the page draws each section once per tab load; a tap on a bank row redraws #view from the same sections
const P = { me: null, secs: [], pass: false };
export default function view(d, me, _t, co) {
  css();
  if (!P.pass) { P.pass = true; P.secs = []; S.open = {}; queueMicrotask(() => { P.pass = false; }); }
  P.me = me; P.secs.push({ company: co, data: d });
  return sheet(d, co);
}
async function redraw() {
  const el = document.getElementById("view"); if (!el || !P.me) return;
  const on = document.querySelector(".tab.on"); if (on && on.dataset.t !== "cash") return;
  const { SYM, caps } = await import("../ui.js");
  const both = P.me.scope === "both";
  el.innerHTML = (both ? `<div class="note">${t("app.both_note")}</div>` : "")
    + P.secs.map((x) => (both && x.company ? `<div class="co-h">${SYM[x.company] || ""} ${esc(P.me.companies[x.company].name)}</div>` : "") + sheet(x.data, x.company)).join("");
  caps(el);
}
if (typeof document !== "undefined" && !window.__cashView) {
  window.__cashView = true;
  const act = (el) => { const TG = window.Telegram && window.Telegram.WebApp; if (TG && TG.HapticFeedback) TG.HapticFeedback.selectionChanged(); S.open[el.dataset.ca] = !S.open[el.dataset.ca]; redraw(); };
  document.addEventListener("click", (e) => { const el = e.target.closest("[data-ca]"); if (el) act(el); });
  document.addEventListener("keydown", (e) => { const el = (e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("[data-ca]"); if (el) { e.preventDefault(); act(el); } });
  // the live dot leaves when its 3 minutes are over
  setInterval(() => { document.querySelectorAll("[data-live-until]").forEach((x) => { if (Number(x.dataset.liveUntil) <= Date.now()) x.remove(); }); }, 15e3);
}

function css() {
  if (document.getElementById("ca-css")) return;
  const st = document.createElement("style"); st.id = "ca-css";
  st.textContent = `
.ca-b{position:relative;cursor:pointer;transition:background-color 90ms var(--step)}
.ca-b:active{background:var(--q-surface-2)}
.ca-b .row{padding-right:20px}
.ca-b>.chev{position:absolute;right:0;top:14px}
.ca-b.on{box-shadow:inset 3px 0 0 var(--q-ink)}
.ca-b.on .row{padding-left:9px}
.ca-b.on>.chev{transform:rotate(90deg)}
.ca-p{background:var(--q-surface-2);margin:0 -12px;padding:0 12px 4px;box-shadow:inset 3px 0 0 var(--q-ink)}
.ca-live{display:inline-flex;align-items:center;gap:5px;margin-left:6px;font-weight:600;color:var(--q-ink);white-space:nowrap}
.ca-live::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--q-good)}
`;
  document.head.appendChild(st);
}

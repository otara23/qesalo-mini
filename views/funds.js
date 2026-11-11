// ინვესტიცია (the nursery) - wave W-INV `invest`, plans/bot-v3.md §3.1, 9.11.2026; redrawn by otar-1011 W3 §1.6
// (10.11.2026, Otar's nursery 3-5 and Image 11). Data: mini/functions/mini/invest.ts.
// Design C „ნახაზი", Operate mode. Top to bottom: the hero (what of the plan is spent, the plan and the share in one
// line); the founders' contribution as one full-width stat; the 15 investment lines as RANKED BARS (largest budget
// first; each row = the line's number, name and budget, then the spent share on the scale bar with its figure; status
// as a shape plus a word: ring „ჯერ არა", check „ათვისებული", triangle „ბიუჯეტზე მეტი"); tap a line → its sheet:
// budget, spent, left, every purchase with its date, purpose, amount and evidence kinds and dates - for the admin and
// masters the supplier(s) in one muted line, nothing else. Then where the money went (every purchase, ranked, one
// scale), the months (the farm purchase in its own cell before the strip, never inside it), the deal frame as pitched
// (no receipts, no captions), the title block. No review queue, no confidence, no „წინასწარი", no hatch encoding (Otar
// 10.11). Styles are this view's own (.inv-*), on the page's tokens, light and dark.
import { esc, gel, num, dt, card, stat, mt, lang } from "../ui.js?v=d919539.202611110839";
// W-I18N: a purpose in the language on screen (the function sends ka / ru / en, written by lib/invest after the wall), else ka
const said = (i) => (i && (i[lang()] || i.ka)) || "";

const KIND = (t, k) => t("funds.kind." + k);
const shortGel = (v, t) => (v >= 1e6 ? t("funds.mln", { v: num(v / 1e6, v % 1e6 ? 2 : 0).replace(/\.?0+$/, "") }) : v >= 1e3 ? t("funds.thousand", { v: num(v / 1e3) }) : gel(v));
const pctTxt = (p) => (!p ? "0" : p > 0 && p < 0.1 ? "<0.1" : num(p, p < 10 ? 1 : 0)) + " %";
const usd = (v) => num(v) + " $";

const STYLE = `<style>
#view .inv-rk{align-items:flex-start;padding:8px 0 9px;min-height:58px}
#view .inv-rk .chev{margin-top:1px}
#view .inv-r1{display:flex;align-items:baseline;gap:8px}
#view .inv-nn{flex:none;width:22px;font:800 15px/20px var(--ff);font-stretch:62.5%;color:var(--q-muted);font-variant-numeric:tabular-nums}
#view .inv-nm{flex:1 1 auto;min-width:0;font-size:15px;line-height:20px;overflow-wrap:anywhere}
#view .inv-bd{flex:none;font-size:15px;line-height:20px;font-weight:600;white-space:nowrap}
#view .inv-r2{display:flex;align-items:center;gap:10px;margin:3px 0 0 30px}
#view .inv-r2 .bar{flex:1 1 auto;min-width:0;margin-top:0}
#view .inv-fg{flex:none;min-width:128px;display:inline-flex;align-items:center;justify-content:flex-end;gap:5px;font-size:12.5px;line-height:16px;color:var(--q-ink-2);white-space:nowrap}
#view .inv-st{flex:none;display:inline-block;width:10px;height:10px}
#view .inv-st.ring{border:1.5px solid var(--q-muted);border-radius:50%}
#view .inv-st.check{width:5px;height:9px;margin:0 2px 2px;border:solid var(--q-good);border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}
#view .inv-st.tri{width:0;height:0;border-left:5.5px solid transparent;border-right:5.5px solid transparent;border-bottom:10px solid var(--q-warn)}
#view .inv-sheet{background:var(--q-surface-2);margin:0 0 10px;padding:0;font-size:13px;color:var(--q-ink)}
#view .inv-sheet.open{border:1.5px solid var(--q-rule)}
#view .inv-sh{display:flex;align-items:baseline;gap:8px;padding:9px 10px 6px;border-bottom:1px solid var(--q-rule-light)}
#view .inv-sh b{font:800 19px/22px var(--ff);font-stretch:62.5%;letter-spacing:.02em;flex:1 1 auto}
#view .inv-sh .w{white-space:nowrap}
#view .inv-trio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--q-rule-light)}
#view .inv-trio span{background:var(--q-surface-2);padding:6px 10px 7px;display:block}
#view .inv-trio small,#view .inv-it small,#view .inv-adm{display:block;font-size:12px;line-height:16px;color:var(--q-muted)}
#view .inv-trio strong{display:block;font:800 19px/22px var(--ff);font-stretch:62.5%;white-space:nowrap}
#view .inv-items{list-style:none;margin:0;padding:0 10px}
#view .inv-it{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--q-rule-light)}
#view .inv-it:first-child{border-top:0}
#view .inv-it-m{flex:1 1 auto;min-width:0;font-size:14px;line-height:19px}
#view .inv-it-v{flex:none;font-weight:600;white-space:nowrap;font-size:14px}
#view .inv-tl{display:flex;align-items:stretch;gap:0;margin:2px 0 10px;border:1.5px solid var(--q-rule)}
#view .inv-tl>div{flex:1 1 0;min-width:0;padding:6px 6px 7px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center}
#view .inv-tl>div+div{border-left:1px solid var(--q-rule-light)}
#view .inv-tl .inv-farm{flex:1.35 1 0;background:var(--q-surface-2);border-right:1.5px solid var(--q-rule);align-items:flex-start;text-align:left;justify-content:space-between}
#view .inv-tl b{font:800 13px/1 var(--ff);font-stretch:62.5%;white-space:nowrap;margin-bottom:4px}
#view .inv-tl i{display:block;width:12px;background:var(--q-viz-fill);min-height:2px}
#view .inv-tl span{font-size:12px;line-height:15px;color:var(--q-muted);margin-top:5px}
#view .inv-tl small{font-size:11px;line-height:13px;color:var(--q-muted)}
#view .inv-deal{width:100%;border-collapse:collapse;margin:0 0 8px;font-size:13.5px}
#view .inv-deal td{padding:6px 0;border-top:1px solid var(--q-rule-light);vertical-align:top}
#view .inv-deal tr:first-child td{border-top:0}
#view .inv-deal td+td{text-align:right;white-space:nowrap;padding-left:8px}
#view .inv-deal small{display:block;font-size:12px;color:var(--q-muted)}
#view .inv-tb{display:grid;grid-template-columns:minmax(0,1fr) auto;border-top:3px solid var(--q-rule)}
#view .inv-tb>div{padding:8px 12px 9px;font-size:12px;line-height:16px;color:var(--q-ink-2)}
#view .inv-tb>div+div{border-left:1.5px solid var(--q-rule)}
#view .inv-tb b{display:block;font:700 11px/14px var(--ff);font-stretch:75%;letter-spacing:.09em;color:var(--q-muted)}
</style>`;

// the evidence in a line: kinds and dates (the investor's whole view of it)
const evLine = (t, ev) => (ev || []).length ? t("funds.source") + " " + ev.map((e) => KIND(t, e.k) + " " + dt(e.d)).join(" · ") : "";
const lineName = (t, l) => t("funds.line." + l.nn);
const shape = (st) => (st === "none" ? "ring" : st === "done" ? "check" : st === "over" ? "tri" : "");

// one ranked row: number · name · budget, then the scale bar of the spent share with its figure (or the status word)
function ranked(t, l) {
  const st = shape(l.status), w = Math.max(0, Math.min(100, l.pct || 0));
  const fig = l.status === "none" ? `<span class="inv-st ring"></span>${esc(t("funds.st.none"))}`
    : `${st ? `<span class="inv-st ${st}"></span>` : ""}${gel(l.spent)} · ${pctTxt(l.pct)}${st ? " · " + esc(t("funds.st." + l.status)) : ""}`;
  const label = `${l.nn} ${lineName(t, l)}: ${gel(l.spent)} / ${gel(l.budget)}, ${pctTxt(l.pct)}`;
  return `<div class="row tap inv-rk" role="button" tabindex="0" data-det="p${l.nn}" aria-label="${esc(label)}"><div class="row-m">`
    + `<div class="inv-r1"><span class="inv-nn">${l.nn}</span><span class="inv-nm">${esc(lineName(t, l))}</span><span class="inv-bd">${gel(l.budget)}</span></div>`
    + `<div class="inv-r2"><div class="bar">${l.spent > 0 ? `<i${l.status === "over" ? ' class="over"' : ""} style="width:${w.toFixed(2)}%"></i>` : ""}</div><span class="inv-fg">${fig}</span></div>`
    + `</div><span class="chev">›</span></div>`;
}

// a purchase in a line's sheet: date, purpose sentence, amount, evidence kinds and dates; the suppliers for admin / masters
function item(t, i) {
  const who = i.who && i.who.length ? `<span class="inv-adm">${esc(i.who.join(", "))}</span>` : "";
  return `<li class="inv-it"><span class="inv-it-m">${esc(said(i))}<small>${dt(i.date)}${i.ev && i.ev.length ? " · " + evLine(t, i.ev) : ""}</small>${who}</span><span class="inv-it-v">${gel(i.gel)}</span></li>`;
}

function sheet(t, l) {
  const st = shape(l.status);
  return `<div class="det inv-sheet" id="detp${l.nn}"><p class="inv-sh" style="margin:0"><b>${l.nn} · ${esc(mt(lineName(t, l)))}</b><span class="w ${l.status === "done" ? "ok" : l.status === "over" ? "warn" : "info"}">${st ? t("funds.st." + l.status) : pctTxt(l.pct)}</span></p>`
    + `<p class="inv-trio" style="margin:0"><span><small>${t("funds.budget")}</small><strong>${gel(l.budget)}</strong></span><span><small>${t("funds.spent")}</small><strong>${gel(l.spent)}</strong></span><span><small>${t("funds.left")}</small><strong>${gel(l.left)}</strong></span></p>`
    + (l.items.length ? `<ul class="inv-items">${l.items.map((i) => item(t, i)).join("")}</ul>` : `<p style="margin:0;padding:10px;color:var(--q-muted)">${t("funds.line_empty")}</p>`) + `</div>`;
}

export default function view(d, me, t) {
  const L = d.lines || [];
  if (!L.length) return STYLE + card(t("funds.title"), "", `<div class="empty">${t("funds.empty")}</div>`);
  const f = ((d.money_in || {}).founder || [])[0];
  let s = STYLE;

  // hero: what of the plan is spent, the plan and the share in one line
  s += `<div class="card hero"><div class="hero-l">${t("funds.hero_l")}</div><div class="hero-v">${gel(d.spent)}</div>`
    + `<div class="hero-s">${t("funds.hero_s", { b: gel(d.budget), p: pctTxt(d.pct) })}</div></div>`;
  // the founders' contribution: one full-width stat (a lone stat spans the grid)
  s += `<div class="grid2">${f ? stat(t("funds.founder"), usd(f.amount), t("funds.founder_s", { d: dt(f.date), g: gel(f.gel) })) : stat(t("funds.founder"), "—", "")}</div>`;

  // the plan as ranked bars, largest budget first; a line's sheet under its row
  const R = L.filter((l) => l.budget > 0).sort((a, b) => b.budget - a.budget || String(a.nn).localeCompare(String(b.nn)));
  s += card(t("funds.plan_t"), t("funds.plan_n", { n: L.length }), R.map((l) => ranked(t, l) + sheet(t, l)).join(""));

  // where it went: every purchase by amount, one scale of shares
  const all = L.flatMap((l) => l.items.map((i) => ({ ...i, nn: l.nn }))).sort((a, b) => b.gel - a.gel);
  s += card(t("funds.where_t"), t("funds.where_n", { n: all.length }), all.map((i) => {
    const w = d.spent ? 100 * i.gel / d.spent : 0, bw = all.length ? 100 * i.gel / all[0].gel : 0;
    return `<div class="row"><div class="row-m"><div class="row-t">${esc(said(i))}</div><div class="row-c">${i.nn} · ${esc(t("funds.line." + i.nn))} · ${dt(i.date)}</div><div class="bar"><i style="width:${Math.max(1, Math.min(100, bw)).toFixed(1)}%"></i></div></div><div class="row-v">${gel(i.gel)}<small>${num(w, w < 10 ? 1 : 0)} %</small></div></div>`;
  }).join(""));

  // the months: the farm purchase in its own cell, then the spending strip (one scale, direct labels)
  const M = d.months || [], mx = Math.max(1, ...M.map((m) => m.gel));
  s += card(t("funds.months_t"), "", `<div class="inv-tl">${d.farm ? `<div class="inv-farm"><small>${t("funds.farm_l")}</small><b style="font-size:15px">${gel(d.farm.gel)}</b><small>${dt(d.farm.date)} · ${t("funds.farm_s")}</small></div>` : ""}`
    + M.map((m) => `<div><b>${shortGel(m.gel, t)}</b><i style="height:${Math.max(2, Math.round(m.gel / mx * 64))}px"></i><span>${esc(t("mon_short")[Number(m.month.slice(5, 7)) - 1])}</span><small>${t("funds.cum", { v: shortGel(m.cum, t) })}</small></div>`).join("") + `</div>`);

  // the deal frame as pitched in May 2026: the stake, the three tranches, the founders' contribution - no receipts
  const D = d.deal || {};
  s += card(t("funds.deal_t"), t("funds.deal_n"), `<table class="inv-deal">`
    + `<tr><td>${t("funds.stake", { p: num(D.stake_pct, 2) })}<small>${t("funds.stake_s")}</small></td><td>${usd(D.stake_usd)}</td></tr>`
    + (D.tranches || []).map((x) => `<tr><td>${t("funds.tranche", { n: x.no, y: x.year })}<small>${t("funds.tranche_s")}</small></td><td>${usd(x.usd)}</td></tr>`).join("")
    + (f ? `<tr><td>${t("funds.founder")}</td><td>${usd(f.amount)}<small>${dt(f.date)}</small></td></tr>` : "")
    + `</table>`);

  // the title block: sources with their dates
  const S = d.sources || {};
  s += `<div class="inv-tb"><div><b>${mt(t("funds.tb_src"))}</b>${[S.books ? t("funds.src_books", { d: dt(S.books) }) : "", S.rsge ? t("funds.src_rsge", { d: dt(S.rsge) }) : "", S.bank ? t("funds.src_bank", { d: dt(S.bank) }) : ""].filter(Boolean).join(" · ")}</div><div><b>${mt(t("funds.tb_date"))}</b>${dt(d.today)}</div></div>`;
  return s;
}

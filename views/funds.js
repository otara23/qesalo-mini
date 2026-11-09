// ინვესტიცია (the nursery) - wave W-INV `invest`, plans/bot-v3.md §3.1, 9.11.2026. Data: mini/functions/mini/invest.ts.
// Design C „ნახაზი", Operate mode; one structural move: the 15 investment lines drawn as PARCELS ON A SURVEY PLAN
// (a squarified plan, parcel area ∝ budget), the used share as 45° hatch whose density is the one sequential encoding
// (paper = nothing yet; five steps to solid ink at ≥ 95 %), the exact share as a figure, status as a corner shape plus a
// word (ring „ჯერ არა", check „ათვისებული", triangle „ბიუჯეტზე მეტი"). Tap a parcel → its sheet: budget, spent, left,
// every purchase with its date, amount and purpose; evidence as kinds and dates. Then: where the money went (every
// purpose, ranked, scale bars), the months (the farm purchase in its own cell before the strip, never inside it), the
// money in (the investor's tranches; the founder's contribution as its own row) and the deal frame as pitched, the
// title block. The admin and masters (data.review present) also get the review queue, who supplied what, the
// confidence and the alternatives. The investor's data carries no names, no confidence, no queue (invest.ts).
// A line still under review shows its best proposed purpose with a ring + „წინასწარი" (never „unassigned").
// Below 360 px the plan becomes one column of parcels. A table of the 15 lines sits in a fold (the plan's table view).
// Styles are this view's own (.inv-*), on the page's tokens, light and dark.
import { esc, gel, num, dt, card, row, stat, mt } from "../ui.js?v=5309b78.202611091541";

const KIND = (t, k) => t("funds.kind." + k);
const shortGel = (v, t) => (v >= 1e6 ? t("funds.mln", { v: num(v / 1e6, v % 1e6 ? 2 : 0).replace(/\.?0+$/, "") }) : v >= 1e3 ? t("funds.thousand", { v: num(v / 1e3) }) : gel(v));
const pctTxt = (p) => (!p ? "0" : p > 0 && p < 0.1 ? "<0.1" : num(p, p < 10 ? 1 : 0)) + " %";
const usd = (v) => num(v) + " $";

// squarified plan (Bruls, Huizing, van Wijk 2000) in a W × H box of units; areas ∝ budgets, largest first
const W = 100, H = 118;
function squarify(vals) {
  const total = vals.reduce((s, v) => s + v.v, 0), scale = (W * H) / total, out = [];
  let rest = vals.map((x) => ({ ...x, a: x.v * scale })), x = 0, y = 0, w = W, h = H;
  const worst = (row, side) => { const s = row.reduce((t, r) => t + r.a, 0), mx = Math.max(...row.map((r) => r.a)), mn = Math.min(...row.map((r) => r.a)); return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn)); };
  while (rest.length) {
    const side = Math.min(w, h); let row = [rest[0]], i = 1;
    while (i < rest.length && worst([...row, rest[i]], side) <= worst(row, side)) row.push(rest[i++]);
    const s = row.reduce((t, r) => t + r.a, 0);
    if (w >= h) { const cw = s / h; let yy = y; for (const r of row) { const rh = r.a / cw; out.push({ ...r, x, y: yy, w: cw, h: rh }); yy += rh; } x += cw; w -= cw; }
    else { const rh = s / w; let xx = x; for (const r of row) { const rw = r.a / rh; out.push({ ...r, x: xx, y, w: rw, h: rh }); xx += rw; } y += rh; h -= rh; }
    rest = rest.slice(i);
  }
  return out;
}

const STYLE = `<style>
#view .inv-plan{position:relative;aspect-ratio:${W}/${H};margin:2px 0 10px;border:1.5px solid var(--q-rule);background:var(--q-surface)}
#view .inv-p{position:absolute;box-sizing:border-box;border:1px solid var(--q-rule);overflow:hidden;cursor:pointer;padding:4px;display:flex;flex-direction:column;align-items:flex-start;gap:2px;transition:background-color 90ms var(--step)}
#view .inv-p:active,#view .inv-p.open-r{outline:2px solid var(--q-accent);outline-offset:-3px}
/* the hatch steps: ink coverage 0.2 / 0.4 / 0.6 / 0.8 / 1 (line ÷ period) - dataviz validate_palette.js --ordinal on the averaged
   tones (9.11): monotone, adjacent ΔL ≥ 0.06 in both themes; the light-end 2:1 floor fails on paper (1.23:1) - it is a fill
   rule, and here every line is ink at 17:1 on paper inside an ink-outlined parcel (plans/_work/bot-v3-invest.md) */
#view .inv-d1{background:repeating-linear-gradient(45deg,var(--q-viz-fill) 0 1.4px,transparent 1.4px 7px)}
#view .inv-d2{background:repeating-linear-gradient(45deg,var(--q-viz-fill) 0 1.6px,transparent 1.6px 4px)}
#view .inv-d3{background:repeating-linear-gradient(45deg,var(--q-viz-fill) 0 1.8px,transparent 1.8px 3px)}
#view .inv-d4{background:repeating-linear-gradient(45deg,var(--q-viz-fill) 0 2.4px,transparent 2.4px 3px)}
#view .inv-d5{background:var(--q-viz-fill)}
#view .inv-plate{background:var(--q-surface);padding:1px 4px 2px;max-width:100%;color:var(--q-ink)}
#view .inv-no{font:800 17px/1 var(--ff);font-stretch:62.5%}
#view .inv-lb{font:700 10.5px/12.5px var(--ff);font-stretch:75%;letter-spacing:.04em;overflow-wrap:anywhere}
#view .inv-bg{font:800 15px/1.05 var(--ff);font-stretch:62.5%;white-space:nowrap}
#view .inv-p.mid .inv-bg{font-size:13px}
#view .inv-p.xs{padding:3px 1px}#view .inv-p.xs .inv-plate{padding:1px 1px 2px}#view .inv-p.xs .inv-no{font-size:14px}
#view .inv-pc{font:600 11.5px/14px var(--ff);font-stretch:75%;color:var(--q-ink-2);white-space:nowrap}
#view .inv-st{position:absolute;bottom:4px;right:4px;width:11px;height:11px}
#view .inv-st.inv-top{top:5px;bottom:auto}
#view .inv-st.ring{border:1.5px solid var(--q-muted);border-radius:50%}
#view .inv-st.check{width:5px;height:10px;right:7px;bottom:6px;border:solid var(--q-good);border-width:0 2.5px 2.5px 0;transform:rotate(45deg);background:none}
#view .inv-st.tri{width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:11px solid var(--q-warn)}
#view .inv-key{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;padding:0 0 10px;font-size:12px;line-height:16px;color:var(--q-ink-2)}
#view .inv-key i{display:inline-block;width:30px;height:14px;border:1px solid var(--q-rule);vertical-align:-2px;margin-right:4px}
#view .inv-key .inv-st{position:static;display:inline-block;vertical-align:-1px;margin-right:4px}
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
#view .inv-pend{display:inline-flex;align-items:center;gap:5px;margin-top:3px;font:600 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.04em;color:var(--q-ink-2)}
#view .inv-pend::before{content:"";width:8px;height:8px;border:1.5px solid var(--q-muted);border-radius:50%}
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
#view .inv-tab{width:100%;border-collapse:collapse;font-size:13px}
#view .inv-tab th,#view .inv-tab td{padding:5px 4px;border-top:1px solid var(--q-rule-light);text-align:right;white-space:nowrap}
#view .inv-tab th:nth-child(2),#view .inv-tab td:nth-child(2){text-align:left;white-space:normal}
#view .inv-tab th{font:700 11px/14px var(--ff);font-stretch:75%;letter-spacing:.06em;color:var(--q-muted);border-top:0}
#view .inv-col{display:none}
@media (max-width:359px){#view .inv-plan{display:none}#view .inv-col{display:block}#view .inv-col .inv-p{position:relative;left:auto!important;top:auto!important;width:100%!important;height:auto!important;min-height:44px;margin-top:-1px;flex-direction:row;align-items:center;gap:8px}}
</style>`;

// the evidence in a line: kinds and dates (the investor's whole view of it)
const evLine = (t, ev) => (ev || []).length ? t("funds.source") + " " + ev.map((e) => KIND(t, e.k) + " " + dt(e.d)).join(" · ") : "";
const lineName = (t, l) => t("funds.line." + l.nn);
const shape = (st) => (st === "none" ? "ring" : st === "done" ? "check" : st === "over" ? "tri" : "");

function parcel(t, l, r, col) {
  const px = 3.33, minSide = Math.min(r.w, r.h) * px, wide = r.w * px, st = shape(l.status);
  const big = minSide >= 84 && wide >= 90, mid = !big && minSide >= 46 && wide >= 58;
  const plate = `<span class="inv-plate"><span class="inv-no">${l.nn}</span>${big || col ? ` <span class="inv-lb">${esc(mt(t("funds.pl." + l.nn)))}</span>` : ""}</span>`
    + (big || mid || col ? `<span class="inv-plate"><span class="inv-bg">${shortGel(l.budget, t)}</span></span>` : "")
    + (l.spent > 0 && (big || mid || col) ? `<span class="inv-plate"><span class="inv-pc">${pctTxt(l.pct)}</span></span>` : "");
  const pos = col ? "" : ` style="left:${(r.x / W * 100).toFixed(3)}%;top:${(r.y / H * 100).toFixed(3)}%;width:${(r.w / W * 100).toFixed(3)}%;height:${(r.h / H * 100).toFixed(3)}%"`;
  const label = `${l.nn} ${lineName(t, l)}: ${t("funds.aria", { s: gel(l.spent), b: gel(l.budget), p: pctTxt(l.pct) })}`;
  return `<div class="inv-p inv-d${l.density}${mid ? " mid" : ""}${!col && wide < 30 ? " xs" : ""}" role="button" tabindex="0" data-det="p${l.nn}" aria-label="${esc(label)}"${pos}>${plate}${st ? `<span class="inv-st ${st}${wide >= 50 && !col ? " inv-top" : ""}"></span>` : ""}</div>`;
}

function item(t, i, detail) {
  const adm = detail ? [i.who && i.who.length ? esc(i.who.join(", ")) : "", i.status === "confirmed" || i.status === "changed"
      ? t(i.status === "changed" ? "funds.changed_by" : "funds.confirmed_by", { who: esc(i.decided_by || ""), d: dt(i.decided_at) }) + (i.status === "changed" && i.proposed_line ? " " + t("funds.was", { l: i.proposed_line.slice(6) }) : "")
      : t("funds.conf_" + i.conf_word, { c: num(i.conf, 1) }) + (i.alts && i.alts.length ? " · " + t("funds.or") + " " + i.alts.map((a) => esc(a.line.slice(6) + " " + t("funds.line." + a.line.slice(6)))).join(", ") : "")].filter(Boolean).join(" · ") : "";
  return `<li class="inv-it"><span class="inv-it-m">${esc(i.ka)}<small>${dt(i.date)}${i.ev && i.ev.length ? " · " + evLine(t, i.ev) : ""}</small>${adm ? `<span class="inv-adm">${adm}</span>` : ""}${i.pending ? `<span class="inv-pend">${esc(mt(t("funds.pending")))}</span>` : ""}</span><span class="inv-it-v">${gel(i.gel)}</span></li>`;
}

function sheet(t, l, detail) {
  const st = shape(l.status);
  return `<div class="det inv-sheet" id="detp${l.nn}"><p class="inv-sh" style="margin:0"><b>${l.nn} · ${esc(mt(lineName(t, l)))}</b><span class="w ${l.status === "done" ? "ok" : l.status === "over" ? "warn" : "info"}">${st ? t("funds.st." + l.status) : pctTxt(l.pct)}</span></p>`
    + `<p class="inv-trio" style="margin:0"><span><small>${t("funds.budget")}</small><strong>${gel(l.budget)}</strong></span><span><small>${t("funds.spent")}</small><strong>${gel(l.spent)}</strong></span><span><small>${t("funds.left")}</small><strong>${gel(l.left)}</strong></span></p>`
    + (l.items.length ? `<ul class="inv-items">${l.items.map((i) => item(t, i, detail)).join("")}</ul>` : `<p style="margin:0;padding:10px;color:var(--q-muted)">${t("funds.line_empty")}</p>`) + `</div>`;
}

export default function view(d, me, t) {
  const L = d.lines || [], detail = !!d.review;
  if (!L.length) return STYLE + card(t("funds.title"), "", `<div class="empty">${t("funds.empty")}</div>`);
  const rects = squarify(L.filter((l) => l.budget > 0).map((l) => ({ v: l.budget, l })).sort((a, b) => b.v - a.v));
  const mi = d.money_in || {}, f = (mi.founder || [])[0];
  let s = STYLE;

  // hero: what of the plan is spent; the money in beside it (the investor's, then the founder's - never mixed)
  s += `<div class="card hero"><div class="hero-l">${t("funds.hero_l")}</div><div class="hero-v">${gel(d.spent)}</div>`
    + `<div class="hero-s">${t("funds.hero_s", { b: gel(d.budget), p: pctTxt(d.pct), n: d.n })}</div></div>`;
  s += `<div class="grid2">${stat(t("funds.from_investor"), gel(mi.investor_gel || 0), mi.investor_gel ? t("funds.tranches_in") : t("funds.no_tranche"))}`
    + (f ? stat(t("funds.founder"), usd(f.amount), t("funds.founder_s", { d: dt(f.date), g: gel(f.gel) })) : stat(t("funds.founder"), "—", "")) + `</div>`;

  // the plan sheet (the structural move)
  const plan = rects.map((r) => parcel(t, r.l, r, false)).join(""), col = rects.map((r) => parcel(t, r.l, r, true)).join("");
  s += card(t("funds.plan_t"), t("funds.plan_n", { n: L.length }),
    `<div class="note" style="padding-top:0">${t("funds.plan_note")}</div><div class="inv-plan">${plan}</div><div class="inv-col">${col}</div>`
    + `<div class="inv-key"><span><i style="background:var(--q-surface)"></i>0</span><span><i class="inv-d1"></i>&lt;5 %</span><span><i class="inv-d2"></i>5–25 %</span><span><i class="inv-d3"></i>25–50 %</span><span><i class="inv-d4"></i>50–95 %</span><span><i class="inv-d5"></i>≥95 %</span></div>`
    + `<div class="inv-key"><span><span class="inv-st ring"></span>${t("funds.st.none")}</span><span><span class="inv-st check"></span>${t("funds.st.done")}</span><span><span class="inv-st tri"></span>${t("funds.st.over")}</span></div>`
    + L.filter((l) => l.budget > 0).map((l) => sheet(t, l, detail)).join("")
    + `<div class="row tap" data-det="tab"><div class="row-m"><div class="row-t">${t("funds.as_table")}</div></div><span class="chev">›</span></div>`
    + `<div class="det inv-sheet" id="dettab"><table class="inv-tab"><tr><th>#</th><th>${t("funds.col_line")}</th><th>${t("funds.spent")}</th><th>${t("funds.budget")}</th><th>%</th></tr>${L.map((l) => `<tr><td>${l.nn}</td><td>${esc(l.ka)}</td><td>${num(l.spent)}</td><td>${num(l.budget)}</td><td>${pctTxt(l.pct)}</td></tr>`).join("")}</table></div>`);

  // where it went: every purchase by amount, one scale of shares
  const all = L.flatMap((l) => l.items.map((i) => ({ ...i, nn: l.nn }))).sort((a, b) => b.gel - a.gel);
  s += card(t("funds.where_t"), t("funds.where_n", { n: all.length }), all.map((i) => {
    const w = d.spent ? 100 * i.gel / d.spent : 0, bw = all.length ? 100 * i.gel / all[0].gel : 0;
    return `<div class="row"><div class="row-m"><div class="row-t">${esc(i.ka)}</div><div class="row-c">${i.nn} · ${esc(t("funds.line." + i.nn))} · ${dt(i.date)}</div>${i.pending ? `<span class="inv-pend">${esc(mt(t("funds.pending")))}</span>` : ""}<div class="bar"><i style="width:${Math.max(1, Math.min(100, bw)).toFixed(1)}%"></i></div></div><div class="row-v">${gel(i.gel)}<small>${num(w, w < 10 ? 1 : 0)} %</small></div></div>`;
  }).join(""));

  // the months: the farm purchase in its own cell, then the spending strip (one scale, direct labels)
  const M = d.months || [], mx = Math.max(1, ...M.map((m) => m.gel));
  s += card(t("funds.months_t"), "", `<div class="inv-tl">${d.farm ? `<div class="inv-farm"><small>${t("funds.farm_l")}</small><b style="font-size:15px">${gel(d.farm.gel)}</b><small>${dt(d.farm.date)} · ${t("funds.farm_s")}</small></div>` : ""}`
    + M.map((m) => `<div><b>${shortGel(m.gel, t)}</b><i style="height:${Math.max(2, Math.round(m.gel / mx * 64))}px"></i><span>${esc(t("mon_short")[Number(m.month.slice(5, 7)) - 1])}</span><small>${t("funds.cum", { v: shortGel(m.cum, t) })}</small></div>`).join("") + `</div>`
    + `<div class="note">${t("funds.months_note")}</div>`);

  // money in: the deal as pitched (title-block table), received per row; the founder's contribution apart
  const D = d.deal || {};
  s += card(t("funds.deal_t"), t("funds.deal_n"), `<table class="inv-deal">`
    + `<tr><td>${t("funds.stake", { p: num(D.stake_pct, 2) })}<small>${t("funds.stake_s")}</small></td><td>${usd(D.stake_usd)}<small>${t("funds.received", { v: gel(mi.equity_gel || 0) })}</small></td></tr>`
    + (D.tranches || []).map((x) => `<tr><td>${t("funds.tranche", { n: x.no, y: x.year })}<small>${t("funds.tranche_s")}</small></td><td>${usd(x.usd)}<small>${gel(x.gel)} · ${t("funds.received", { v: gel(x.received_gel) })}</small></td></tr>`).join("")
    + (f ? `<tr><td>${t("funds.founder")}<small>${t("funds.founder_not")}</small></td><td>${usd(f.amount)}<small>${dt(f.date)}</small></td></tr>` : "")
    + `</table><div class="note">${t("funds.deal_note")}</div>`);

  // the admin and masters: the review queue, decided lines
  if (detail) {
    const R = d.review || [];
    s += card(t("funds.review_t"), R.length ? t("funds.review_n", { n: R.length, v: gel(d.review_gel) }) : "", R.length
      ? `<ul class="inv-items" style="padding:0">${R.map((i) => item(t, i, true)).join("")}</ul><div class="note">${t("funds.review_note")}${d.oldest_review_days != null ? " " + t("funds.review_old", { n: d.oldest_review_days }) : ""}</div>`
      : `<div class="empty"><span class="dot ok"></span> ${t("funds.review_none")}</div>`);
    if ((d.decided || []).length) s += card(t("funds.decided_t"), String(d.decided.length), `<ul class="inv-items" style="padding:0">${d.decided.map((i) => item(t, i, true)).join("")}</ul>`);
    s += `<div class="note">${t("funds.sure", { p: d.sure_pct, v: gel(d.sure_gel) })}</div>`;
  }

  // the title block: sources with their dates
  const S = d.sources || {};
  s += `<div class="inv-tb"><div><b>${mt(t("funds.tb_src"))}</b>${[S.books ? t("funds.src_books", { d: dt(S.books) }) : "", S.rsge ? t("funds.src_rsge", { d: dt(S.rsge) }) : "", S.bank ? t("funds.src_bank", { d: dt(S.bank) }) : ""].filter(Boolean).join(" · ")}</div><div><b>${mt(t("funds.tb_date"))}</b>${dt(d.today)}</div></div>`;
  return s;
}

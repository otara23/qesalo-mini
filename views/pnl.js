// მოგება (wave W-PNL, plans/bot-v3.md §3.3, 9.11.2026): one company's revenue and expense for a period, from the books
// (ORIS; schema/030 v_pnl_lines) or, as the second reading, from the rs.ge invoices - a toggle, never a sum. The data:
// mini/functions/mini/pnl.ts (the rows a person may not see are dropped there before anything is summed; the investor
// gets the categories only, never accounts or lines).
//
// Design C „ნახაზი": one framed sheet of cells; the filter row first (it scopes everything under it); the result as the
// one big figure; revenue = solid ink, expense = ink hatch at 45° (texture + legend + labels carry identity, never colour);
// one axis per chart (the running result is its own small chart, never a second scale); 2 px paper gaps between marks;
// zero radius except the plan's numbered circles; a table twin under every chart; nothing eases (90 ms two-frame steps).
// While the result includes work in progress that is still waiting in 1 6 30, it is called „შედეგი", never „მოგება".
//
// The page's shell (mini/app.js) calls view() once per company section. The period, the reading, the open category and
// the selected column live here; a change re-asks the function itself (the same endpoint and body as app.js, plus
// `pnl: { p, r, only, d }`) and redraws #view, keeping the old sheet at reduced opacity while it loads - until app.js
// offers the view hooks of bot-v3-pnl.md PR-2. The period is kept in the address (?tab=pnl&p=…&r=…).
import { t, esc, num, gel, dt, tm, mt, caps, SYM, cut } from "../ui.js?v=dc00dfd.202611091715";

const API = "https://owgvoonnsccujzpbprpw.supabase.co/functions/v1/mini";   // = mini/app.js API (PR-2: a hook instead)
const S = { me: null, secs: [], pass: false, p: null, r: null, open: {}, acct: {}, lines: {}, sel: {}, tbl: {}, custom: false, busy: false, err: null, url: false };
const OPEX = ["cost", "selling", "admin", "writeoff", "opex_other"];
const NONOP = ["farm_sale", "nonop_income", "nonop_expense", "fx", "nonop_other"];
const C9 = ["tax_fines", "extraordinary"];

const L = (k, p) => t("pnl." + k, p);
const MINUS = "−";
const sg = (v, d = 0) => (Number(v) < 0 ? MINUS : "") + gel(Math.abs(Number(v) || 0), d);
const sgp = (v) => (Number(v) > 0 ? "+" : "") + sg(v);
// compact axis and label figures: 1.5 მლნ, 820 ათ., 640
function cpt(v) {
  const a = Math.abs(v), s = v < 0 ? MINUS : "";
  if (a >= 1e6) return s + (a >= 1e7 ? Math.round(a / 1e6) : Math.round(a / 1e5) / 10) + " " + L("u_m");
  if (a >= 1e3) return s + Math.round(a / 1e3) + " " + L("u_k");
  return s + Math.round(a);
}
// a bank account in ORIS is named by its IBAN first: on screen the last four digits are enough (the data keeps what the
// function sent; for non-admins it is already masked there)
const acctName = (n) => String(n || "").replace(/\bGE\d{2}[A-Z]{2}\d{12}(\d{4})\b\s*-?\s*/g, "…$1 · ").replace(/\bGE…(\d{4})\s*-?\s*/g, "…$1 · ");
const mon = (m) => t("mon_short")[Number(String(m).slice(5, 7)) - 1] || "";
const ROMAN = ["I", "II", "III", "IV"];

// ---------------- the period's words ----------------
function periodLabel(P) {
  const y = P.a.slice(0, 4);
  if (P.preset === "month") return t("month")[Number(P.a.slice(5, 7)) - 1] + " " + y + (P.to.slice(8) !== lastDay(P.b) ? " · " + L("to_day", { d: Number(P.to.slice(8)) }) : "");
  if (P.preset === "quarter") return L("quarter", { q: ROMAN[Math.floor((Number(P.a.slice(5, 7)) - 1) / 3)], y });
  if (P.preset === "year") return y + (P.a.slice(5) !== "01" || P.b.slice(5) !== "12" ? " · " + mon(P.a) + "–" + mon(P.b) : "");
  return mon(P.a) + " " + P.a.slice(0, 4) + " – " + mon(P.b) + " " + P.b.slice(0, 4);
}
const lastDay = (m) => String(new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate());
function bucketLabel(b, grain, long, multiYear) {
  if (grain === "day") return long ? dt(b) : String(Number(b.slice(8)));
  if (grain === "month") return long ? t("month")[Number(b.slice(5, 7)) - 1] + " " + b.slice(0, 4) : mon(b) + (multiYear && b.slice(5, 7) === "01" ? " " + b.slice(2, 4) : "");
  if (grain === "quarter") return ROMAN[Math.floor((Number(b.slice(5, 7)) - 1) / 3)] + (long ? " " + L("p_quarter") + " " + b.slice(0, 4) : " " + b.slice(2, 4));
  return b.slice(0, 4);
}

// ---------------- the chart: paired columns on one axis ----------------
function niceStep(x) { const e = Math.pow(10, Math.floor(Math.log10(x || 1))), f = x / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; }
function scale(vals) {
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  if (hi === lo) hi = lo + 1;
  const step = niceStep((hi - lo) / 3);
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const ticks = []; for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks, y: (v) => ((v - lo) / (hi - lo)) * 100 };
}
const barStyle = (sc, v) => { const z = sc.y(0), y = sc.y(v); return `bottom:${Math.min(z, y).toFixed(2)}%;height:${Math.abs(y - z).toFixed(2)}%`; };
function columns(co, rows, grain, keyA, keyB, words, sel) {
  const sc = scale(rows.flatMap((r) => [r[keyA], r[keyB]]));
  const multiYear = rows.length > 1 && rows[0].b.slice(0, 4) !== rows[rows.length - 1].b.slice(0, 4);
  const every = rows.length > 12 ? Math.ceil(rows.length / 8) : 1;
  const grid = sc.ticks.map((v) => `<div class="pl-g${v === 0 ? " z" : ""}" style="bottom:${sc.y(v).toFixed(2)}%"><span>${cpt(v)}</span></div>`).join("");
  const cols = rows.map((r, i) => `<button class="pl-col${i === sel ? " on" : ""}" data-pl-sel="${co}|${i}" aria-pressed="${i === sel}" aria-label="${esc(L(words.aria, { p: bucketLabel(r.b, grain, true), r: sg(r[keyA]), e: sg(r[keyB]) }))}">`
    + `<span class="pl-pair"><span><i class="pl-a" style="${barStyle(sc, r[keyA])}"></i></span><span><i class="pl-h" style="${barStyle(sc, r[keyB])}"></i></span></span></button>`).join("");
  // the selected column's larger value, written above the plot (never over a neighbour's bar), clamped at the edges
  const edge = (sel + 0.5) / rows.length > 0.82 ? " r" : (sel + 0.5) / rows.length < 0.18 ? " l" : "";
  const lab = rows[sel] ? `<div class="pl-lab${edge}" style="left:${((sel + 0.5) / rows.length * 100).toFixed(2)}%">${cpt(Math.max(rows[sel][keyA], rows[sel][keyB]))}</div>` : "";
  const xs = rows.map((r, i) => `<span${i === sel ? ' class="on"' : ""}>${i % every === 0 || i === sel ? esc(bucketLabel(r.b, grain, false, multiYear)) : ""}</span>`).join("");
  return `<div class="pl-plot">${grid}<div class="pl-cols">${cols}</div>${lab}</div><div class="pl-x">${xs}</div>`;
}
// the running result: one series on its own axis (a line, the end figure labelled)
function running(rows, key) {
  if (!rows.length) return "";
  const vals = rows.map((r) => r[key]), sc = scale(vals), n = rows.length;
  const pts = vals.map((v, i) => `${((i + 0.5) / n * 100).toFixed(2)},${(100 - sc.y(v)).toFixed(2)}`);
  const last = vals[n - 1], lx = ((n - 0.5) / n * 100).toFixed(2), ly = sc.y(last).toFixed(2);
  return `<div class="pl-plot pl-run"><div class="pl-g z" style="bottom:${sc.y(0).toFixed(2)}%"><span>0</span></div>`
    + `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.join(" ")}" vector-effect="non-scaling-stroke"/></svg>`
    + `<i class="pl-dot" style="left:${lx}%;bottom:${ly}%"></i><div class="pl-endl${Number(lx) > 70 ? " r" : ""}" style="left:${lx}%;bottom:${ly}%">${sg(last)}</div></div>`;
}
function table(co, rows, grain, cols) {
  if (!S.tbl[co]) return `<button class="pl-more" data-pl-tbl="${co}">${esc(L("table"))}</button>`;
  return `<button class="pl-more" data-pl-tbl="${co}">${esc(L("table_hide"))}</button><table class="pl-t"><thead><tr><th>${esc(L("col_period"))}</th>${cols.map((c) => `<th>${esc(c[1])}</th>`).join("")}</tr></thead><tbody>`
    + rows.map((r) => `<tr><td>${esc(bucketLabel(r.b, grain, true))}</td>${cols.map((c) => `<td>${sg(r[c[0]])}</td>`).join("")}</tr>`).join("") + `</tbody></table>`;
}

// ---------------- the filter row (once per sheet) ----------------
function filter(d) {
  const P = d.period, pre = (k, w) => `<button data-pl-p="${k}" aria-pressed="${P.preset === k.replace(/^[mqy]$/, (x) => ({ m: "month", q: "quarter", y: "year" })[x])}">${mt(L(w))}</button>`;
  const custom = S.custom || P.preset === "range";
  let s = `<div class="pl-f"><div class="pl-seg">${pre("m", "p_month")}${pre("q", "p_quarter")}${pre("y", "p_year")}<button data-pl-custom="1" aria-pressed="${custom}">${mt(L("p_range"))}</button></div>`;
  if (custom) s += `<div class="pl-in"><label><span>${esc(L("from"))}</span><input type="month" id="pl-a" value="${P.a}" min="${P.min}" max="${P.max}"></label>`
    + `<label><span>${esc(L("to"))}</span><input type="month" id="pl-b" value="${P.b}" min="${P.min}" max="${P.max}"></label><button data-pl-go="1">${mt(L("show"))}</button></div>`;
  else s += `<div class="pl-step"><button data-pl-nav="${P.nav.prev || ""}" ${P.nav.prev ? "" : "disabled"} aria-label="${esc(L("prev"))}">‹</button>`
    + `<div class="l">${esc(mt(periodLabel(P)))}</div><button data-pl-nav="${P.nav.next || ""}" ${P.nav.next ? "" : "disabled"} aria-label="${esc(L("next"))}">›</button></div>`;
  s += `<div class="pl-seg pl-rd"><button data-pl-r="books" aria-pressed="${d.reading !== "rsge"}">${mt(L("r_books"))}</button><button data-pl-r="rsge" aria-pressed="${d.reading === "rsge"}">${mt(L("r_rsge"))}</button></div></div>`;
  return s;
}

// ---------------- the books reading ----------------
const catOf = (d, k) => (d.cats || []).find((c) => c.key === k);
const catAmt = (d, k) => Number((catOf(d, k) || {}).amount || 0);
function hero(d) {
  const T = d.totals, wip = Number(T.wip) || 0, op = T.operating, big = Math.abs(wip) >= 1;
  const word = big ? L("res_op") : op >= 0 ? L("profit") : L("loss");
  const sub = wip >= 1 ? L("res_wip", { v: gel(wip) }) : wip <= -1 ? L("res_wip_down", { v: gel(-wip) }) : L("res_sub", { p: periodLabel(d.period) });
  return `<div class="grid2"><div class="stat"><div class="stat-l">${esc(L("revenue"))}</div><div class="stat-v">${sg(T.revenue)}</div>${Number(T.revenue) ? "" : `<div class="stat-s">${esc(L("no_sales"))}</div>`}</div>`
    + `<div class="stat"><div class="stat-l">${esc(L("expense"))}</div><div class="stat-v">${sg(T.expense)}</div></div></div>`
    + `<div class="hero pl-res"><div class="hero-l">${esc(word)}</div><div class="hero-v">${sg(op)}</div><div class="hero-s">${esc(sub)}</div></div>`;
}
// o: sign (+1 revenue, -1 expense and work in progress shown as positive amounts), label, sub, pill
function catRows(co, d, keys, total, numbered, o = {}) {
  return keys.map((k, i) => {
    const c = catOf(d, k); if (!c) return "";
    const v = (o.sign ?? -1) * Number(c.amount), open = S.open[co] === k, tap = d.can && d.can.accounts;
    const val = o.noValue ? "" : o.pill ? `<span class="pill p-warn">${gel(Math.abs(v))}</span>` : sg(v);
    const head = `<span class="pl-k${numbered ? "" : " no"}">${numbered ? `<i class="f${i + 1}"></i><b>${i + 1}</b>` : ""}</span><span class="row-m"><span class="row-t">${esc(o.label || L("cat." + k))}</span>`
      + `<span class="row-c">${o.sub ? esc(o.sub) + " · " : ""}${total > 0 && v > 0 ? esc(L("of_total", { p: num(100 * v / total, 1) })) + " · " : ""}${esc(L("lines_n", { n: num(c.lines) }))}</span></span><span class="row-v">${val}</span>`;
    return tap ? `<button class="row pl-row tap${open ? " open-r" : ""}" data-pl-cat="${co}|${k}" aria-expanded="${open}">${head}<span class="chev">›</span></button>${open ? drill(co, d, c) : ""}`
      : `<div class="row pl-row">${head}</div>`;
  }).join("");
}
function drill(co, d, c) {
  const sign = c.key === "revenue" || NONOP.includes(c.key) || C9.includes(c.key) ? 1 : -1;   // expense shown as a positive cost
  const acc = c.accounts || [], cur = S.acct[co] || null;
  let s = `<div class="pl-dr">`;
  if (acc.length > 1) s += `<div class="pl-dh">${esc(mt(L("accounts")))}</div>` + acc.slice(0, 12).map((a) => `<button class="pl-ac${cur === a.account ? " on" : ""}" data-pl-acct="${co}|${c.key}|${esc(a.account)}" aria-pressed="${cur === a.account}">`
    + `<span class="c">${esc(a.account)}</span><span class="n">${esc(a.name || "")}</span><span class="v">${sg(sign * a.amount)}</span></button>`).join("");
  const key = `${co}|${c.key}|${cur || ""}|${d.period.key}`, L15 = S.lines[key];
  const curName = cur && (acc.find((a) => a.account === cur) || {}).name;
  s += `<div class="pl-dh">${esc(mt(cur ? L("lines_of", { a: cur + (curName ? " " + curName : "") }) : L("lines")))}</div>`;
  if (!L15) s += `<div class="pl-ln mut">${esc(L("loading"))}</div>`;
  else if (L15.err) s += `<div class="pl-ln mut">${esc(L("err"))} <button class="pl-more" data-pl-cat="${co}|${c.key}" data-pl-again="1">${esc(L("retry"))}</button></div>`;
  else if (!L15.length) s += `<div class="pl-ln mut">${esc(L("no_lines"))}</div>`;
  else s += L15.map((l) => `<div class="pl-ln"><span class="d">${esc(dt(l.day))}</span><span class="w">${esc(cut(acctName(l.other_name) || (l.account === l.debit ? l.credit : l.debit) || "", 60))}`
    + `${l.doc ? `<small>${esc(cut(l.doc, 40))}</small>` : ""}${!cur && l.account_name ? `<small>${esc(l.account)} ${esc(cut(l.account_name, 40))}</small>` : ""}</span><span class="v">${sg(sign * l.amount, 2)}</span></div>`).join("")
    + (L15.length >= 15 ? `<div class="pl-ln mut">${esc(L("more_lines"))}</div>` : "");
  return s + `</div>`;
}
function books(co, d) {
  const T = d.totals, rows = d.series || [], grain = d.grain || d.period.grain;
  const has = (d.cats || []).length > 0;
  const sel = S.sel[co] != null && S.sel[co] < rows.length ? S.sel[co] : Math.max(0, rows.map((r) => r.any).lastIndexOf(true));
  let s = hero(d);
  if (!has) return s + `<div class="empty">${esc(L("empty"))}</div>`;
  // revenue and expense by bucket, the selected column read out
  const r = rows[sel] || {};
  s += `<div class="card pl-ch"><div class="card-h"><div class="card-t">${esc(L("chart"))}</div><div class="card-n">${esc(L("g_" + grain))}</div></div>`
    + `<div class="pl-leg"><span><i class="pl-key a"></i>${esc(L("revenue"))}</span><span><i class="pl-key h"></i>${esc(L("expense"))}</span></div>`
    + columns(co, rows, grain, "revenue", "expense", { aria: "col_a" }, sel)
    + `<div class="pl-read"><b>${esc(bucketLabel(r.b, grain, true))}</b><span>${esc(L("revenue"))} <em>${sg(r.revenue)}</em></span><span>${esc(L("expense"))} <em>${sg(r.expense)}</em></span><span>${esc(L("res_op"))} <em>${sg(r.operating)}</em></span></div>`
    + table(co, rows, grain, [["revenue", L("revenue")], ["expense", L("expense")], ["operating", L("col_result")]]) + `</div>`;
  if (rows.length > 1) s += `<div class="card pl-ch"><div class="card-h"><div class="card-t">${esc(L("run"))}</div><div class="card-n">${esc(periodLabel(d.period))}</div></div>${running(rows, "cum")}</div>`;
  // expense by category: one segmented bar (numbered as on a plan), then the rows that open to accounts and lines
  const parts = OPEX.map((k) => [k, -catAmt(d, k)]).filter(([k]) => catOf(d, k)), pos = parts.filter(([, v]) => v > 0), tot = pos.reduce((a, [, v]) => a + v, 0);
  if (parts.length) {
    s += `<div class="card"><div class="card-h"><div class="card-t">${esc(L("exp_cats"))}</div><div class="card-n">${sg(T.expense)}</div></div>`
      + (tot > 0 ? `<div class="pl-sb" role="img" aria-label="${esc(pos.map(([k, v]) => L("cat." + k) + " " + (100 * v / tot).toFixed(0) + "%").join(", "))}">`
        + pos.map(([k, v]) => { const i = OPEX.filter((x) => catOf(d, x)).indexOf(k); return `<i class="f${i + 1}" style="flex:${v.toFixed(2)} 1 0">${v / tot >= 0.07 ? `<b>${i + 1}</b>` : ""}</i>`; }).join("") + `</div>` : "")
      + catRows(co, d, OPEX.filter((k) => catOf(d, k)), tot, true) + `</div>`;
  }
  // revenue by account group (6 1 10 sales, 6 1 90 other operating ...)
  const rev = catOf(d, "revenue");
  if (rev) {
    s += `<div class="card"><div class="card-h"><div class="card-t">${esc(L("revenue"))}</div><div class="card-n">${sg(T.revenue)}</div></div>`
      + ((rev.groups || []).length ? (rev.groups || []).map((g) => `<div class="row"><div class="row-m"><div class="row-t">${esc(g.name || g.code)}</div><div class="row-c">${esc(g.code)} · ${esc(L("lines_n", { n: num(g.lines) }))}</div></div><div class="row-v">${sg(g.amount)}</div></div>`).join("") : "")
      + catRows(co, d, ["revenue"], 0, false, { sign: 1, label: L("lines"), noValue: true }) + `</div>`;
  }
  // the ladder: operating result -> class 8 -> class 9 -> the net result; work in progress beside it, never inside
  const nonop = NONOP.filter((k) => catOf(d, k)), c9 = C9.filter((k) => catOf(d, k)), wip = Number(T.wip) || 0;
  const netWord = Math.abs(wip) >= 1 ? L("net") : T.net >= 0 ? L("net_profit") : L("net_loss");
  s += `<div class="card"><div class="card-h"><div class="card-t">${esc(L("ladder"))}</div><div class="card-n">${esc(periodLabel(d.period))}</div></div>`
    + `<div class="row"><div class="row-m"><div class="row-t">${esc(L("revenue"))}</div></div><div class="row-v">${sg(T.revenue)}</div></div>`
    + `<div class="row"><div class="row-m"><div class="row-t">${esc(L("expense"))}</div></div><div class="row-v">${sg(-T.expense)}</div></div>`
    + `<div class="row pl-sum"><div class="row-m"><div class="row-t">${esc(L("res_op"))}</div></div><div class="row-v">${sg(T.operating)}</div></div>`
    + nonop.map((k) => {
      const c = catOf(d, k), farm = k === "farm_sale" && (c.accounts || []).length;
      const fi = farm ? c.accounts.filter((a) => a.amount > 0).reduce((x, a) => x + a.amount, 0) : 0, fe = farm ? -c.accounts.filter((a) => a.amount < 0).reduce((x, a) => x + a.amount, 0) : 0;
      return `<div class="row pl-sub"><div class="row-m"><div class="row-t">${esc(L("cat." + k))}</div>${k === "farm_sale" ? `<div class="row-c">${farm ? esc(L("farm_sub", { i: gel(fi), e: gel(fe) })) + " · " : ""}${esc(L("apart"))}</div>` : ""}</div><div class="row-v">${sgp(c.amount)}</div></div>`;
    }).join("")
    + c9.map((k) => `<div class="row pl-sub"><div class="row-m"><div class="row-t">${esc(L("cat." + k))}</div></div><div class="row-v">${sgp(catAmt(d, k))}</div></div>`).join("")
    + `<div class="row pl-net"><div class="row-m"><div class="row-t">${esc(netWord)}</div></div><div class="row-v">${sg(T.net)}</div></div>`
    + (Math.abs(wip) >= 1 ? (d.can && d.can.accounts && catOf(d, "wip") ? catRows(co, d, ["wip"], 0, false, { sign: -1, label: L("wip"), sub: wip > 0 ? L("wip_up") : L("wip_down"), pill: true })
        : `<div class="row"><div class="row-m"><div class="row-t">${esc(L("wip"))}</div><div class="row-c">${esc(wip > 0 ? L("wip_up") : L("wip_down"))}</div></div><div class="row-v"><span class="pill p-warn">${gel(Math.abs(wip))}</span></div></div>`)
      + `<div class="note">${esc(L("wip_note"))}</div>` : "")
    + `</div>`;
  return s;
}

// ---------------- the rs.ge reading ----------------
function rsge(co, d) {
  const R = d.rsge || { series: [], totals: {} }, T = R.totals, rows = R.series || [], grain = d.grain || d.period.grain;
  const sel = S.sel[co] != null && S.sel[co] < rows.length ? S.sel[co] : Math.max(0, rows.map((r) => !!(r.sale_n || r.purchase_n)).lastIndexOf(true));
  let s = `<div class="grid2"><div class="stat"><div class="stat-l">${esc(L("sale"))}</div><div class="stat-v">${sg(T.sale_net)}</div><div class="stat-s">${esc(L("vat_sub", { v: gel(T.sale_vat), n: num(T.sale_n) }))}</div></div>`
    + `<div class="stat"><div class="stat-l">${esc(L("purchase"))}</div><div class="stat-v">${sg(T.purchase_net)}</div><div class="stat-s">${esc(L("vat_sub", { v: gel(T.purchase_vat), n: num(T.purchase_n) }))}</div></div></div>`
    + `<div class="hero pl-res"><div class="hero-l">${esc(L("diff"))}</div><div class="hero-v">${sg(T.diff)}</div><div class="hero-s">${esc(L("diff_sub"))}</div></div>`;
  if (!(T.sale_n || T.purchase_n)) return s + `<div class="empty">${esc(L("empty"))}</div>`;
  const r = rows[sel] || {};
  s += `<div class="card pl-ch"><div class="card-h"><div class="card-t">${esc(L("chart_rsge"))}</div><div class="card-n">${esc(L("g_" + grain))}</div></div>`
    + `<div class="pl-leg"><span><i class="pl-key a"></i>${esc(L("sale"))}</span><span><i class="pl-key h"></i>${esc(L("purchase"))}</span></div>`
    + columns(co, rows, grain, "sale_net", "purchase_net", { aria: "col_a_rsge" }, sel)
    + `<div class="pl-read"><b>${esc(bucketLabel(r.b, grain, true))}</b><span>${esc(L("sale"))} <em>${sg(r.sale_net)}</em></span><span>${esc(L("purchase"))} <em>${sg(r.purchase_net)}</em></span><span>${esc(L("diff"))} <em>${sg(r.diff)}</em></span></div>`
    + table(co, rows, grain, [["sale_net", L("sale")], ["purchase_net", L("purchase")], ["diff", L("col_diff")]]) + `</div>`;
  if (rows.length > 1) s += `<div class="card pl-ch"><div class="card-h"><div class="card-t">${esc(L("run_rsge"))}</div><div class="card-n">${esc(periodLabel(d.period))}</div></div>${running(rows, "cum")}</div>`;
  return s + `<div class="note">${esc(L("rsge_note"))}</div>`;
}

// ---------------- one company's section ----------------
function section(d, co) {
  if (!d || !d.period) return `<div class="empty">${esc(L("empty"))}</div>`;
  let s = "";
  if (S.err) s += `<div class="banner">${esc(L("err"))} <button class="pl-more" data-pl-retry="1">${esc(L("retry"))}</button></div>`;
  // the books end before the period does (more than 3 days before its end or today): the empty days are not zero sales
  const today = new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10), endP = d.period.to < today ? d.period.to : today;
  if (d.reading !== "rsge" && d.books_last && d.books_last >= d.period.from && (Date.parse(endP) - Date.parse(d.books_last)) / 864e5 > 3) s += `<div class="banner">${esc(L("books_behind", { d: dt(d.books_last) }))}</div>`;
  if (Number(d.pending) > 0) s += `<div class="note">${esc(L("pending", { n: d.pending }))}</div>`;
  s += d.reading === "rsge" ? rsge(co, d) : books(co, d);
  s += `<div class="pl-tb"><div><span>${esc(mt(L("src")))}</span>${esc(d.reading === "rsge" ? L("src_rsge", { d: dt(d.rsge_last) }) : L("src_books", { d: dt(d.books_last), e: dt(d.books_entered) }))}</div>`
    + (d.reading === "rsge" ? "" : `<div><span>${esc(mt(L("rule")))}</span>${esc(L("rule_books"))}</div>`) + `</div>`;
  return s;
}

// ---------------- the view the shell calls, and the redraw after a change made here ----------------
// the shell's params() hook (PR-2, applied by W-RT): the period and the reading on screen go with every load of this tab
// by mini/app.js, so a company switch or a live refresh keeps them instead of falling back to the year to date
export function params() { return S.p || S.r ? { pnl: { p: S.p, r: S.r } } : null; }
export default function view(d, me, _t, co) {
  css();
  if (!S.pass) { S.pass = true; S.secs = []; queueMicrotask(() => { S.pass = false; }); }
  S.me = me; S.secs.push({ company: co, data: d });
  if (d && d.period) { S.p = d.period.key; S.r = d.reading; }
  if (!S.url) { S.url = true; const q = new URLSearchParams(location.search), p = q.get("p"), r = q.get("r");
    if ((p && d && d.period && p !== d.period.key) || (r && d && r !== d.reading)) queueMicrotask(() => reload({ p: p || S.p, r: r || S.r })); }
  return (S.secs.length === 1 && d && d.period ? filter(d) : "") + section(d, co);
}
function draw() {
  const el = document.getElementById("view"); if (!el || !S.me) return;
  const both = S.me.scope === "both";
  let first = true;
  el.innerHTML = (both ? `<div class="note">${t("app.both_note")}</div>` : "") + S.secs.map((x) => {
    const head = both && x.company ? `<div class="co-h">${SYM[x.company] || ""} ${esc(S.me.companies[x.company].name)}</div>` : "";
    const f = first && x.data && x.data.period ? filter(x.data) : ""; if (f) first = false;
    return head + f + section(x.data, x.company);
  }).join("");
  el.classList.toggle("pl-busy", S.busy); el.setAttribute("aria-busy", String(S.busy));
  caps(el);
}
async function call(company, pnl) {
  const TG = window.Telegram && window.Telegram.WebApp;
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: TG ? TG.initData : "", tab: "pnl", company, pnl }) });
  const b = await r.json(); if (!r.ok || b.tab !== "pnl") throw new Error(b.error || r.status);
  return b;
}
async function reload(next) {
  if (S.busy) return;
  S.p = next.p ?? S.p; S.r = next.r ?? S.r; S.busy = true; S.err = null; draw();
  try {
    const b = await call(S.me.scope, { p: S.p, r: S.r });
    S.me = b.me; S.secs = b.sections || []; S.sel = {}; S.open = {}; S.acct = {}; S.custom = false;
    const at = document.getElementById("at"); if (at) at.textContent = t("app.updated", { at: tm(b.at) });
    try { const u = new URL(location.href); u.searchParams.set("tab", "pnl"); u.searchParams.set("p", S.p); u.searchParams.set("r", S.r); history.replaceState(null, "", u); } catch (e) {}
  } catch (e) { S.err = String(e.message || e); }
  S.busy = false; draw();
}
async function loadLines(co, cat, acct) {
  const sec = S.secs.find((x) => x.company === co); if (!sec || !sec.data.can || !sec.data.can.lines) return;
  const key = `${co}|${cat}|${acct || ""}|${sec.data.period.key}`;
  if (S.lines[key] && !S.lines[key].err) return draw();
  S.lines[key] = null; draw();
  try {
    const b = await call(co, { p: sec.data.period.key, r: "books", only: "lines", d: { cat, account: acct || null } });
    S.lines[key] = ((b.sections || [])[0] || {}).data?.drill?.lines || [];
  } catch (e) { S.lines[key] = { err: true }; }
  draw();
}

// the clicks of this view (once per page; app.js's own attributes are not used here)
if (typeof document !== "undefined" && !window.__pnlView) {
  window.__pnlView = true;
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-pl-p],[data-pl-r],[data-pl-nav],[data-pl-custom],[data-pl-go],[data-pl-sel],[data-pl-cat],[data-pl-acct],[data-pl-tbl],[data-pl-retry]");
    if (!el || !S.me) return;
    const TG = window.Telegram && window.Telegram.WebApp; if (TG && TG.HapticFeedback) TG.HapticFeedback.selectionChanged();
    const ds = el.dataset;
    if (ds.plP) return reload({ p: ds.plP });
    if (ds.plR) return ds.plR !== S.r && reload({ r: ds.plR });
    if (ds.plNav) return reload({ p: ds.plNav });
    if (ds.plCustom) { S.custom = !S.custom; return draw(); }
    if (ds.plGo) { const a = document.getElementById("pl-a").value, b = document.getElementById("pl-b").value; if (/^\d{4}-\d{2}$/.test(a) && /^\d{4}-\d{2}$/.test(b)) return reload({ p: a <= b ? `${a}..${b}` : `${b}..${a}` }); return; }
    if (ds.plRetry) return reload({});
    if (ds.plTbl) { S.tbl[ds.plTbl] = !S.tbl[ds.plTbl]; return draw(); }
    if (ds.plSel) { const [co, i] = ds.plSel.split("|"); S.sel[co] = Number(i); return draw(); }
    if (ds.plAcct) { const [co, cat, acct] = ds.plAcct.split("|"); S.acct[co] = S.acct[co] === acct ? null : acct; return loadLines(co, cat, S.acct[co]); }
    if (ds.plCat) {
      const [co, cat] = ds.plCat.split("|");
      if (ds.plAgain) { const sec = S.secs.find((x) => x.company === co); delete S.lines[`${co}|${cat}|${S.acct[co] || ""}|${sec && sec.data.period.key}`]; return loadLines(co, cat, S.acct[co]); }
      S.acct[co] = null; S.open[co] = S.open[co] === cat ? null : cat;
      return S.open[co] ? loadLines(co, cat, null) : draw();
    }
  });
}

// the styles of this view (once; design C's tokens from mini/index.html)
function css() {
  if (document.getElementById("pl-css")) return;
  const st = document.createElement("style"); st.id = "pl-css";
  st.textContent = `
#view.pl-busy>*{opacity:.55;transition:opacity 90ms var(--step)}
.pl-f{padding:10px 12px 12px;display:grid;gap:8px}
.pl-seg{display:flex;border:3px solid var(--q-rule);background:var(--q-surface)}
.pl-seg button{flex:1 1 0;min-width:0;min-height:44px;border:0;border-radius:0;background:var(--q-surface);padding:0 4px;font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.05em;color:var(--q-ink);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background-color 90ms var(--step),color 90ms var(--step)}
.pl-seg button+button{border-left:1.5px solid var(--q-rule)}
.pl-seg button:active{background:var(--q-surface-2)}
.pl-seg button[aria-pressed="true"]{background:var(--q-invert);color:var(--q-on-invert)}
.pl-rd{border-width:1.5px}
.pl-step{display:flex;align-items:stretch;border:1.5px solid var(--q-rule);background:var(--q-surface)}
.pl-step button{flex:none;width:48px;min-height:46px;border:0;border-radius:0;background:var(--q-surface);font:800 22px/1 var(--ff);color:var(--q-ink);cursor:pointer;transition:background-color 90ms var(--step)}
.pl-step button:active{background:var(--q-surface-2)}
.pl-step button:disabled{color:var(--q-rule-light);cursor:default}
.pl-step .l{flex:1 1 auto;min-width:0;display:flex;align-items:center;justify-content:center;text-align:center;border-left:1.5px solid var(--q-rule);border-right:1.5px solid var(--q-rule);padding:4px 6px;font:800 19px/22px var(--ff);font-stretch:62.5%;letter-spacing:.02em}
.pl-in{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;border:1.5px solid var(--q-rule);background:var(--q-rule);gap:1.5px}
.pl-in label{display:flex;flex-direction:column;background:var(--q-surface);padding:5px 8px 4px;min-width:0}
.pl-in label span{font:600 11px/13px var(--ff);font-stretch:75%;letter-spacing:.08em;color:var(--q-muted)}
.pl-in input{font:600 15px/22px var(--ff);color:var(--q-ink);background:transparent;border:0;border-radius:0;padding:0;min-width:0;width:100%;color-scheme:inherit}
.pl-in button{border:0;border-radius:0;background:var(--q-invert);color:var(--q-on-invert);padding:0 12px;min-height:46px;font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.05em;cursor:pointer}
.pl-res .hero-v{font-size:min(52px,13.5vw)}
.pl-ch{padding-bottom:10px}
.pl-leg{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12.5px;line-height:16px;color:var(--q-ink-2);padding:0 0 8px}
.pl-key{display:inline-block;width:12px;height:12px;margin-right:6px;vertical-align:-1px}
.pl-key.a,.pl-a,.f1{background:var(--q-viz-fill)}
.pl-key.h,.pl-h,.f2{background:repeating-linear-gradient(45deg,var(--q-viz-fill) 0 1.5px,transparent 1.5px 4.5px);box-shadow:inset 0 0 0 1px var(--q-viz-fill)}
.f3{background:repeating-linear-gradient(135deg,var(--q-viz-fill) 0 1px,transparent 1px 5px);box-shadow:inset 0 0 0 1px var(--q-viz-fill)}
.f4,.f5{background:radial-gradient(circle,var(--q-viz-fill) 1px,transparent 1.4px) 0 0/5px 5px;box-shadow:inset 0 0 0 1px var(--q-viz-fill)}
.pl-plot{position:relative;height:150px;margin:22px 0 0 46px}
.pl-plot.pl-run{height:84px;margin-top:12px}
.pl-g{position:absolute;left:0;right:0;border-top:1px solid var(--q-rule-light)}
.pl-g.z{border-top:1.5px solid var(--q-rule)}
.pl-g span{position:absolute;right:calc(100% + 6px);top:-7px;font:600 11px/13px var(--ff);font-stretch:75%;color:var(--q-muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.pl-cols{position:absolute;inset:0;display:flex}
.pl-col{flex:1 1 0;min-width:0;position:relative;border:0;border-radius:0;padding:0;background:transparent;cursor:pointer;transition:background-color 90ms var(--step)}
.pl-col.on{background:var(--q-surface-2)}
.pl-pair{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:min(26px,84%);display:grid;grid-template-columns:1fr 1fr;column-gap:2px}
.pl-pair>span{position:relative}
.pl-pair i{position:absolute;left:0;right:0;min-height:1px}
.pl-lab.r{transform:translate(-100%,0)}.pl-lab.l{transform:translate(0,0)}
.pl-lab{position:absolute;bottom:100%;transform:translate(-50%,0);margin-bottom:3px;font:800 13px/15px var(--ff);font-stretch:62.5%;white-space:nowrap;pointer-events:none;background:var(--q-surface);padding:0 2px}
.pl-x{display:flex;margin:4px 0 0 46px}
.pl-x span{flex:1 1 0;min-width:0;text-align:center;font:600 11px/13px var(--ff);font-stretch:75%;color:var(--q-muted);white-space:nowrap}
.pl-x span.on{color:var(--q-ink)}
.pl-read{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.5px;background:var(--q-rule-light);margin-top:10px;border:1px solid var(--q-rule-light)}
.pl-read b{grid-column:1/-1;background:var(--q-surface-2);padding:5px 8px;font:700 12px/15px var(--ff);font-stretch:75%;letter-spacing:.06em}
.pl-read span{background:var(--q-surface);padding:5px 8px 6px;font-size:12px;line-height:15px;color:var(--q-muted);min-width:0}
.pl-read em{display:block;font:800 17px/20px var(--ff);font-stretch:62.5%;font-style:normal;color:var(--q-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-run svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.pl-run polyline{fill:none;stroke:var(--q-accent);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
.pl-dot{position:absolute;width:9px;height:9px;margin:0 0 -4.5px -4.5px;border-radius:50%;background:var(--q-accent);box-shadow:0 0 0 2px var(--q-surface)}
.pl-endl{position:absolute;transform:translate(8px,50%);font:800 14px/16px var(--ff);font-stretch:62.5%;white-space:nowrap;background:var(--q-surface);padding:0 2px}
.pl-endl.r{transform:translate(calc(-100% - 8px),-70%)}
.pl-more{border:1.5px solid var(--q-rule);border-radius:0;background:var(--q-surface);color:var(--q-ink);min-height:36px;padding:0 12px;margin-top:10px;font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.05em;cursor:pointer}
.banner .pl-more{margin:0 0 0 auto;min-height:28px}
.pl-t{width:100%;border-collapse:collapse;margin-top:8px;font-size:12.5px;line-height:16px;font-variant-numeric:tabular-nums}
.pl-t th{text-align:right;font:600 11px/14px var(--ff);font-stretch:75%;letter-spacing:.06em;color:var(--q-muted);padding:4px 0 4px 6px;border-bottom:1.5px solid var(--q-rule)}
.pl-t td{text-align:right;padding:5px 0 5px 6px;border-bottom:1px solid var(--q-rule-light);white-space:nowrap}
.pl-t th:first-child,.pl-t td:first-child{text-align:left;padding-left:0}
.pl-sb{display:flex;gap:2px;height:28px;margin:2px 0 10px}
.pl-sb i{position:relative;min-width:3px}
.pl-sb b,.pl-k b{position:absolute;top:50%;left:5px;transform:translateY(-50%);width:17px;height:17px;border-radius:50%;background:var(--q-surface);box-shadow:0 0 0 1px var(--q-viz-fill);font:700 11px/17px var(--ff);text-align:center;color:var(--q-ink)}
.pl-row .row-m,.pl-row .row-t,.pl-row .row-c{display:block}
button.pl-row{width:100%;text-align:left;background:transparent;border:0;border-top:1px solid var(--q-rule-light);border-radius:0;color:inherit;font:inherit;cursor:pointer}
.card>.pl-row:first-of-type{border-top:1px solid var(--q-rule-light)}
.pl-k{flex:none;position:relative;width:30px;height:24px}
.pl-k.no{width:0}
.pl-k i{position:absolute;inset:3px 0 3px 0;width:22px}
.pl-k b{left:2.5px}
.pl-sum,.pl-net{font-weight:600}
.pl-sum{border-top:1.5px solid var(--q-rule)}
.pl-net{border-top:3px solid var(--q-rule)}
.pl-net .row-t{font-weight:700}
.pl-net .row-v{font:800 22px/24px var(--ff);font-stretch:62.5%}
.pl-sub .row-t{font-size:14px;color:var(--q-ink-2)}
.pl-dr{background:var(--q-surface-2);margin:0 -12px;padding:4px 12px 10px;border-top:1px solid var(--q-rule-light)}
.pl-dh{font:600 11px/14px var(--ff);font-stretch:75%;letter-spacing:.08em;color:var(--q-muted);padding:8px 0 4px}
.pl-ac{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:baseline;width:100%;min-height:40px;padding:6px 0;border:0;border-top:1px solid var(--q-rule-light);border-radius:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.pl-ac.on{box-shadow:inset 3px 0 0 var(--q-ink);padding-left:8px}
.pl-ac .c{font-size:12px;color:var(--q-muted);letter-spacing:.02em;font-variant-numeric:tabular-nums}
.pl-ac .n{font-size:13.5px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl-ac .v,.pl-ln .v{font-size:13.5px;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.pl-ln{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:8px;align-items:baseline;padding:6px 0;border-top:1px solid var(--q-rule-light);font-size:13px;line-height:17px}
.pl-ln.mut{display:block;color:var(--q-muted)}
.pl-ln .d{color:var(--q-muted);font-size:12px;white-space:nowrap}
.pl-ln .w{min-width:0;overflow-wrap:anywhere}
.pl-ln small{display:block;font-size:12px;color:var(--q-muted)}
.pl-tb{display:grid;gap:1.5px;background:var(--q-rule);border-top:3px solid var(--q-rule)!important}
.pl-tb div{background:var(--q-surface);padding:8px 12px;font-size:12.5px;line-height:17px;color:var(--q-ink-2)}
.pl-tb span{display:block;font:600 11px/14px var(--ff);font-stretch:75%;letter-spacing:.09em;color:var(--q-muted);margin-bottom:2px}
@media (max-width:360px){.pl-plot,.pl-x{margin-left:38px}.pl-seg button{font-size:10.5px;letter-spacing:.02em}}
`;
  document.head.appendChild(st);
}

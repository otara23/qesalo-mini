// მარკეტინგი (wave W-SOCIAL, plans/bot-v3.md §3.9, 9.11.2026; Otar's item 17): the company's Facebook Pages and
// Instagram accounts, from Meta's own numbers (mini/functions/mini/social.ts; schema/038; runners/social-sync.mjs reads
// Meta once a day on the PC). Numbers and links only - no post text, no image, no comment, no person. Facts, no advice.
// Before the Page admin has connected the accounts: the honest empty state - „Facebook/Instagram ჯერ არ არის
// დაკავშირებული"; the admin also gets where the one-time link stands and the steps' document.
//
// Design C „ნახაზი": the framed sheet; the hero = followers now with the 28-day change; two KPI cells (engagement %, new
// followers in 28 days); a 90-day line of views on one axis (≤ 2 series: Facebook solid, Instagram dashed - texture,
// legend and end labels carry identity, never colour); a 13-week grid of posts (ink blocks sized by interactions); the
// top posts with Meta's own „გახსნა" link; the accounts; the title block with the source and Meta's 48-hour lag.
import { t, esc, num, dt } from "../ui.js?v=c340a6e.202611101355";

const L = (k, p) => t("marketing." + k, p);
const MINUS = "−";
const sgn = (v) => (v == null ? "—" : (v > 0 ? "+" : v < 0 ? MINUS : "") + num(Math.abs(v)));
const pf = (p) => L("pf." + p);
const dtY = (s, today) => (!s ? "—" : dt(s) + (today && String(s).slice(0, 4) !== String(today).slice(0, 4) ? " " + String(s).slice(0, 4) : ""));

// ---------------- the empty state ----------------
function empty(d) {
  let s = `<div class="card"><div class="card-h"><div class="card-t">${esc(L("title"))}</div></div><div class="empty mk-empty"><b>${esc(L("none"))}</b><br>${esc(L(d.connect ? "none_admin" : "none_other"))}</div>`;
  const c = d.connect;
  if (c) {
    const st = c.link == null ? L("link_none") : c.link === "open" ? L("link_open", { d: dt(c.until) }) : c.link === "received" ? L("link_received") : c.link === "opened" ? L("link_opened") : c.link === "expired" ? L("link_expired") : L("link_revoked");
    s += `<div class="mk-tb"><div><span>${esc(L("who"))}</span>${esc(L("who_v"))}</div><div><span>${esc(L("link"))}</span>${esc(st)}</div><div><span>${esc(L("steps"))}</span>${esc(L("steps_v"))}</div>`
      + (c.unassigned ? `<div><span>${esc(L("unassigned"))}</span>${esc(L("unassigned_v", { n: c.unassigned }))}</div>` : "") + `</div>`;
  }
  return s + `</div>`;
}

// ---------------- the 90-day line ----------------
function line(series, today) {
  const all = series.flatMap((s) => s.points.map((p) => p.v)), hi0 = Math.max(1, ...all);
  const e = Math.pow(10, Math.floor(Math.log10(hi0))), f = hi0 / e, hi = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
  const t0 = Date.parse(today) - 89 * 864e5, x = (d) => ((Date.parse(d) - t0) / (89 * 864e5)) * 100, y = (v) => 100 - (v / hi) * 100;
  const grid = [0, hi / 2, hi].map((v) => `<div class="mk-g${v === 0 ? " z" : ""}" style="bottom:${(100 * v / hi).toFixed(2)}%"><span>${num(v)}</span></div>`).join("");
  const paths = series.map((s, i) => `<polyline class="mk-s${i}" points="${s.points.map((p) => `${x(p.d).toFixed(2)},${y(p.v).toFixed(2)}`).join(" ")}" vector-effect="non-scaling-stroke"/>`).join("");
  // the end labels: two that would touch (< 14 % of the plot apart) are pushed apart around their middle
  const lab = series.map((s) => { const p = s.points[s.points.length - 1]; return p ? { s, p, b: 100 - y(p.v) } : null; });
  if (lab[0] && lab[1] && Math.abs(lab[0].b - lab[1].b) < 14) { const m = (lab[0].b + lab[1].b) / 2, up = lab[0].b >= lab[1].b ? 0 : 1; lab[up].b = Math.min(100, m + 7); lab[1 - up].b = Math.max(0, m - 7); }
  const ends = lab.map((l) => (l ? `<div class="mk-end${x(l.p.d) > 70 ? " r" : ""}" style="left:${x(l.p.d).toFixed(2)}%;bottom:${l.b.toFixed(2)}%">${esc(pf(l.s.platform))} ${num(l.p.v)}</div>` : "")).join("");
  const xs = [89, 59, 29, 0].map((k) => `<span style="left:${(100 - (k / 89) * 100).toFixed(1)}%">${esc(dt(new Date(Date.parse(today) - k * 864e5).toISOString().slice(0, 10)))}</span>`).join("");
  const leg = series.map((s, i) => `<span><i class="mk-key k${i}"></i>${esc(pf(s.platform))} · ${esc(L("key." + s.key))}</span>`).join("");
  return `<div class="mk-leg">${leg}</div><div class="mk-plot">${grid}<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="${esc(L("chart_aria"))}">${paths}</svg>${ends}</div><div class="mk-x">${xs}</div>`;
}

// ---------------- the week grid ----------------
function weeks(g, today) {
  const max = Math.max(1, ...g.cells.map((c) => c.i)), rows = [];
  for (let w = 0; w < 13; w++) rows.push(g.cells.slice(w * 7, w * 7 + 7));
  const head = L("dow").map((d) => `<span>${esc(d)}</span>`).join("");
  return `<div class="mk-wk"><div class="mk-wh">${head}</div>` + rows.map((r) => `<div class="mk-wr">${r.map((c) => {
    if (c.future) return `<i class="f"></i>`;
    if (!c.n) return `<i class="o" title="${esc(dt(c.d))}"></i>`;
    const s = Math.round(40 + 60 * Math.sqrt(c.i / max));
    return `<i class="p" title="${esc(dt(c.d) + " · " + L("posts_n", { n: c.n }) + " · " + L("inter_n", { n: num(c.i) }))}"><b style="width:${s}%;height:${s}%"></b>${c.n > 1 ? `<em>${c.n}</em>` : ""}</i>`;
  }).join("")}</div>`).join("") + `<div class="mk-wl">${esc(L("grid_note", { d: dt(g.start) }))}</div></div>`;
}

export default function view(d, me, _t, company) {
  css();
  if (!d || d.state !== "ok") return empty(d || {});
  const T = d.total, today = d.today;
  let s = `<div class="card mk"><div class="hero"><div class="hero-l">${esc(L("followers"))}</div><div class="hero-v">${T.followers == null ? "—" : num(T.followers)}</div>`
    + `<div class="hero-s">${T.change28 == null ? esc(L("change_none")) : esc(L("change", { v: sgn(T.change28) })) + (T.change_partial ? " · " + esc(L("change_partial")) : "")}</div></div>`
    + `<div class="grid2"><div class="stat"><div class="stat-l">${esc(L("eng"))}</div><div class="stat-v">${T.engagement28 == null ? "—" : num(T.engagement28, 1) + " %"}</div><div class="stat-s">${esc(L("eng_s"))}</div></div>`
    + `<div class="stat"><div class="stat-l">${esc(L("new"))}</div><div class="stat-v">${T.new28 == null ? "—" : num(T.new28)}</div><div class="stat-s">${esc(L("new_s"))}</div></div></div></div>`;
  if (d.series.length) s += `<div class="card mk-ch"><div class="card-h"><div class="card-t">${esc(L("chart"))}</div><div class="card-n">${esc(L("days90"))}</div></div>${line(d.series, today)}</div>`;
  s += `<div class="card"><div class="card-h"><div class="card-t">${esc(L("grid"))}</div><div class="card-n">${esc(L("days90"))}</div></div><div class="mk-fq">${esc(L("freq", { n: num(d.posts28), w: num(d.per_week, 1) }))}</div>${weeks(d.grid, today)}</div>`;
  s += `<div class="card"><div class="card-h"><div class="card-t">${esc(L("top"))}</div><div class="card-n">${esc(L("days90"))}</div></div>`
    + (d.top.length ? d.top.map((p, i) => `<div class="row mk-p"><span class="mk-n">${i + 1}</span><div class="row-m"><div class="row-t">${esc(pf(p.platform))} · ${esc(L("kind." + (p.kind || "other")))} · ${esc(dtY(p.at, today))}</div>`
      + `<div class="row-c">${esc(p.account || "")}${p.reach != null ? " · " + esc(L("reach_n", { n: num(p.reach) })) : ""}${p.views != null ? " · " + esc(L("views_n", { n: num(p.views) })) : ""}</div></div>`
      + `<div class="row-v">${p.interactions == null ? "—" : num(p.interactions)}<small>${esc(L("inter"))}</small>${p.url ? `<a class="mk-open" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" data-mk-url="${esc(p.url)}">${esc(L("open"))}</a>` : ""}</div></div>`).join("")
      : `<div class="empty">${esc(L("no_posts"))}</div>`) + `</div>`;
  s += `<div class="card"><div class="card-h"><div class="card-t">${esc(L("accounts"))}</div><div class="card-n">${num(d.accounts.length)}</div></div>`
    + d.accounts.map((a) => `<div class="row"><div class="row-m"><div class="row-t">${esc(pf(a.platform))} · ${esc(a.handle ? "@" + a.handle : a.name || "")}</div>`
      + `<div class="row-c">${a.newest_day ? esc(L("newest", { d: dtY(a.newest_day, today) })) : esc(L("no_days"))}${a.low ? " · " + esc(L("low")) : ""}${a.error ? ` · <span class="pill p-bad">${esc(L("err"))}</span> ${esc(a.error)}` : ""}${a.missing ? " · " + esc(L("refused", { m: a.missing.join(", ") })) : ""}</div></div>`
      + `<div class="row-v">${a.followers == null ? "—" : num(a.followers)}<small>${a.change28 == null ? esc(L("followers_s")) : esc(sgn(a.change28)) + " · 28 " + esc(L("d"))}</small></div></div>`).join("") + `</div>`;
  s += `<div class="mk-tb"><div><span>${esc(L("src"))}</span>${esc(L("src_v"))}</div><div><span>${esc(L("asof"))}</span>${d.as_of ? esc(dtY(d.as_of.slice(0, 10), today)) : "—"} · ${esc(L("lag"))}</div><div><span>${esc(L("rule"))}</span>${esc(L("rule_v"))}</div></div>`;
  return s;
}

// a post's „გახსნა": Telegram's own browser when the panel runs in Telegram (a plain link would open inside the WebView)
export function mount(el) {
  el.querySelectorAll("[data-mk-url]").forEach((a) => a.addEventListener("click", (e) => {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.openLink && tg.initData) { e.preventDefault(); try { tg.openLink(a.dataset.mkUrl); } catch (x) { window.open(a.dataset.mkUrl, "_blank", "noopener"); } }
  }));
}

function css() {
  if (typeof document === "undefined" || document.getElementById("mk-css")) return;
  const st = document.createElement("style"); st.id = "mk-css";
  st.textContent = `
.mk .hero-s{margin-top:4px}
.mk-empty b{display:block;color:var(--q-ink);font-size:15px;margin-bottom:6px}
.mk-ch .mk-leg{display:flex;flex-wrap:wrap;gap:6px 16px;padding:2px 0 8px;font-size:12px;color:var(--q-ink-2)}
.mk-key{display:inline-block;width:18px;height:0;border-top:2.5px solid var(--q-ink);vertical-align:3px;margin-right:6px}
.mk-key.k1{border-top-style:dashed}
.mk-plot{position:relative;height:150px;margin:6px 0 0 44px}
.mk-plot svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.mk-plot polyline{fill:none;stroke:var(--q-ink);stroke-width:2;stroke-linejoin:round}
.mk-plot polyline.mk-s1{stroke-dasharray:5 3}
.mk-g{position:absolute;left:0;right:0;border-top:1px solid var(--q-rule-light)}
.mk-g.z{border-top:1.5px solid var(--q-rule)}
.mk-g span{position:absolute;right:100%;margin-right:6px;transform:translateY(-50%);font-size:11px;color:var(--q-muted);white-space:nowrap}
.mk-end{position:absolute;transform:translate(6px,50%);font:700 11.5px/14px var(--ff);color:var(--q-ink);white-space:nowrap;background:var(--q-surface);padding:0 2px}
.mk-end.r{transform:translate(calc(-100% - 6px),50%)}
.mk-x{position:relative;height:18px;margin:4px 0 8px 44px;font-size:11px;color:var(--q-muted)}
.mk-x span{position:absolute;transform:translateX(-50%);white-space:nowrap}.mk-x span:last-child{transform:translateX(-100%)}.mk-x span:first-child{transform:none}
.mk-wk{padding:2px 0 10px}
.mk-wh,.mk-wr{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px}
.mk-wh span{font:600 10.5px/14px var(--ff);font-stretch:75%;letter-spacing:.06em;color:var(--q-muted);text-align:center;padding-bottom:3px}
.mk-wr{margin-top:2px}
.mk-wr i{position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;max-height:26px}
.mk-wr i.o{border:1px solid var(--q-rule-light)}
.mk-wr i.p{border:1px solid var(--q-rule)}
.mk-wr i.p b{display:block;background:var(--q-ink)}
.mk-wr i.p em{position:absolute;font:700 10px/1 var(--ff);font-style:normal;color:var(--q-on-invert)}
.mk-wl{font-size:11.5px;color:var(--q-muted);padding-top:6px}
.mk-fq{font:600 13px/18px var(--ff);color:var(--q-ink);padding:2px 0 6px}
.mk-p .mk-n{flex:none;width:22px;height:22px;border:1.5px solid var(--q-rule);border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 11px/1 var(--ff)}
.mk-p .row-v small{display:block}
.mk-open{display:inline-block;margin-top:4px;min-height:28px;padding:5px 8px;border:1.5px solid var(--q-rule);font:700 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.05em;color:var(--q-ink);text-decoration:none}
.mk-open:active{background:var(--q-surface-2)}
.mk-tb{margin:0 12px 12px;border:1.5px solid var(--q-rule);font-size:12px;line-height:16px;color:var(--q-ink-2)}
.mk-tb div{padding:6px 8px}.mk-tb div+div{border-top:1px solid var(--q-rule-light)}
.mk-tb span{display:block;font:600 11px/14px var(--ff);font-stretch:75%;letter-spacing:.09em;color:var(--q-muted);margin-bottom:2px}
.card .mk-tb{margin:4px 0 12px}
@media (max-width:360px){.mk-plot,.mk-x{margin-left:36px}}
`;
  document.head.appendChild(st);
}

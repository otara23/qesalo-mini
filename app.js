// The panel's shell (wave W-SURF, plans/bot-v3.md §2.1, 9.11.2026; the page of waves access, design2, polish1 split into
// modules): Telegram's initData -> the `mini` Edge Function -> one tab of one company scope, drawn by mini/views/<tab>.js.
// This file: the strings, the theme, the header, the company switch, the tab bar (with its position bar), loading a tab,
// the clicks. It decides nothing about access - the function sends the person's tabs (lib/access-matrix.json).
//
// A view (one module per tab, mini/views/<tab>.js):  export default function view(data, me, t, company) -> HTML
//   data    = one company's section of the function's answer (TABS[company][tab] in mini/functions/mini/tabs-*.ts)
//   me      = the function's `me` (name, role, tabs, scope, companies ...); t = mini/ui.js t(key, params)
//   company = 'nursery' | 'main' | null (null = no company: trust); under „ორივე" the view is called once per company.
// A new tab = its view file + its registry line in a tabs-*.ts + its name in the matrix + its label tab.<name> in
// mini/i18n/ka.json; nothing in this file changes.
// Deep links: ?tab=<tab>&co=<company> (the bot's web_app buttons), or a Direct Link's startapp=<tab>[_<company>].
// Versions: the published copy stamps ?v=<version> on every module and the strings (deploy/pages-publish.mjs); a
// local copy has none.
import { t, tOr, setStrings, esc, mt, caps, SYM, symOf, tm, card } from "./ui.js?v=5309b78.202611091541";

// the function's address is written once, in index.html (<meta name="qesalo-api">): the doctor's Pages check reads the
// served index.html for it (lib/doctor/checks.mjs PAGES.marker)
const API = document.querySelector('meta[name="qesalo-api"]').content;
const TG = window.Telegram && window.Telegram.WebApp;
const V = new URL(import.meta.url).searchParams.get("v"), Q = V ? "?v=" + V : "";
const LANG = "ka";   // W-I18N: the person's language (bot_people.lang) and the header switch
const $ = (s) => document.querySelector(s);

// scope = which company the person looks at: nursery | main | both (the bot's switch; ?co= in the link)
let me = null, cur = "home", badge = 0, scope = new URLSearchParams(location.search).get("co") || null;
// tab -> its view module, loaded once. A module's default export draws the sheet; two optional hooks (W-PNL's request):
//   params()               -> the view's own request fields (a period, a drill-down), sent with every load of that tab,
//                             so they survive the company switch and a refetch
//   mount(el, { reload, me }) after the sheet is drawn: wire the view's own controls; reload(fields) loads the tab again
//                             with those fields
const mods = {};
const NONE = { default: () => "" };
const modOf = (tab) => {
  if (!/^[a-z_]+$/.test(tab || "")) return Promise.resolve(NONE);
  if (!mods[tab]) mods[tab] = import("./views/" + tab + ".js" + Q).catch(() => NONE);
  return mods[tab];
};

// our light (survey sheet) or dark (cyanotype) token set from Telegram's colorScheme; Telegram's chrome gets the
// canvas colour; the safe areas go into --q-safe-top / --q-safe-bottom
function theme() {
  const dark = TG && TG.colorScheme ? TG.colorScheme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const root = document.documentElement;
  root.dataset.theme = dark ? "dark" : "light";
  const s = (TG && TG.safeAreaInset) || {}, c = (TG && TG.contentSafeAreaInset) || {};
  root.style.setProperty("--q-safe-top", ((s.top || 0) + (c.top || 0)) + "px");
  root.style.setProperty("--q-safe-bottom", ((s.bottom || 0) + (c.bottom || 0)) + "px");
  const canvas = getComputedStyle(root).getPropertyValue("--q-canvas").trim();
  if (TG) { try { if (TG.setHeaderColor) TG.setHeaderColor(canvas); if (TG.setBackgroundColor) TG.setBackgroundColor(canvas); if (TG.setBottomBarColor) TG.setBottomBarColor(canvas); } catch (e) {} }
}

function drawHead() {
  const one = me.companies[me.scope];
  // the legal name, as on the cards (C: no screen prints „ქესალო" as a company - Telegram's header already does)
  const brand = one ? one.name : t("app.two_companies");
  $("#brand").textContent = mt(brand); document.title = one ? one.brand : brand;
  $("#logo").innerHTML = symOf(me.scope);
  $("#who").textContent = me.name + " · " + (me.role_ka || tOr("role." + me.role, me.role));
  $("#test").hidden = !me.test; $("#test").textContent = me.test || "";
  const seg = me.scopes || [];
  $("#seg").hidden = seg.length < 2;
  $("#seg").innerHTML = seg.length < 2 ? "" : seg.map((s) => `<button class="${s === me.scope ? "on" : ""}" data-co="${s}" aria-pressed="${s === me.scope}">${s === "both" ? "" : SYM[s]}${esc(mt(s === "both" ? t("app.both") : me.companies[s].short))}</button>`).join("");
  $("#foot").textContent = (me.scope === "nursery" && seg.length < 2 ? t("app.foot_brand") : "") + t("app.foot");
}

// the tab bar (item 15b): the row scrolls sideways; under it a 2 px position bar (track = the light rule, the ink block
// = the part of the row on screen - the survey sheet's scale bar), and a chevron cell at an edge while tabs are hidden
// on that side. Nothing eases: the bar and the chevrons follow the scroll position as it is.
function drawPos() {
  const el = $("#tabs"), w = el.scrollWidth, v = el.clientWidth, x = el.scrollLeft, over = w > v + 1;
  $("#tpos").hidden = !over; $("#tch-l").hidden = !over || x <= 1; $("#tch-r").hidden = !over || x + v >= w - 1;
  if (over) { const i = $("#tpos i"); i.style.left = (100 * x / w) + "%"; i.style.width = (100 * v / w) + "%"; }
}
function drawTabs() {
  $("#tabs").innerHTML = me.tabs.map((x) => `<button class="tab${x === cur ? " on" : ""}" data-t="${x}">${mt(t("tab." + x))}${x === "alerts" && badge ? ` <span class="b">${badge}</span>` : ""}</button>`).join("");
  const on = $("#tabs .on"); if (on) on.scrollIntoView({ inline: "center", block: "nearest" });
  drawPos();
}

const skeleton = () => `<div class="card"><div class="skel"></div><div class="skel" style="width:60%"></div><div class="skel" style="width:80%"></div></div>`;
async function load(tab, co, extra) {
  cur = tab; if (co) scope = co; if (me) drawTabs();
  $("#view").innerHTML = skeleton();
  try {
    // the open view's own fields (its params() hook) when nothing else is asked; a ✓ or a reload passes its own
    const m0 = mods[tab] ? await mods[tab] : null;
    if (!extra && m0 && m0.params) extra = m0.params() || null;
    const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: TG ? TG.initData : "", tab, company: scope, ...(extra || {}) }) });
    const b = await r.json();
    if (r.status === 401) return fail(t("app.err_401"));
    if (r.status === 403) return fail(t("app.err_403"));
    if (!r.ok) return fail(t("app.err_load", { e: esc(b.error || r.status) }));
    me = b.me; cur = b.tab;
    // the function deployed before W-A answers without companies or scope: it knows the nursery only (either may be
    // deployed first - this page must work with both)
    if (!me.companies) Object.assign(me, { companies: { nursery: { name: "შპს კავკასუს ურბან ნერსერი", short: "ნერსერი", brand: "ქესალო · ნერსერი" } }, scope: "nursery", scopes: ["nursery"] });
    scope = me.scope || scope;
    if (b.tab === "home") badge = Number(b.data.home && b.data.home.open_alerts) || 0;
    // „ორივე": every section carries its company's name (also when only one company has this tab), never a total, and
    // the sheet says so; a company with no tab here yet says so. The view gets the section's company.
    const secs = b.sections || [{ company: null, data: b.data }];
    const mod = b.tab ? await modOf(b.tab) : NONE, view = mod.default || NONE.default;
    drawHead();
    $("#at").textContent = t("app.updated", { at: tm(b.at) });
    drawTabs();
    $("#view").innerHTML = !b.tab ? card(esc(me.companies[me.scope] ? me.companies[me.scope].name : ""), "", `<div class="empty">${t("app.no_tabs")}</div>`)
      : (me.scope === "both" ? `<div class="note">${t("app.both_note")}</div>` : "")
        + secs.map((x) => (me.scope === "both" && x.company ? `<div class="co-h">${SYM[x.company] || ""} ${esc(me.companies[x.company].name)}</div>` : "")
        + view(x.data, me, t, x.company)).join("");
    // ✓ on the alerts tab (wave polish1): what the function did, then the list without the closed one
    if (b.acked) $("#view").insertAdjacentHTML("afterbegin", b.acked.ok
      ? `<div class="banner ok">${t("app.acked_ok", { title: esc(b.acked.title), by: esc(b.acked.by || ""), at: b.acked.at ? " · " + tm(b.acked.at) : "" })}</div>`
      : `<div class="banner">${t("app.acked_fail")}</div>`);
    if (secs.some((x) => ((x.data && x.data.alerts) || []).some((a) => a.ack))) $("#foot").textContent = t("app.foot_ack");
    caps($("#view"));
    if (mod.mount) try { mod.mount($("#view"), { reload: (x) => load(cur, null, x), me }); } catch (e) { console.error(e); }   // the sheet stays
    window.scrollTo(0, 0);
  } catch (e) { fail(t("app.err_net")); }
}
function fail(msg) { $("#view").innerHTML = `<div class="card"><div class="empty">${msg}<br><br><button class="tab" data-retry="1">${t("app.retry")}</button></div></div>`; }

document.addEventListener("click", (e) => {
  const haptic = () => { if (TG && TG.HapticFeedback) TG.HapticFeedback.selectionChanged(); };
  const k = e.target.closest("[data-ack]"); if (k) { haptic(); return load(cur, null, { ack: Number(k.dataset.ack) }); }
  const x = e.target.closest("[data-t]"); if (x) { haptic(); return load(x.dataset.t); }
  const c = e.target.closest("[data-co]"); if (c) { haptic(); return load(cur, c.dataset.co); }
  const g = e.target.closest("[data-go]"); if (g && me && me.tabs.includes(g.dataset.go)) return load(g.dataset.go);
  const r = e.target.closest("[data-det]"); if (r) { const el = document.getElementById("det" + r.dataset.det); el.classList.toggle("open"); r.classList.toggle("open-r", el.classList.contains("open")); return; }
  const ch = e.target.closest("[data-tch]"); if (ch) { const el = $("#tabs"); el.scrollBy({ left: Number(ch.dataset.tch) * Math.max(80, el.clientWidth - 88), behavior: "auto" }); return; }
  if (e.target.closest("[data-retry]")) return load(cur);
});

// the tab to open: a Direct Link's startapp=<tab>[_<company>] (bot-v3 §2.1), else ?tab= (the bot's buttons), else home
function startTab() {
  const sp = (TG && TG.initDataUnsafe && TG.initDataUnsafe.start_param) || "";
  const m = sp.match(/^([a-z_]+?)(?:_(nursery|main|both))?$/);
  if (m) { if (m[2] && !scope) scope = m[2]; return m[1]; }
  return new URLSearchParams(location.search).get("tab") || "home";
}

async function boot() {
  theme();
  if (TG) { TG.ready(); TG.expand(); if (TG.onEvent) ["themeChanged", "safeAreaChanged", "contentSafeAreaChanged"].forEach((e) => TG.onEvent(e, theme)); }
  $("#tabs").addEventListener("scroll", drawPos, { passive: true });
  window.addEventListener("resize", drawPos);
  try { setStrings(await (await fetch("i18n/" + LANG + ".json" + Q)).json()); } catch (e) { setStrings({}); }
  $("#tch-l").setAttribute("aria-label", t("app.tabs_prev")); $("#tch-r").setAttribute("aria-label", t("app.tabs_next"));
  const start = startTab(), tab = /^[a-z_]+$/.test(start) ? start : "home";
  // a Mini App opened from a reply-keyboard button gets no initData (core.telegram.org/bots/webapps: WebAppInitData „is
  // empty if the Mini App was launched from a keyboard button"): the function could not tell who it is. Then the page
  // hands the tab back to the bot (sendData closes it; the bot answers with an inline 📊 button, which carries initData).
  if (TG && !TG.initData && TG.platform && TG.platform !== "unknown" && TG.sendData) {
    $("#view").innerHTML = `<div class="card"><div class="empty">${t("app.keyboard")}</div></div>`;
    try { TG.sendData(JSON.stringify({ open: tab, co: scope || null })); } catch (e) { fail(t("app.err_401")); }
    return;
  }
  load(tab);
}
boot();

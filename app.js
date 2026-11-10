// The panel's shell (wave W-SURF, plans/bot-v3.md §2.1, 9.11.2026; the page of waves access, design2, polish1 split into
// modules): Telegram's initData -> the `mini` Edge Function -> one tab of one company scope, drawn by mini/views/<tab>.js.
// This file: the strings, the theme, the header (the company and the language only - otar-1011 §1.3), the company switch, the tab bar (with its position bar), loading a tab,
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
// Live (wave W-RT, ./live.js): the open tab updates itself - a Realtime socket on surface_versions (the address and the
// public key come in the function's `live`), a quiet reload of the open tab when its version grows (debounced; scroll,
// open rows and the view's params() kept), polling with `since` while the socket is down, nothing while hidden, and a
// reload that keeps the tab, company and filters when the site serves a newer version.json. A load sequence guard: an
// answer that a newer load (a tap) has overtaken is dropped.
import { t, tOr, setStrings, setLocale, esc, mt, caps, SYM, symOf, tm, card, nameIn, levelText } from "./ui.js?v=16459b0.202611101234";
import { createLive } from "./live.js?v=16459b0.202611101234";

// the function's address is written once, in index.html (<meta name="qesalo-api">): the doctor's Pages check reads the
// served index.html for it (lib/doctor/checks.mjs PAGES.marker)
const API = document.querySelector('meta[name="qesalo-api"]').content;
const TG = window.Telegram && window.Telegram.WebApp;
const V = new URL(import.meta.url).searchParams.get("v"), Q = V ? "?v=" + V : "";
// W-I18N (bot-v3 §2.4): the language on screen, ka | ru | en. The first draw takes the one this phone last showed this
// person (localStorage - a convenience, nothing depends on it), else Telegram's language_code as a hint, else ka; then
// the function's me.lang decides (bot_people.lang of the person on screen; under /as the person looked at). The header's
// ქარ · РУС · ENG writes the REAL person's row through {op: set_lang}; under /as a tap changes only this screen's words.
const LANGS = ["ka", "ru", "en"], LANG_LABEL = { ka: "ქარ", ru: "РУС", en: "ENG" };
let LANG = "ka", localLang = null;
const STRS = {};
const tgUser = () => (TG && TG.initDataUnsafe && TG.initDataUnsafe.user) || {};
const langKey = () => "qesalo.lang." + (tgUser().id || "-");
const RU_TOO = ["ru", "uk", "be", "kk", "ky", "uz", "az", "hy", "tg", "tk", "mo"];
const hintLang = () => { const c = String(tgUser().language_code || "").toLowerCase().split(/[-_]/)[0]; return !c ? null : c === "ka" ? "ka" : RU_TOO.includes(c) ? "ru" : "en"; };
const storedLang = () => { try { const l = localStorage.getItem(langKey()); return LANGS.includes(l) ? l : null; } catch (e) { return null; } };
let fbMod = null;   // the 💬 composer (W-FB, ./feedback.js) once mounted: its button is relabelled on a switch
// the strings of a language (fetched once), the number format, <html lang> (the composer and the CSS read it)
async function setLang(l, keep = true) {
  l = LANGS.includes(l) ? l : "ka";
  if (!STRS[l]) { try { STRS[l] = await (await fetch("i18n/" + l + ".json" + Q)).json(); } catch (e) { if (l !== "ka") return setLang("ka", keep); STRS[l] = {}; } }
  LANG = l; setStrings(STRS[l]); setLocale(l); document.documentElement.lang = l;
  if (keep) { try { localStorage.setItem(langKey(), l); } catch (e) {} }
  $("#tch-l").setAttribute("aria-label", t("app.tabs_prev")); $("#tch-r").setAttribute("aria-label", t("app.tabs_next"));
  if (fbMod && fbMod.relabel) try { fbMod.relabel(); } catch (e) {}
  if (liveState) drawLive(liveState);   // the live mark's label in the new words
}
function drawLang() {
  const el = $("#lang"); if (!el) return;
  el.hidden = false; el.setAttribute("aria-label", t("app.lang"));
  el.innerHTML = LANGS.map((l) => `<button class="${l === LANG ? "on" : ""}" data-lang="${l}" lang="${l}" aria-pressed="${l === LANG}" title="${esc(t("app.lang_" + l))}">${LANG_LABEL[l]}</button>`).join("");
}
const $ = (s) => document.querySelector(s);

// scope = which company the person looks at: nursery | main | both (the bot's switch; ?co= in the link)
let me = null, cur = "home", badge = 0, scope = new URLSearchParams(location.search).get("co") || null;
let seq = 0, busy = false;   // the newest load owns the sheet; busy = a load is in flight (the live refresh waits)
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
  const brand = one ? one.name : t("app.two_companies"), latin = one && LANG !== "ka" ? tOr("app.latin." + me.scope, "") : "";
  $("#brand").innerHTML = esc(mt(brand)) + (latin ? `<small class="brand-x">${esc(latin)}</small>` : ""); document.title = one ? (LANG === "ka" ? one.brand : t("app.brand_plain")) : brand;
  $("#logo").innerHTML = symOf(me.scope);
  drawBar();
  const seg = me.scopes || [];
  $("#seg").hidden = seg.length < 2;
  $("#seg").innerHTML = seg.length < 2 ? "" : seg.map((s) => `<button class="${s === me.scope ? "on" : ""}" data-co="${s}" aria-pressed="${s === me.scope}">${s === "both" ? "" : SYM[s]}${esc(mt(s === "both" ? t("app.both") : tOr("app.co." + s, me.companies[s].short)))}</button>`).join("");
  drawLang();
  $("#foot").textContent = (me.scope === "nursery" && seg.length < 2 ? t("app.foot_brand") : "") + t("app.foot");
}

// the /as line of a function from before me.view, in the language on screen (ka: the function's own Georgian, as before)
const nameOf = (m) => (LANG !== "ka" && m.names && m.names[LANG]) || m.name;
const levelsOf = (m) => [...new Set(Object.values(m.access || {}))];
function testLine(m) {
  if (LANG === "ka") return m.test;
  const cs = Object.keys(m.access || {}), ls = levelsOf(m), co = (c) => tOr("app.co." + c, c);
  const desc = ls.length === 1 ? cs.map(co).join(" + ") + " · " + tOr("app.level." + ls[0], ls[0]) : cs.map((c) => co(c) + ": " + tOr("app.level." + m.access[c], m.access[c])).join(" · ");
  return t("app.test", { name: nameOf(m), desc });
}

// the view-as bar (otar-1011 W1, §1.2): under the header while the admin looks as someone - „ხედვა: {name} · {level}" and
// „გასვლა" (= { op: view_as, id: null }, viewAs below; the chat's /as off is the same). Drawn from me.view; a function from
// before it sends me.test only: its words, no exit cell (the chat's /as off ends it)
function drawBar() {
  const el = $("#va"), v = me.view;
  el.hidden = !v && !me.test;
  if (el.hidden) { el.innerHTML = ""; return; }
  const words = v ? t("app.va", { name: nameIn(v.name, v.names), level: levelText(v.access, v.level_ka) }) : testLine(me);
  el.innerHTML = `<div class="va-t">${esc(words)}</div>` + (v ? `<button class="va-x" data-va="">${esc(mt(t("app.va_exit")))}</button>` : "");
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
// opt.quiet (the live refresh): no skeleton, `since` sent, an { unchanged } answer only moves the time, a failure keeps
// the sheet, scroll and open rows stay
async function load(tab, co, extra, opt) {
  const quiet = !!(opt && opt.quiet), my = ++seq;
  busy = true;
  cur = tab; if (co) scope = co; if (me && !quiet) drawTabs();
  if (!quiet) $("#view").innerHTML = skeleton();
  try {
    // the open view's own fields (its params() hook) when nothing else is asked; a ✓ or a reload passes its own
    const m0 = mods[tab] ? await mods[tab] : null;
    if (!extra && m0 && m0.params) extra = m0.params() || null;
    const since = quiet ? live.since(tab) : null;
    const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: TG ? TG.initData : "", tab, company: scope, ...(extra || {}), ...(since ? { since } : {}) }) });
    const b = await r.json();
    if (my !== seq) return;                       // a newer load (a tap) owns the sheet
    if (quiet && !r.ok) return;                   // the next check tries again; the sheet stays as it is
    if (r.ok) live.seen(b);
    if (b.unchanged) return setAt(b.at);
    if (r.status === 401) return fail(t("app.err_401"));
    if (r.status === 403) return fail(t("app.err_403"));
    if (!r.ok) return fail(t("app.err_load", { e: esc(b.error || r.status) }));
    me = b.me; cur = b.tab;
    // the language: a switch tap under /as (this screen only), else the person on screen's; strings fetched before the draw
    if (!me.test) localLang = null;
    const want = localLang || (LANGS.includes(me.lang) ? me.lang : LANG);
    if (want !== LANG || !STRS[want]) await setLang(want, !me.test);
    if (my !== seq) return;
    // the function deployed before W-A answers without companies or scope: it knows the nursery only (either may be
    // deployed first - this page must work with both)
    if (!me.companies) Object.assign(me, { companies: { nursery: { name: "შპს კავკასუს ურბან ნერსერი", short: "ნერსერი", brand: "ქესალო · ნერსერი" } }, scope: "nursery", scopes: ["nursery"] });
    scope = me.scope || scope;
    if (b.tab === "home") badge = Number(b.data.home && b.data.home.open_alerts) || 0;
    // „ორივე": every section carries its company's name (also when only one company has this tab), never a total, and
    // the sheet says so; a company with no tab here yet says so. The view gets the section's company.
    const secs = b.sections || [{ company: null, data: b.data }];
    const mod = b.tab ? await modOf(b.tab) : NONE, view = mod.default || NONE.default;
    if (my !== seq) return;
    // a quiet redraw keeps the rows the person opened (when the list kept its length) and the scroll position
    const opened = quiet ? [...document.querySelectorAll("#view .det.open")].map((el) => el.id) : [], nDet = document.querySelectorAll("#view [data-det]").length;
    drawHead();
    setAt(b.at);
    drawTabs();
    $("#view").innerHTML = !b.tab ? card(esc(me.companies[me.scope] ? me.companies[me.scope].name : ""), "", `<div class="empty">${t("app.no_tabs")}</div>`)
      : (me.scope === "both" ? `<div class="note">${t("app.both_note")}</div>` : "")
        + secs.map((x) => (me.scope === "both" && x.company ? `<div class="co-h">${SYM[x.company] || ""} ${esc(me.companies[x.company].name)}${LANG !== "ka" ? ` <small class="brand-x" style="display:inline">${esc(tOr("app.latin." + x.company, ""))}</small>` : ""}</div>` : "")
        + view(x.data, { ...me, lang: LANG }, t, x.company)).join("");
    // ✓ on the alerts tab (wave polish1): what the function did, then the list without the closed one
    if (b.acked) $("#view").insertAdjacentHTML("afterbegin", b.acked.ok
      ? `<div class="banner ok">${t("app.acked_ok", { title: esc(b.acked.title), by: esc(b.acked.by || ""), at: b.acked.at ? " · " + tm(b.acked.at) : "" })}</div>`
      : `<div class="banner">${t("app.acked_fail")}</div>`);
    if (secs.some((x) => ((x.data && x.data.alerts) || []).some((a) => a.ack))) $("#foot").textContent = t("app.foot_ack");
    if (opened.length && document.querySelectorAll("#view [data-det]").length === nDet) for (const id of opened) {
      const el = document.getElementById(id), row = document.querySelector(`#view [data-det="${id.slice(3)}"]`);
      if (el) el.classList.add("open"); if (row) row.classList.add("open-r");
    }
    caps($("#view"));
    if (mod.mount) try { mod.mount($("#view"), { reload: (x) => load(cur, null, x), me }); } catch (e) { console.error(e); }   // the sheet stays
    if (!quiet) window.scrollTo(0, 0);
  } catch (e) { if (my === seq && !quiet) fail(t("app.err_net")); }
  finally { if (my === seq) busy = false; }
}
// the time of the last answer goes only into the live mark's label (otar-1011 §1.3: no „განახლდა" on screen): today's
// time alone, another day's with its date
let atHM = "";
const setAt = (at) => {
  const d = new Date(at), hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  atHM = d.toDateString() === new Date().toDateString() ? hm : tm(at);
  labelLive();
};
// the live mark after the company's name: a filled square = live, a ring = checking every 30 s (shape + the words and the
// time in its label: „ცოცხალი: … · 14:48")
let liveState = null;
function drawLive(s) {
  liveState = s;
  const el = $("#lv"); if (!el) return;
  el.hidden = s === "off"; el.className = "lv" + (s === "live" ? "" : " poll");
  labelLive();
}
function labelLive() {
  const el = $("#lv"); if (!el || !liveState) return;
  const w = tOr(liveState === "live" ? "app.live_on" : "app.live_poll", ""), l = w ? w + (atHM ? " · " + atHM : "") : atHM;
  el.title = l; if (l) el.setAttribute("aria-label", l);
}
// the tripwire's reload: the same tab and company (sessionStorage, read by startTab), the view's filters stay in the
// address (pnl keeps ?p=&r=), a unique query so neither the phone nor Pages' CDN answers with the old index.html
function reloadKeep() {
  try { sessionStorage.setItem("qesalo.reload", JSON.stringify({ tab: cur, co: scope, at: Date.now() })); } catch (e) {}
  const u = new URL(location.href); u.searchParams.set("_r", String(Date.now())); location.replace(u.href);
}
const live = createLive({
  version: V, refetch: () => load(cur, null, null, { quiet: true }), busy: () => busy, state: drawLive, reload: reloadKeep,
  // only checked_at moved (the minute bank re-read, nothing changed): the header's time, and an event a view may use to
  // move its own „as of" without asking again (detail = { company, surface, at })
  checked: (at, r) => { setAt(at); try { document.dispatchEvent(new CustomEvent("qesalo:checked", { detail: { company: r && r.company, surface: r && r.surface, at } })); } catch (e) {} },
  typing: () => { const a = document.activeElement; return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) || [...document.querySelectorAll("textarea")].some((x) => x.value.trim()); },
});
function fail(msg) { $("#view").innerHTML = `<div class="card"><div class="empty">${msg}<br><br><button class="tab" data-retry="1">${t("app.retry")}</button></div></div>`; }

document.addEventListener("click", (e) => {
  const haptic = () => { if (TG && TG.HapticFeedback) TG.HapticFeedback.selectionChanged(); };
  const k = e.target.closest("[data-ack]"); if (k) { haptic(); return load(cur, null, { ack: Number(k.dataset.ack) }); }
  const va = e.target.closest("[data-va]"); if (va) { haptic(); return viewAs(va.dataset.va || null); }
  const x = e.target.closest("[data-t]"); if (x) { haptic(); return load(x.dataset.t); }
  const c = e.target.closest("[data-co]"); if (c) { haptic(); return load(cur, c.dataset.co); }
  const g = e.target.closest("[data-go]"); if (g && me && me.tabs.includes(g.dataset.go)) return load(g.dataset.go);
  const r = e.target.closest("[data-det]"); if (r) { const el = document.getElementById("det" + r.dataset.det); el.classList.toggle("open"); r.classList.toggle("open-r", el.classList.contains("open")); return; }
  const ch = e.target.closest("[data-tch]"); if (ch) { const el = $("#tabs"); el.scrollBy({ left: Number(ch.dataset.tch) * Math.max(80, el.clientWidth - 88), behavior: "auto" }); return; }
  const lg = e.target.closest("[data-lang]"); if (lg) { haptic(); return switchLang(lg.dataset.lang); }
  if (e.target.closest("[data-retry]")) return load(cur);
});
// ქარ · РУС · ENG: the words at once, then the person's row, then the open tab loaded again in the new words. A failed
// write keeps the words; the next answer says what the row holds. Under /as nothing is written.
async function switchLang(l) {
  if (!LANGS.includes(l) || l === LANG || !me) return;
  const test = !!me.test;
  if (test) localLang = l;
  await setLang(l, !test);
  if (!test) { try { await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: TG ? TG.initData : "", op: "set_lang", lang: l }) }); } catch (e) {} }
  me.lang = l;
  return load(cur);
}

// სუპერადმინი (otar-1011 W1, plans/bot-v3-otar-1011.md §1.2): a person's row = { op: view_as, id } - the function writes
// view_as on the REAL admin's bot_people row, the row the chat's /as writes - then that person's panel (tabs, scope,
// language) from home; id null (the view-as bar's „გასვლა") = back to the admin's own panel, on the admin tab
async function viewAs(id) {
  try {
    const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: TG ? TG.initData : "", op: "view_as", id: id || null }) });
    if (!r.ok) { const b = await r.json().catch(() => ({})); return fail(r.status === 403 ? t("app.err_403") : t("app.err_load", { e: esc(b.error || r.status) })); }
  } catch (e) { return fail(t("app.err_net")); }
  localLang = null;
  return load(id ? "home" : "admin");
}

// the tab to open: a Direct Link's startapp=<tab>[_<company>] (bot-v3 §2.1), else ?tab= (the bot's buttons), else home
function startTab() {
  // the tripwire's reload a moment ago (W-RT): the tab and company the person was on win over the link they came by
  try {
    const k = JSON.parse(sessionStorage.getItem("qesalo.reload") || "null"); sessionStorage.removeItem("qesalo.reload");
    if (k && Date.now() - k.at < 60e3 && /^[a-z_]+$/.test(k.tab || "")) { if (k.co) scope = k.co; return k.tab; }
  } catch (e) {}
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
  await setLang(storedLang() || hintLang() || "ka", false);
  const start = startTab(), tab = /^[a-z_]+$/.test(start) ? start : "home";
  // a Mini App opened from a reply-keyboard button gets no initData (core.telegram.org/bots/webapps: WebAppInitData „is
  // empty if the Mini App was launched from a keyboard button"): the function could not tell who it is. Then the page
  // hands the tab back to the bot (sendData closes it; the bot answers with an inline 🌿 button, which carries initData).
  if (TG && !TG.initData && TG.platform && TG.platform !== "unknown" && TG.sendData) {
    $("#view").innerHTML = `<div class="card"><div class="empty">${t("app.keyboard")}</div></div>`;
    try { TG.sendData(JSON.stringify({ open: tab, co: scope || null })); } catch (e) { fail(t("app.err_401")); }
    return;
  }
  load(tab);
  // the 💬 composer (W-FB, plans/_work/bot-v3-feedback.md PR-A - applied by i18n in its app.js turn)
  import("./feedback.js" + Q).then((m) => { fbMod = m; m.mount({ api: API, tg: TG, t }); }).catch(() => {});
  import("./report.js" + Q).then((m) => m.mount({ api: API, tg: TG })).catch(() => {});   // W-REP: the 📄 cell (a PDF to the chat)
}
boot();

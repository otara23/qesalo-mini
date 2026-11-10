// The panel's shared parts (wave W-SURF, plans/bot-v3.md §2.1, 9.11.2026): the strings (t), number and date formats,
// the design-C building blocks (card, row, stat, bars, detail rows), Mtavruli and the plan symbols. Every view
// (mini/views/<tab>.js) imports from here; mini/app.js loads the strings (mini/i18n/<lang>.json) before the first view
// draws. Nothing here fetches or reads the page's state.
let STR = {};
export function setStrings(s) { STR = s || {}; }
// W-I18N (bot-v3 §2.4): the language on screen - ka | ru | en (mini/app.js sets it with the strings). Numbers per locale:
// ka as before (1,234,567.89 - the panel's figures since design2), ru 1 234 567,89 (narrow spaces, decimal comma), en
// 1,234,567.89; ₾ after the number in all three. Dates: the day + mon_short of the language (9 ნოე / 9 ноя / 9 Nov).
let LANG = "ka";
const LOCALE = { ka: "en-US", ru: "ru-RU", en: "en-US" };
export function setLocale(l) { LANG = LOCALE[l] ? l : "ka"; }
export const lang = () => LANG;
const lookup = (k) => String(k).split(".").reduce((o, x) => (o == null ? undefined : o[x]), STR);
// t("cash.total") -> the string; t("home.bank_old", { n: 3 }) fills {n}; an array or object comes back as it is; a key
// that is not in the file comes back as the key itself (visible on screen, never a blank)
export function t(k, p) {
  const v = lookup(k);
  if (v == null) return k;
  if (typeof v !== "string" || !p) return v;
  return v.replace(/\{(\w+)\}/g, (m, n) => (p[n] == null ? "" : String(p[n])));
}
// a word from a lookup table (bank names, feed names, statuses) or, when the file has none for this code, the fallback
export const tOr = (k, fallback) => (lookup(k) == null ? fallback : t(k));

export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const num = (v, d = 0) => v == null || v === "" ? "—" : Number(v).toLocaleString(LOCALE[LANG], { minimumFractionDigits: d, maximumFractionDigits: d });
export const gel = (v, d = 0) => v == null ? "—" : num(v, d) + " ₾";   // no-break space: „₾" never wraps onto a line alone
export const dt = (s) => { if (!s) return "—"; const d = new Date(String(s).length <= 10 ? s + "T00:00:00" : s); return d.getDate() + " " + t("mon_short")[d.getMonth()]; };
export const tm = (s) => { const d = new Date(s); return dt(s) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
export const daysAgo = (s) => s ? Math.floor((Date.now() - new Date(s + (String(s).length <= 10 ? "T00:00:00" : "")).getTime()) / 864e5) : null;
export const card = (title, n, body) => `<div class="card"><div class="card-h"><div class="card-t">${title}</div>${n ? `<div class="card-n">${n}</div>` : ""}</div>${body}</div>`;
export const row = (t, c, v, extra = "") => `<div class="row ${extra}"><div class="row-m"><div class="row-t">${t}</div>${c ? `<div class="row-c">${c}</div>` : ""}</div>${v != null ? `<div class="row-v">${v}</div>` : ""}</div>`;
export const stat = (l, v, s) => `<div class="stat"><div class="stat-l">${l}</div><div class="stat-v">${v}</div>${s ? `<div class="stat-s">${s}</div>` : ""}</div>`;
// status: a shape (.dot) plus a word; alerts.level is urgent | warn | info (crit/error from older rows)
export const lvl = (l) => l === "urgent" || l === "crit" || l === "error" ? "bad" : l === "warn" ? "warn" : l === "info" ? "info" : "ok";
// Mtavruli as code points (Mkhedruli U+10D0-10FA, 10FD-10FF -> +0x0BC0) for titles, labels, tabs and the switch; text
// nodes only (caps), so markup and entities stay intact
export const mt = (s) => String(s).replace(/[ა-ჺჽ-ჿ]/g, (c) => String.fromCodePoint(c.codePointAt(0) + 0x0BC0));
export function caps(root) {
  root.querySelectorAll(".card-t,.hero-l,.stat-l").forEach((el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) n.nodeValue = mt(n.nodeValue); });
}
// plan symbols (circle with a centre point = the nursery's trees, square = the main company's plot); the glyph inside
// is what a text reader gets, the drawing is CSS
export const SYM = { nursery: `<span class="sym nursery"><i>◉</i></span>`, main: `<span class="sym main"><i>■</i></span>` };
export const symOf = (s) => (s === "both" ? SYM.nursery + SYM.main : SYM[s] || "");
// a person in the language on screen (otar-1011: the admin tab's people, the view-as bar): the name as ru/en write it
// (bot_people.name_i18n), and the levels - ka = the function's own words (level_ka), ru/en from the access map; one level
// on both companies = „ორივე · …" / „Обе · …"
export const nameIn = (name, names) => (LANG !== "ka" && names && names[LANG]) || name || "";
export function levelText(access, levelKa) {
  const cs = Object.keys(access || {}), ls = [...new Set(Object.values(access || {}))];
  if ((LANG === "ka" && levelKa) || !cs.length) return levelKa || "";
  const L = (l) => tOr("app.level." + l, l), C = (c) => tOr("app.co." + c, c);
  return cs.length > 1 && ls.length === 1 ? t("app.both") + " · " + L(ls[0]) : ls.length === 1 ? cs.map(C).join(" + ") + " · " + L(ls[0]) : cs.map((c) => C(c) + ": " + L(access[c])).join(" · ");
}

// the main company's tabs and the featA/B/C tabs (waves mainmini, polish1)
export const monthName = (s) => t("month")[Number(String(s).slice(5, 7)) - 1] || "";
export const fxAmt = (v, c) => (Math.abs(Number(v)) < 100 ? num(v, 2) : num(v)) + " " + c;   // cents only under 100, as on the card
export const cut = (s, n) => { s = String(s == null ? "" : s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
export const span = (a, b) => (a === b ? dt(a) : dt(a) + "–" + dt(b));
export const barRow = (t, c, v, w) => `<div class="row"><div class="row-m"><div class="row-t">${t}</div>${c ? `<div class="row-c">${c}</div>` : ""}<div class="bar"><i style="width:${Math.max(0, Math.min(100, Number(w) || 0))}%"></i></div></div><div class="row-v">${v}</div></div>`;
// dates of another year than today's carry the year
export const dy = (s, today) => (!s ? "—" : dt(s) + (today && String(s).slice(0, 4) !== String(today).slice(0, 4) ? " " + String(s).slice(0, 4) : ""));
// „31 იან 2028-მდე" in one piece (a line may not break at the suffix's hyphen); a suffix with {d} is a template (ru/en:
// „до {d}", „since {d}" - the preposition goes before the date)
export const until = (s, today, suffix) => `<span class="nw">${String(suffix).includes("{d}") ? String(suffix).replace("{d}", dy(s, today)) : dy(s, today) + suffix}</span>`;
export const daysIn = (n) => (n === 0 ? t("days.today") : n === 1 ? t("days.tomorrow") : t("days.in", { n }));
export const quotes = (s) => String(s == null ? "" : s).replace(/"([^"]*)"/g, "„$1“");
// the cards' short names (data rules on the Georgian names as the sources write them, not screen words): no legal-form
// prefix, „ქ. თბილისის" -> „თბილისის" (the order book's rule; the radar's also drops „შპს", as lib/cards-radar.mjs does)
export const shortName = (s) => quotes(String(s || "").split(" / ")[0].trim()).replace(/^(სსიპ|ა\(ა\)\s?იპ|ააიპ)\s+/, "").replace(/^(ქალაქ|ქ\.)\s*თბილისის\s+/, "თბილისის ");
export const radarName = (s) => quotes(String(s || "").replace(/,,/g, "„")).replace(/^(სსიპ|ა\(ა\)\s?იპ|ააიპ|შპს)\s*[-–]?\s*/, "").replace(/^(ქალაქ|ქ\.)\s*თბილისის\s+/, "თბილისის ");
export const calTitle = (s) => quotes(s).replace(/(^|\s)(სსიპ|ა\(ა\)იპ)\s+/, "$1").replace(/(ქალაქ|ქ\.)\s*თბილისის\s+(მუნიციპალიტეტის\s+)?/, "თბილისის ");
export const detRow = (id, t, c, v, det) => `<div class="row tap" data-det="${id}"><div class="row-m"><div class="row-t">${t}</div>${c ? `<div class="row-c">${c}</div>` : ""}</div><div class="row-v">${v}</div><span class="chev">›</span></div><div class="det" id="det${id}">${det}</div>`;

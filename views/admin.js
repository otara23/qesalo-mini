// სუპერადმინი (otar-1011 W1, plans/bot-v3-otar-1011.md §1.2; Otar's 2, 10.11.2026): the admin's own tab, no company.
//   ვის თვალით   the six people (bot_people + bot_access), the admin's own row first („თქვენ", not tappable); a tap on
//                another row = { op: view_as, id } (mini/app.js viewAs) - the same bot_people.view_as row the chat's /as
//                writes - then the panel loads that person's tabs, scope and language; the bar under the header says whose
//                view it is and „გასვლა" comes back here
//   მოწვევები    each person's invite state; the invite itself stays the chat's /invite <id> (nothing is sent from here)
//   ექიმი        the doctor's verdict, open incidents and last run (v_doctor_status) + each open incident by name, its
//                start and „told" (debug-1011 #16; trust's words); „ყველა › წყაროები" opens trust
//   ვერსია       the page (version.json, fetched once in mount), the function (its commit + the access matrix's version)
//                and the bot's active users
// Data: mini/functions/mini/tabs-global.ts admin(). Status = a shape plus a word (check, ring, triangle); no colour alone.
import { t, tOr, esc, num, dt, tm, card, row, levelText, nameIn } from "../ui.js?v=f320af5.202611101900";

const W = (k, p) => t("admin." + k, p);
const STATE = { active: ["ok", "s_active"], invited: ["info", "s_invited"], waiting: ["warn", "s_waiting"], not_invited: ["idle", "s_not_invited"], off: ["idle", "s_off"] };
const mark = (dot, word) => `<span style="display:inline-flex;align-items:center;gap:7px"><span class="dot ${dot}"></span>${esc(word)}</span>`;
const stateWord = (x) => { const [dot, k] = STATE[x.state] || STATE.not_invited; return mark(dot, W(k)); };
const langWord = (l) => (l ? t("app.lang_" + l) : "—");
function invDetail(x) {
  if (x.state === "active") return x.at ? W("inv_active", { d: dt(x.at) }) : W("s_active");
  if (x.state === "invited") return W("inv_link", { d: x.at ? dt(x.at) : "—" });
  if (x.state === "waiting") return W("inv_waiting", { d: x.at ? tm(x.at) : "—" });
  if (x.state === "off") return W("s_off");
  return W("inv_none");
}
const VERDICT = { ok: "ok", warn: "warn", bad: "bad" };
let pageVer = null;   // version.json of the page on screen (fetched once)

export default function view(d) {
  const P = d.people || [];
  const who = P.map((x) => {
    const name = esc(nameIn(x.name, x.names)) + (x.me ? ` <span class="mut">· ${esc(W("you"))}</span>` : "");
    const c = `${esc(levelText(x.access, x.level_ka))} · ${esc(langWord(x.lang))}</div><div class="row-c">${stateWord(x)}`;
    return x.can_view ? `<div class="row tap" data-va="${esc(x.id)}" role="button"><div class="row-m"><div class="row-t">${name}</div><div class="row-c">${c}</div></div><span class="chev">›</span></div>`
      : row(name, c, null);
  }).join("");
  const inv = P.map((x) => row(esc(nameIn(x.name, x.names)), esc(invDetail(x)), x.state === "active" ? null : `<span class="mono">/invite ${esc(x.id)}</span>`)).join("");
  const dc = d.doctor;
  const open = (dc && dc.open_list) || [];
  const openRows = open.map((i) => row(mark(i.level === "warn" ? "warn" : "bad", i.title),
    esc([`#${i.id}`, tOr("trust.doctor_since", "არ მუშაობს") + " " + (i.since ? tm(i.since) : "—"), i.told ? tOr("trust.doctor_told", "ოთარს ეცნობა") : ""].filter(Boolean).join(" · ")), null)).join("");
  const doc = (dc ? row(mark(VERDICT[dc.verdict] || "warn", t("trust.doctor_verdict_" + dc.verdict)), esc(W("doc_open", { n: num(dc.open) })), tm(dc.at)) + openRows : row(esc(W("doc_none")), "", null))
    + `<div class="row tap" data-go="trust" role="button"><div class="row-m"><div class="row-t">${esc(W("doc_all"))}</div></div><span class="chev">›</span></div>`;
  const v = d.version || {};
  const ver = row(esc(W("ver_page")), `<span id="adm-pv-c">${pageVer ? esc(pageLine(pageVer)) : ""}</span>`, `<span id="adm-pv" class="mono">${esc(pageVer ? pageVer.version : "…")}</span>`)
    + row(esc(W("ver_fn")), esc(W("ver_matrix", { v: v.matrix || "—" })), `<span class="mono">${esc(v.fn || "—")}</span>`)
    + row(esc(W("ver_users")), "", num(d.users_active));
  return card(W("who_t"), W("who_n", { n: P.length }), who + `<div class="note">${esc(W("who_note"))}</div>`)
    + card(W("inv_t"), "", inv + `<div class="note">${esc(W("inv_how"))}</div>`)
    + card(W("doc_t"), "", doc)
    + card(W("ver_t"), "", ver);
}
const pageLine = (j) => [j.commit, j.published ? tm(j.published) : null].filter(Boolean).join(" · ");

// the page's own version (the local copy says „dev"); a failed fetch leaves „…"
export function mount(el) {
  if (pageVer) return;
  fetch("version.json?t=" + Date.now(), { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j) return; pageVer = j;
    const a = el.querySelector("#adm-pv"), b = el.querySelector("#adm-pv-c");
    if (a) a.textContent = j.version || "—"; if (b) b.textContent = pageLine(j);
  }).catch(() => {});
}

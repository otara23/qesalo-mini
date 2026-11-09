// წყაროები (admin, no company): every feed's last good run (v_v9_data_trust). The feed names are mini/i18n's `feed`
// table - a copy of FEED_LABEL in lib/feeds.mjs (the bot's cards and digest use that one): change both together.
// The doctor's block on top (bot-v3 W-DOC, 9.11): its last run and the open / last-24-h incidents (v_doctor_status,
// docs/doctor.md). A feed whose last attempt failed after its last good run shows the warning dot at once (the doctor's
// group rows; before, a dot turned only when the feed went stale). Words not yet in ka.json fall back to their Georgian
// here (patch request to i18n/surface: plans/_work/bot-v3-doctor.md).
import { t, tOr, esc, tm, card, row, stat } from "../ui.js?v=dc00dfd.202611091715";

const W = (k, ka) => tOr("trust." + k, ka);
const VERDICT = { ok: ["ok", "ყველაფერი მუშაობს"], warn: ["warn", "ყურადღება"], bad: ["bad", "რაღაც არ მუშაობს"] };

function doctorBlock(d) {
  if (!d || !d.at) return "";
  const [dot, word] = VERDICT[d.verdict] || ["warn", d.verdict];
  const I = d.incidents || [];
  const head = row(`<span style="display:inline-flex;align-items:center;gap:8px"><span class="dot ${dot}"></span>${esc(W("doctor_verdict_" + d.verdict, word))}</span>`,
    esc(W("doctor_open", "ღია") + ": " + (d.open_incidents || 0)), tm(d.at));
  const rows = I.map((i) => row(`<span style="display:inline-flex;align-items:center;gap:8px"><span class="dot ${i.resolved_at ? "ok" : i.level === "warn" ? "warn" : "bad"}"></span>${esc(i.title)}</span>`,
    esc([`#${i.id}`, i.resolved_at ? W("doctor_resolved", "აღდგა") + " " + tm(i.resolved_at) : W("doctor_since", "არ მუშაობს") + " " + tm(i.opened_at),
      i.escalated ? W("doctor_told", "ოთარს ეცნობა") : i.heals ? W("doctor_healed", "თვითონ გამოასწორა") : ""].filter(Boolean).join(" · ")), ""));
  return card(W("doctor_title", "ექიმი (ყოველ 5 წუთში)"), I.length ? W("doctor_24h", "24 სთ") + ": " + I.length : "", head + rows.join(""));
}

export default function view(d) {
  const F = d.feeds || [];
  const failing = (f) => f.last_error && f.last_attempt && (!f.last_ok || f.last_attempt > f.last_ok);
  const ok = F.filter((f) => !f.stale && !failing(f)).length;
  return doctorBlock(d.doctor) + `<div class="grid2">${stat(t("trust.working"), ok + " / " + F.length, "")}${stat(t("trust.attention"), F.length - ok, "")}</div>`
    + card(t("trust.title"), "", F.map((f) => row(`<span style="display:inline-flex;align-items:center;gap:8px"><span class="dot ${f.stale ? (f.last_ok ? "warn" : "bad") : failing(f) ? "warn" : "ok"}"></span>${esc(tOr("feed." + f.feed, f.feed))}</span>`,
      f.last_error ? esc(f.last_error === "waiting for credentials" ? t("trust.err_credentials") : f.last_error) : "", f.last_ok ? tm(f.last_ok) : "—")).join(""));
}

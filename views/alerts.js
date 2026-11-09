// შეტყობინებები (both companies): the open alerts the gate routes to this person; a.ack (wave polish1) = the person may
// close it - a ✓ cell, as the bot's ✓ under a push.
import { t, esc, card, tm, lvl } from "../ui.js?v=86cc6d3.202611091626";

export default function view(d) {
  const A = d.alerts || [];
  if (!A.length) return card(t("alerts.title"), "", `<div class="empty"><span class="dot ok"></span> ${t("alerts.none")}</div>`);
  return card(t("alerts.open"), A.length, A.map((a) => `<div class="row"><span class="dot ${lvl(a.level)}"></span><div class="row-m"><div class="row-t">${esc(a.title)}</div>${a.body ? `<div class="row-c">${esc(a.body)}</div>` : ""}<div class="row-c"><span class="w ${lvl(a.level)}">${t("level." + lvl(a.level))}</span> · ${tm(a.created_at)}</div></div>${a.ack ? `<button class="ack" data-ack="${a.id}" aria-label="${t("alerts.ack_label", { title: esc(a.title) })}"><span class="dot ok"></span></button>` : ""}</div>`).join(""));
}

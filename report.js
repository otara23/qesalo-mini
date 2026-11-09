// The panel's 📄 (wave W-REP, plans/bot-v3.md §2.6; Otar's item 5): a boxed cell above the 💬 cell on the tabs a report
// exists for (მოგება, ფული, ინვესტიცია, ვალები; on ინვესტიცია also the investor's monthly report). A tap sends
// { op: "report", report: { template, company, period } } to the `mini` function (mini/functions/mini/report.ts): the PDF
// comes as a document to the person's own Telegram chat within a minute - nothing else is sent anywhere, and the cell
// takes no address. The period is the მოგება view's own (?p= in the address); the company is the one on screen („both"
// = one PDF per company). Mounted by mini/app.js after the page has drawn, like ./feedback.js:
//   import("./report.js" + Q).then((m) => m.mount({ api, tg }))
// Words: its own table, ka / ru / en by <html lang> (W-I18N sets it). Design C: zero radius, a 3 px frame, two-frame steps.
const STR = {
  ka: { pnl: "📄 მოგება — PDF ჩატში", cash: "📄 ფული — PDF ჩატში", funds: "📄 ინვესტიცია — PDF ჩატში", debts: "📄 ვალები — PDF ჩატში", investor: "📄 თვის ანგარიში — PDF ჩატში",
    sending: "იგზავნება…", ok: "✓ PDF ჩატში მოვა წუთის განმავლობაში.", busy: "ცოტა ხანში სცადეთ — რამდენიმე რეპორტი უკვე მზადდება.", err: "ვერ გაიგზავნა — სცადეთ თავიდან." },
  ru: { pnl: "📄 Прибыль — PDF в чат", cash: "📄 Деньги — PDF в чат", funds: "📄 Инвестиции — PDF в чат", debts: "📄 Долги — PDF в чат", investor: "📄 Отчёт за месяц — PDF в чат",
    sending: "Отправляю…", ok: "✓ PDF придёт в чат в течение минуты.", busy: "Попробуйте чуть позже — несколько отчётов уже готовятся.", err: "Не отправилось — попробуйте ещё раз." },
  en: { pnl: "📄 Profit — PDF to the chat", cash: "📄 Cash — PDF to the chat", funds: "📄 Investment — PDF to the chat", debts: "📄 Debts — PDF to the chat", investor: "📄 Monthly report — PDF to the chat",
    sending: "Sending…", ok: "✓ The PDF comes to the chat within a minute.", busy: "Try a little later — several reports are being made.", err: "Not sent — please try again." },
};
const FOR_TAB = { pnl: ["pnl"], cash: ["cash"], funds: ["funds", "investor"], debts: ["debts"] };
const CSS = `
.rp-bar{margin:8px 0 0;border:3px solid var(--q-rule);background:var(--q-surface);display:flex}
.rp-bar[hidden]{display:none}
.rp-cell{flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:center;min-height:44px;border:0;border-radius:0;background:var(--q-surface);color:var(--q-ink);font:700 12px/15px var(--ff);font-stretch:75%;letter-spacing:.06em;cursor:pointer;padding:0 8px;text-align:center;transition:background-color 90ms var(--step),color 90ms var(--step)}
.rp-cell+.rp-cell{border-left:1.5px solid var(--q-rule)}
.rp-cell:active{background:var(--q-surface-2)}
.rp-cell:disabled{color:var(--q-muted);cursor:default}
.rp-msg{font-size:13px;line-height:18px;padding:6px 2px 0;color:var(--q-ink-2)}
.rp-msg.bad{color:var(--q-crit)}
`;
let opts = null, sending = false;
const $ = (s, r = document) => r.querySelector(s);
const mt = (s) => String(s).replace(/[ა-ჺჽ-ჿ]/g, (c) => String.fromCodePoint(c.codePointAt(0) + 0x0BC0));
const words = () => STR[document.documentElement.lang] || STR.ka;
function ctx() {
  const on = $("#tabs .tab.on"), co = $("#seg button.on"), qs = new URLSearchParams(location.search);
  return { tab: on ? on.dataset.t : qs.get("tab") || "home", company: co ? co.dataset.co : qs.get("co") || null, period: qs.get("p") || null };
}
function say(text, ok) { const el = $("#rp-say"); el.hidden = !text; el.className = "rp-msg" + (ok ? "" : " bad"); el.textContent = text || ""; }
function draw() {
  const bar = $("#rp-bar"); if (!bar) return;
  const c = ctx(), list = FOR_TAB[c.tab] || [], S = words();
  bar.hidden = !list.length;
  const now = [...bar.querySelectorAll("button")].map((b) => b.dataset.r).join(",");
  if (now !== list.join(",")) { bar.innerHTML = list.map((r) => `<button class="rp-cell" type="button" data-r="${r}"></button>`).join(""); say(""); }
  for (const b of bar.querySelectorAll("button")) if (!sending) b.textContent = mt(S[b.dataset.r]);
}
async function send(template) {
  if (sending) return;
  const S = words(), c = ctx(), h = opts.tg && opts.tg.HapticFeedback;
  sending = true; for (const b of $("#rp-bar").querySelectorAll("button")) { b.disabled = true; if (b.dataset.r === template) b.textContent = S.sending; }
  try { if (h) h.selectionChanged(); } catch (e) {}
  try {
    const r = await fetch(opts.api, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: opts.tg ? opts.tg.initData : "", op: "report", report: { template, company: c.company === "both" ? null : c.company, period: template === "pnl" ? c.period : null } }) });
    const b = await r.json().catch(() => ({}));
    if (r.ok && b.ok) { say(S.ok, true); try { if (h) h.notificationOccurred("success"); } catch (e) {} }
    else say(r.status === 429 ? S.busy : S.err, false);
  } catch (e) { say(S.err, false); }
  sending = false; for (const b of $("#rp-bar").querySelectorAll("button")) b.disabled = false; draw();
}
// W-I18N: the page switched its language - the cells in the new words
export function relabel() { draw(); }
export function mount(o) {
  if (opts || !o || !o.api) return;
  opts = o;
  const st = document.createElement("style"); st.id = "rp-css"; st.textContent = CSS; document.head.appendChild(st);
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="rp-bar" id="rp-bar" hidden></div><div class="rp-msg" id="rp-say" hidden aria-live="polite"></div>`;
  const foot = $("#foot"), fb = $(".fb-bar"), at = fb || foot;
  at.parentNode.insertBefore(wrap, at);
  $("#rp-bar").addEventListener("click", (e) => { const b = e.target.closest("button[data-r]"); if (b) send(b.dataset.r); });
  // the tab bar redraws on every load: follow it (and <html lang> for a language switch)
  new MutationObserver(draw).observe($("#tabs"), { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  draw();
}

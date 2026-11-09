// The panel's 💬 composer (wave W-FB, plans/bot-v3.md §2.7, 9.11.2026; TIM's feedback sheet in design C „ნახაზი").
// A boxed cell above the footer on every tab opens a sheet: the note (2 000 characters), an optional picture (a phone
// screenshot from the gallery, shrunk here to ≤ 1600 px JPEG under 2 MB), „გაგზავნა", and the person's last 5 notes
// with their state (an admin: everyone's last 10). The note goes to the `mini` function as { op: "feedback" } with the
// tab and company on screen (mini/functions/mini/feedback.ts): Otar gets the ping in Telegram, the author does not.
// Mounted by mini/app.js once the page has drawn: import("./feedback.js").then((m) => m.mount({ api, tg, t })) - it
// reads the tab and company from the page (#tabs .on, #seg .on, ?co=) and never changes what the page shows.
// Words: its own table below, ka / ru / en by <html lang> (W-I18N sets it; Georgian until then) - moved to
// mini/i18n/<lang>.json by W-I18N if it wants them there. Design C: zero radius, 3 px frames, no easing (two-frame
// steps), status = a shape plus a word; the page's tokens (--q-*), both themes.
const STR = {
  ka: { open: "💬 შენიშვნა ან იდეა", title: "შენიშვნა", about: "ჩანართი", ph: "რა უნდა შეიცვალოს, რა არ მუშაობს, რა გაკლიათ?", pic: "📎 სურათი (არასავალდებულო)",
    pic_off: "✕ სურათის მოხსნა", send: "გაგზავნა", sending: "იგზავნება…", close: "დახურვა", mine: "ჩემი ბოლო შენიშვნები", all: "ბოლო შენიშვნები",
    none: "ჯერ არცერთი.", ok: "✓ მივიღე — #{id}. ოთარი ნახავს; როცა აშენდება, ჩატში მოგწერთ.", err: "ვერ გაიგზავნა — სცადეთ თავიდან.",
    err_many: "დღეს ბევრი შენიშვნაა — ხვალ სცადეთ.", err_big: "სურათი 2 მბ-ზე დიდია.", err_pic: "ეს სურათი ვერ წავიკითხე — სხვა სცადეთ.",
    pic_cap: "ამ თვის სურათების ლიმიტი ამოიწურა — შენიშვნა სურათის გარეშე წავიდა.", left: "{n} სიმბოლო დარჩა", test: "ტესტი",
    st: { new: "ახალი", seen: "ნანახია", to_build: "ასაშენებელია", built: "აშენდა", dismissed: "არა" } },
  ru: { open: "💬 Замечание или идея", title: "Замечание", about: "Вкладка", ph: "Что изменить, что не работает, чего не хватает?", pic: "📎 Картинка (необязательно)",
    pic_off: "✕ Убрать картинку", send: "Отправить", sending: "Отправляю…", close: "Закрыть", mine: "Мои последние замечания", all: "Последние замечания",
    none: "Пока ни одного.", ok: "✓ Получено — #{id}. Отар посмотрит; когда будет готово, напишу в чат.", err: "Не отправилось — попробуйте ещё раз.",
    err_many: "Сегодня уже много замечаний — попробуйте завтра.", err_big: "Картинка больше 2 МБ.", err_pic: "Не удалось прочитать картинку — попробуйте другую.",
    pic_cap: "Лимит картинок на месяц исчерпан — замечание ушло без картинки.", left: "осталось {n} символов", test: "тест",
    st: { new: "новое", seen: "просмотрено", to_build: "в работе", built: "готово", dismissed: "нет" } },
  en: { open: "💬 A note or an idea", title: "Note", about: "Tab", ph: "What should change, what does not work, what is missing?", pic: "📎 Picture (optional)",
    pic_off: "✕ Remove the picture", send: "Send", sending: "Sending…", close: "Close", mine: "My last notes", all: "Last notes",
    none: "None yet.", ok: "✓ Received — #{id}. Otar will see it; when it is built I will write in the chat.", err: "Not sent — please try again.",
    err_many: "Many notes today already — please try tomorrow.", err_big: "The picture is over 2 MB.", err_pic: "Could not read this picture — try another.",
    pic_cap: "This month's picture limit is used up — the note went without it.", left: "{n} characters left", test: "test",
    st: { new: "new", seen: "seen", to_build: "to build", built: "built", dismissed: "no" } },
};
const SHAPE = { new: "info", seen: "info", to_build: "warn", built: "ok", dismissed: "idle" };
const MAX = 2000;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mt = (s) => String(s).replace(/[ა-ჺჽ-ჿ]/g, (c) => String.fromCodePoint(c.codePointAt(0) + 0x0BC0));   // Mtavruli for labels
const fill = (s, p) => String(s).replace(/\{(\w+)\}/g, (m, k) => (p[k] == null ? "" : String(p[k])));
const when = (s) => { const d = new Date(s); return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

const CSS = `
.fb-bar{margin:8px 0 0;border:3px solid var(--q-rule);background:var(--q-surface)}
.fb-cell{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;border:0;border-radius:0;background:var(--q-surface);color:var(--q-ink);font:700 12px/15px var(--ff);font-stretch:75%;letter-spacing:.06em;cursor:pointer;transition:background-color 90ms var(--step),color 90ms var(--step)}
.fb-cell:active{background:var(--q-surface-2)}
.fb-cell.inv{background:var(--q-invert);color:var(--q-on-invert)}
.fb-cell.inv:active{background:var(--q-ink-2)}
.fb-cell[disabled]{opacity:.55;cursor:default}
.fb-back{position:fixed;inset:0;z-index:40;background:rgba(17,19,18,.42);display:flex;align-items:flex-end;justify-content:center}
.fb-back[hidden]{display:none}
.fb-sheet{width:100%;max-width:560px;max-height:92vh;overflow-y:auto;background:var(--q-surface);border-top:3px solid var(--q-rule);padding:0 12px calc(12px + var(--q-safe-bottom));color:var(--q-ink)}
.fb-h{display:flex;align-items:center;gap:8px;min-height:48px;border-bottom:1.5px solid var(--q-rule)}
.fb-t{flex:1 1 auto;font:800 20px/23px var(--ff);font-stretch:62.5%;letter-spacing:.02em}
.fb-x{flex:none;width:44px;height:44px;border:1.5px solid var(--q-rule);border-radius:0;background:var(--q-surface);color:var(--q-ink);font:700 18px/1 var(--ff);cursor:pointer}
.fb-ctx{font-size:12.5px;line-height:17px;color:var(--q-muted);padding:8px 0 6px}
.fb-ta{display:block;width:100%;min-height:118px;resize:vertical;border:1.5px solid var(--q-rule);border-radius:0;background:var(--q-canvas);color:var(--q-ink);font:400 16px/22px var(--ff);padding:8px 10px}
.fb-ta:focus{outline:2px solid var(--q-focus);outline-offset:0}
.fb-n{font-size:12px;color:var(--q-muted);text-align:right;padding:3px 0 8px}
.fb-row{display:flex;gap:8px;align-items:stretch;margin-bottom:8px}
.fb-row .fb-cell{border:1.5px solid var(--q-rule)}
#fb-thumb{flex:none;display:flex}#fb-thumb[hidden]{display:none}
.fb-thumb{flex:none;width:44px;height:44px;object-fit:cover;border:1.5px solid var(--q-rule)}
.fb-msg{margin:8px 0;padding:8px 10px;font:600 13px/18px var(--ff)}
.fb-msg.ok{background:var(--q-good-bg);color:var(--q-good)}
.fb-msg.bad{background:var(--q-crit-bg);color:var(--q-crit)}
.fb-l{margin-top:12px;border-top:3px solid var(--q-rule)}
.fb-lh{font:600 11.5px/14px var(--ff);font-stretch:75%;letter-spacing:.09em;color:var(--q-muted);padding:10px 0 4px}
.fb-it{padding:8px 0;border-top:1px solid var(--q-rule-light)}
.fb-it:first-of-type{border-top:0}
.fb-it-h{display:flex;align-items:center;gap:8px;font-size:12.5px;line-height:17px;color:var(--q-muted)}
.fb-it-m{font-size:14px;line-height:19px;margin-top:3px;overflow-wrap:anywhere}
.fb-it-n{font-size:12.5px;line-height:17px;color:var(--q-ink-2);margin-top:3px;padding-left:8px;border-left:3px solid var(--q-good)}
.fb-st{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--q-ink)}
`;

let opts = null, lang = "ka", S = STR.ka, picked = null, sending = false;
const $ = (s, r = document) => r.querySelector(s);

// what is on screen: the tab (code + its word) and the company scope
function ctx() {
  const on = $("#tabs .tab.on"), co = $("#seg button.on");
  const tab = on ? on.dataset.t : new URLSearchParams(location.search).get("tab") || "home";
  const label = opts && opts.t ? opts.t("tab." + tab) : on ? on.textContent : tab;
  const company = co ? co.dataset.co : new URLSearchParams(location.search).get("co") || null;
  return { tab, label: label === "tab." + tab ? tab : label, company, coWord: co ? co.textContent.replace(/[◉■]/g, "").trim() : "" };
}
async function call(body) {
  const tg = opts.tg;
  const r = await fetch(opts.api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: tg ? tg.initData : "", ...body }) });
  let b = {}; try { b = await r.json(); } catch (e) { b = {}; }
  return { status: r.status, body: b };
}
function haptic(kind) { const h = opts.tg && opts.tg.HapticFeedback; try { if (h) kind === "tap" ? h.selectionChanged() : h.notificationOccurred(kind); } catch (e) {} }

function drawList(list) {
  const el = $("#fb-list"); if (!el) return;
  const admin = (list || []).some((x) => x.by);
  el.innerHTML = `<div class="fb-lh">${esc(mt(admin ? S.all : S.mine))}</div>` + (!list || !list.length ? `<div class="fb-it"><div class="fb-it-m mut">${esc(S.none)}</div></div>`
    : list.map((x) => `<div class="fb-it"><div class="fb-it-h"><span>#${x.id}</span><span>${esc(when(x.at))}</span><span class="fb-st"><span class="dot ${SHAPE[x.status] || "info"}"></span>${esc(S.st[x.status] || x.status)}</span>${x.test ? `<span>· ${esc(S.test)}</span>` : ""}${x.by ? `<span>· ${esc(x.by)}</span>` : ""}${x.image ? "<span>· 📎</span>" : ""}</div>`
      + `<div class="fb-it-m">${esc(x.message)}</div>${x.status === "built" && x.built_note ? `<div class="fb-it-n">${esc(x.built_note)}</div>` : ""}</div>`).join(""));
}
function say(text, ok) { const el = $("#fb-say"); el.hidden = !text; el.className = "fb-msg " + (ok ? "ok" : "bad"); el.textContent = text || ""; }
function counter() { const ta = $("#fb-ta"), n = MAX - ta.value.length; $("#fb-n").textContent = fill(S.left, { n }); $("#fb-send").disabled = sending || !ta.value.trim(); }

// a picture from the gallery -> a JPEG data: URL ≤ 1600 px and < 1.9 MB (or the file itself when the browser cannot draw it but it is small enough)
async function shrink(file) {
  const asUrl = (blob) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); });
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    for (const q of [0.82, 0.7, 0.55, 0.4]) { const b = await new Promise((ok) => c.toBlob(ok, "image/jpeg", q)); if (b && b.size < 1.9e6) return asUrl(b); }
    return null;
  } catch (e) {
    return /^image\/(jpeg|png|webp)$/.test(file.type) && file.size < 1.9e6 ? asUrl(file) : null;
  }
}
function drawPic() {
  $("#fb-pic").textContent = picked ? S.pic_off : S.pic;
  const th = $("#fb-thumb"); th.hidden = !picked; th.innerHTML = "";
  if (picked) { const im = new Image(); im.className = "fb-thumb"; im.alt = S.pic; im.src = picked; th.appendChild(im); }   // drawn only with a picture
}

async function send() {
  const ta = $("#fb-ta"), message = ta.value.trim(); if (!message || sending) return;
  sending = true; counter(); $("#fb-send").textContent = S.sending; say("");
  const c = ctx();
  try {
    const r = await call({ op: "feedback", message, tab: c.tab, tab_label: c.label, company: c.company, ...(picked ? { image: picked } : {}), platform: opts.tg && opts.tg.platform || "web" });
    if (r.status === 200 && r.body.ok) {
      ta.value = ""; picked = null; drawPic(); haptic("success");
      say(fill(S.ok, { id: r.body.id }) + (r.body.image === "month_cap" ? " " + S.pic_cap : ""), true); drawList(r.body.list);
    } else { haptic("error"); say(r.status === 429 ? S.err_many : r.body.error === "image_too_big" ? S.err_big : r.body.error === "bad_image" ? S.err_pic : S.err, false); }
  } catch (e) { haptic("error"); say(S.err, false); }
  sending = false; $("#fb-send").textContent = S.send; counter();
}

function close() {
  $("#fb-back").hidden = true; document.body.style.overflow = "";
  const bb = opts.tg && opts.tg.BackButton; if (bb) { try { bb.offClick(close); bb.hide(); } catch (e) {} }
  $("#fb-open").focus();
}
async function open() {
  haptic("tap");
  lang = STR[document.documentElement.lang] ? document.documentElement.lang : "ka"; S = STR[lang];
  const c = ctx();
  $("#fb-title").textContent = mt(S.title); $("#fb-x").setAttribute("aria-label", S.close);
  $("#fb-ctx").textContent = `${S.about}: ${c.label}${c.coWord ? " · " + c.coWord : ""}`;
  $("#fb-ta").placeholder = S.ph; $("#fb-send").textContent = S.send; drawPic(); counter(); say("");
  $("#fb-back").hidden = false; document.body.style.overflow = "hidden";
  const bb = opts.tg && opts.tg.BackButton; if (bb) { try { bb.onClick(close); bb.show(); } catch (e) {} }
  $("#fb-ta").focus();
  try { const r = await call({ op: "feedback_list" }); if (r.status === 200) drawList(r.body.list); } catch (e) {}
}

// W-I18N: the page switched its language (<html lang>): the 💬 button in the new words (an open sheet takes them on its
// next open)
export function relabel() {
  if (!opts) return;
  lang = STR[document.documentElement.lang] ? document.documentElement.lang : "ka"; S = STR[lang];
  const b = $("#fb-open"); if (b) b.textContent = mt(S.open);
}

export function mount(o) {
  if (opts || !o || !o.api) return;
  opts = o; lang = STR[document.documentElement.lang] ? document.documentElement.lang : "ka"; S = STR[lang];
  const st = document.createElement("style"); st.id = "fb-css"; st.textContent = CSS; document.head.appendChild(st);
  const bar = document.createElement("div"); bar.className = "fb-bar";
  bar.innerHTML = `<button class="fb-cell" id="fb-open" type="button">${esc(mt(S.open))}</button>`;
  const foot = $("#foot"); foot.parentNode.insertBefore(bar, foot);
  const back = document.createElement("div"); back.className = "fb-back"; back.id = "fb-back"; back.hidden = true;
  back.innerHTML = `<div class="fb-sheet" role="dialog" aria-modal="true" aria-labelledby="fb-title">
    <div class="fb-h"><div class="fb-t" id="fb-title"></div><button class="fb-x" id="fb-x" type="button">✕</button></div>
    <div class="fb-ctx" id="fb-ctx"></div>
    <textarea class="fb-ta" id="fb-ta" maxlength="${MAX}" rows="5"></textarea><div class="fb-n" id="fb-n"></div>
    <div class="fb-row"><span id="fb-thumb" hidden></span><button class="fb-cell" id="fb-pic" type="button"></button>
      <input type="file" id="fb-file" accept="image/*" hidden></div>
    <button class="fb-cell inv" id="fb-send" type="button" disabled></button>
    <div class="fb-msg" id="fb-say" hidden aria-live="polite"></div>
    <div class="fb-l" id="fb-list"></div></div>`;
  document.body.appendChild(back);
  $("#fb-open").addEventListener("click", open);
  $("#fb-x").addEventListener("click", close);
  back.addEventListener("click", (e) => { if (e.target === back) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !back.hidden) close(); });
  $("#fb-ta").addEventListener("input", counter);
  $("#fb-send").addEventListener("click", send);
  $("#fb-pic").addEventListener("click", () => { if (picked) { picked = null; drawPic(); return; } $("#fb-file").click(); });
  $("#fb-file").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    if (f.size > 25e6) return say(S.err_big, false);
    const url = await shrink(f); if (!url) return say(S.err_pic, false);
    picked = url; drawPic(); say("");
  });
}

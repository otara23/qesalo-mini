// The panel updates itself (wave W-RT realtime, plans/bot-v3.md §2.3, Otar's item 14 „All tabs and views should
// automatically update upon new information", 9.11.2026). mini/app.js creates one of these and tells it every answer.
//
//  * The socket: Supabase Realtime (the Phoenix protocol, JSON v1.0.0) on `surface_versions` only - the one table the
//    public anon key may read (schema/029). Every table a tab reads bumps that tab's row by statement triggers (029 +
//    039: the tab -> tables map). The address and key come in the function's answer (`live`); a page without them polls.
//  * A version of the tab on screen grew -> the open tab is asked again, quietly (no skeleton, scroll and open rows kept,
//    the view's own filters through its params() hook), with `since` = the versions on screen: the function answers
//    { unchanged } cheaply when nothing it reads moved. Another tab's bump is ignored; it loads fresh when tapped.
//    Only checked_at moved (the minute bank re-read: nothing changed) -> the header's time moves, nothing is asked.
//  * Debounce: the first bump waits DEBOUNCE, later bumps join it, two automatic asks are never closer than MIN_GAP, and
//    one ask at a time (a tap owns the sheet: app.js's sequence guard drops an older answer).
//  * Socket down (closed, refused, no heartbeat reply, the subscription refused): reconnect with back-off, and meanwhile
//    ask with `since` every POLL. Back up -> one catch-up ask (bumps in the gap were not seen). While live, a safety ask
//    every SAFETY.
//  * Hidden (visibilitychange, Telegram's deactivated): socket closed, nothing asked, no timers. Visible again: reconnect,
//    one catch-up ask, the tripwire.
//  * Tripwire: a published page knows its version (?v= on its modules, deploy/pages-publish.mjs); every TRIP and on wake
//    it fetches version.json and, when the site serves another version, reloads - same tab, company and the view's
//    filters (app.js keeps them) - but never while the person is typing.
// Counters for tests and the doctor: window.__qesaloLive (events, refetches, polls, reconnects, state).

export const CFG = { DEBOUNCE: 1200, MIN_GAP: 3000, POLL: 30e3, TICK: 5e3, HEARTBEAT: 20e3, HB_WAIT: 10e3, SAFETY: 300e3, TRIP: 600e3,
  BACKOFF: [1e3, 2e3, 5e3, 10e3, 20e3, 30e3] };
const TOPIC = "realtime:qesalo-surfaces";

// is this surface_versions row news for the sheet on screen? seen = { tab, v: { company: version } } of the last answer
export function verdict(rec, seen) {
  if (!rec || !seen || rec.surface !== seen.tab || !Object.prototype.hasOwnProperty.call(seen.v || {}, rec.company)) return null;
  return Number(rec.version) > Number(seen.v[rec.company]) ? "refetch" : "checked";
}
// how long a bump waits: at least DEBOUNCE, and never sooner than MIN_GAP after the last automatic ask
export const delayFor = (now, lastRun, c = CFG) => Math.max(c.DEBOUNCE, lastRun + c.MIN_GAP - now);

// the Phoenix socket: start({ url, key, companies }) / stop(); on.state('connecting'|'live'|'down'), on.row(record)
export function socket(on, env = {}) {
  const W = env.WebSocket || globalThis.WebSocket, c = env.cfg || CFG;
  let ws = null, want = null, ref = 0, joinRef = null, hbRef = null, hbT = null, hbWaitT = null, retryT = null, retry = 0, mine = false;
  const send = (m) => { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); } catch (e) {} };
  const stopBeat = () => { clearInterval(hbT); clearTimeout(hbWaitT); hbT = hbWaitT = null; };
  function kill() { stopBeat(); if (ws) { const w = ws; ws = null; try { w.onclose = w.onmessage = w.onerror = null; w.close(); } catch (e) {} } }
  function later() { kill(); on.state("down"); if (!want || mine) return; clearTimeout(retryT); retryT = setTimeout(open, c.BACKOFF[Math.min(retry++, c.BACKOFF.length - 1)]); }
  function open() {
    clearTimeout(retryT); retryT = null; kill(); if (!want || mine) return;
    on.state("connecting");
    try { ws = new W(want.url.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(want.key) + "&vsn=1.0.0"); } catch (e) { return later(); }
    ws.onopen = () => {
      joinRef = String(++ref);
      send({ topic: TOPIC, event: "phx_join", ref: joinRef, join_ref: joinRef, payload: { access_token: want.key, config: { broadcast: { ack: false, self: false }, presence: { key: "" }, private: false,
        postgres_changes: [{ event: "*", schema: "public", table: "surface_versions", filter: "company=in.(" + want.companies.join(",") + ")" }] } } });
      hbT = setInterval(() => {
        if (hbWaitT) return later();                       // the last heartbeat got no answer: the socket is dead
        hbRef = String(++ref); send({ topic: "phoenix", event: "heartbeat", payload: {}, ref: hbRef });
        hbWaitT = setTimeout(later, c.HB_WAIT);
      }, c.HEARTBEAT);
    };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.event === "phx_reply" && m.ref === hbRef) { clearTimeout(hbWaitT); hbWaitT = null; return; }
      if (m.event === "phx_reply" && m.ref === joinRef) { if (m.payload && m.payload.status === "ok") { retry = 0; on.state("live"); } else later(); return; }
      if (m.topic !== TOPIC) return;
      if (m.event === "system" && m.payload && m.payload.status && m.payload.status !== "ok") return later();   // the database side refused
      if (m.event === "phx_error" || m.event === "phx_close") return later();
      if (m.event === "postgres_changes") { const r = m.payload && m.payload.data && m.payload.data.record; if (r) on.row(r); }
    };
    ws.onclose = () => { ws = null; later(); };
    ws.onerror = () => {};                                    // onclose follows
  }
  return {
    start(cfg) {
      mine = false;
      const same = want && cfg && want.url === cfg.url && want.key === cfg.key && want.companies.join() === cfg.companies.join();
      want = cfg; if (!same || !ws) open();
    },
    stop() { mine = true; clearTimeout(retryT); retryT = null; kill(); },
    get open() { return !!ws; },
  };
}

// o = { refetch() -> Promise (app.js: the open tab, quietly, with since), busy() -> bool (a load is in flight),
//       checked(iso, row) (only checked_at moved: the header's time), state(s) ('live' | 'poll' | 'off'), version (the page's
//       own ?v, null on a local copy), reload() (keep tab + company + filters, then reload), typing() -> bool }
export function createLive(o, env = {}) {
  const c = env.cfg || CFG, win = env.window || globalThis, doc = env.document || win.document, now = env.now || (() => Date.now());
  const stats = { events: 0, refetches: 0, polls: 0, reconnects: 0, checked: 0, state: "off", last: null };
  let seen = null, cfg = null, sockState = "down", visible = !doc || doc.visibilityState !== "hidden", timer = null, tick = null;
  let lastRun = 0, lastAsk = 0, lastTrip = 0, wasDown = false;
  const show = () => { const s = !visible || !seen ? "off" : sockState === "live" ? "live" : "poll"; if (s !== stats.state) { stats.state = s; try { o.state(s); } catch (e) {} } };
  const sock = socket({
    state(s) {
      if (s === "live" && wasDown && seen && now() - lastAsk > 2000) { stats.reconnects++; ask("rejoin"); }   // bumps in the gap
      if (s === "live") wasDown = false; else if (s === "down") wasDown = true;
      sockState = s; show();
    },
    row(r) {
      stats.events++; stats.last = r;
      const v = verdict(r, seen);
      if (v === "refetch") schedule();
      else if (v === "checked" && r.checked_at) { stats.checked++; try { o.checked(r.checked_at, r); } catch (e) {} }
    },
  }, env);
  function ask(why) {
    if (!visible) return;
    if (o.busy()) { clearTimeout(timer); timer = setTimeout(() => { timer = null; ask(why); }, 500); return; }
    lastRun = lastAsk = now();
    if (why === "poll") stats.polls++; else stats.refetches++;
    Promise.resolve().then(() => o.refetch(why)).catch(() => {});
  }
  function schedule() {
    if (!visible || timer) return;
    timer = setTimeout(() => { timer = null; ask("bump"); }, delayFor(now(), lastRun, c));
  }
  async function trip() {
    if (!o.version || !visible) return;
    lastTrip = now();
    try {
      const r = await fetch("version.json?t=" + now(), { cache: "no-store" });
      const j = r.ok ? await r.json() : null;
      if (j && j.version && j.version !== o.version) { if (o.typing && o.typing()) lastTrip = now() - c.TRIP + 60e3; else o.reload(); }
    } catch (e) {}
  }
  function onTick() {
    if (!visible) return;
    const t = now();
    if (seen && sockState !== "live" && t - lastAsk >= c.POLL && !timer) ask("poll");
    else if (seen && sockState === "live" && t - lastAsk >= c.SAFETY && !timer) ask("safety");
    if (o.version && t - lastTrip >= c.TRIP) trip();
  }
  function wake() {
    if (visible) return; visible = true; show();
    if (cfg) sock.start(cfg);
    clearInterval(tick); tick = setInterval(onTick, c.TICK);
    if (seen) ask("wake");
    trip();
  }
  function sleep() {
    if (!visible) return; visible = false;
    sock.stop(); clearTimeout(timer); timer = null; clearInterval(tick); tick = null; wasDown = true; show();
  }
  if (doc && doc.addEventListener) doc.addEventListener("visibilitychange", () => (doc.visibilityState === "hidden" ? sleep() : wake()));
  const TG = win.Telegram && win.Telegram.WebApp;
  if (TG && TG.onEvent) { try { TG.onEvent("deactivated", sleep); TG.onEvent("activated", wake); } catch (e) {} }
  if (visible) tick = setInterval(onTick, c.TICK);
  try { win.__qesaloLive = stats; } catch (e) {}
  return {
    // every answer of the function for the open tab (full or unchanged): what is on screen now, and the socket's config
    seen(b) {
      if (!b || !b.tab) return;
      lastAsk = now();
      const L = b.live || {};
      seen = { tab: b.tab, v: L.v || {}, who: L.who || null };
      const next = L.url && L.key && (L.companies || []).length ? { url: L.url, key: L.key, companies: L.companies.slice().sort() } : null;
      if (next && (!cfg || next.url !== cfg.url || next.key !== cfg.key || next.companies.join() !== cfg.companies.join())) { cfg = next; if (visible) sock.start(cfg); }
      if (!next && cfg) { cfg = null; sock.stop(); sockState = "down"; }
      show();
    },
    // what to send as `since` when asking for this tab again (null = the sheet on screen is another tab's)
    since(tab) { return seen && seen.tab === tab && seen.who ? { v: seen.v, who: seen.who } : null; },
    stats,
  };
}

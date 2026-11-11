// რუკა · სატელიტი (maptab M2, plans/map-tab.md §5.4): the same drawing as views/map.js on NAPR's orthophoto, loaded only
// when the სატელიტი cell is pressed (map.js imports this file lazily; nothing of it is in the default path).
// Leaflet 1.9.4 from cdnjs, the script and its CSS injected once with SRI (sha384 below, recorded in tests/map/sat.test.mjs)
// and crossorigin; NAPR orthophoto tiles (nt0.napr.gov.ge NGCache, ORTHO_GEORGIA_4: maxNativeZoom 18, maxZoom 19), never
// pre-fetched or stored, the page's own Referer; the attribution lives in map.js's title block (attributionControl off).
// The features as GeoJSON on Leaflet's SVG renderer with one className per kind (a --q-surface halo under every ink line,
// so a line reads on imagery); names as boxed permanent labels (.mp-lab); pinch-zoom and two boxed 44 px
// cells „+ −"; Telegram's swipe-to-close off while this view is on (Telegram.WebApp.disableVerticalSwipes) and back on
// when it goes. Leaflet's panes (z-index 200-800) stay inside the sheet: map.js gives .mp-sheet its own stacking context
// (isolation, uifix 11.11 - they had painted over the panel's tab bar and header). Tile failures: after 6 errors the note „ორთოფოტო ამჟამად მიუწვდომელია" and the lines stay on the paper.
// NDVI (the farm): L.imageOverlay of the function's PNG in its own pane, above the imagery, below the lines.
import { t, esc } from "../ui.js?v=80ca9ef.202611111239";

const L_ = (k, p) => t("map." + k, p);
export const LEAFLET = {
  js: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
  js_sri: "sha384-NElt3Op+9NBMCYaef5HxeJmU4Xeard/Lku8ek6hoPTvYkQPh3zLIrJP7KiRocsxO",
  css: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  css_sri: "sha384-c6Rcwz4e4CITMbu/NBmnNS8yN2sC3cUElMEMfP3vqqKFp7GOYaaBBCqmaWBjmkjb",
};
export const NAPR_TILES = "https://nt0.napr.gov.ge/NGCache?x={x}&y={y}&z={z}&l=ORTHO_GEORGIA_4";
export const FAIL_AFTER = 6;

let loading = null;
export function loadLeaflet() {
  if (typeof window !== "undefined" && window.L && window.L.map) return Promise.resolve(window.L);
  if (loading) return loading;
  loading = new Promise((ok, no) => {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = LEAFLET.css; css.integrity = LEAFLET.css_sri; css.crossOrigin = "anonymous";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = LEAFLET.js; s.integrity = LEAFLET.js_sri; s.crossOrigin = "anonymous"; s.async = true;
    s.onload = () => (window.L ? ok(window.L) : no(new Error("leaflet")));
    s.onerror = () => { loading = null; no(new Error("leaflet")); };
    document.head.appendChild(s);
  });
  return loading;
}

// the map of each company's container, its last view (kept across the live refresh and the sheet switch)
const MAPS = {};
const VIEW = {};
const tg = () => (typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp) || null;
function swipes(on) { const w = tg(); try { if (w) (on ? w.enableVerticalSwipes : w.disableVerticalSwipes) && (on ? w.enableVerticalSwipes() : w.disableVerticalSwipes()); } catch (e) {} }
const LINE_KINDS = ["parcel", "lease", "servitude", "building", "greenhouse", "tank", "solar", "yard", "road", "river", "canal", "district", "country"];

// draw into el (a .mp-sat cell): { co, d, sheet: { bbox, site, id }, lang, ndvi: bool, onTap(id) }
export async function draw(el, o) {
  css();
  const L = await loadLeaflet();
  const prev = MAPS[o.co];
  if (prev) { try { VIEW[o.co + ":" + o.sheet.id] = { c: prev.map.getCenter(), z: prev.map.getZoom() }; prev.map.remove(); } catch (e) {} }
  el.innerHTML = "";
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // the main company's land (≈ 330 m) fits a phone only between two zoom steps: quarter steps there (uifix)
  const land = o.sheet.site === "krtsanisi";
  const map = L.map(el, { zoomControl: false, attributionControl: false, zoomAnimation: !reduced, fadeAnimation: !reduced, markerZoomAnimation: !reduced,
    preferCanvas: false, tap: true, maxZoom: 19, minZoom: 6, zoomSnap: land ? 0.25 : 1 });
  MAPS[o.co] = { map, el };
  let errors = 0, loaded = 0, noted = false;
  const tiles = L.tileLayer(NAPR_TILES, { maxZoom: 19, maxNativeZoom: 18, detectRetina: false, keepBuffer: 1 });
  const note = () => { if (noted) return; noted = true; el.classList.add("mp-nophoto"); const n = el.parentNode && el.parentNode.querySelector(".mp-satnote"); if (n) n.hidden = false; };
  // 6 failed tiles, or a first view whose every tile failed (a phone screen holds fewer than 6 at the farm's zoom)
  tiles.on("tileload", () => { loaded++; });
  tiles.on("tileerror", () => { errors++; if (errors >= FAIL_AFTER) note(); });
  tiles.on("load", () => { if (!loaded && errors) note(); });
  tiles.addTo(map);
  // NDVI below the lines
  map.createPane("ndvi"); map.getPane("ndvi").style.zIndex = 350;
  const im = o.d.ndvi && o.d.ndvi.image;
  if (o.ndvi && im && im.png_b64 && im.bbox) {
    const [w, s, e, n] = im.bbox;
    L.imageOverlay("data:image/png;base64," + im.png_b64, [[s, w], [n, e]], { pane: "ndvi", opacity: 0.78, className: "mp-ndvi-img", interactive: false }).addTo(map);
  }
  const parcelCrops = new Set(o.d.features.filter((f) => f.kind === "parcel" && f.crop).map((f) => f.crop));
  // on the photo: no fence line (it runs on the parcels' edges) and no block that only repeats its parcel (the orchards)
  const feats = o.d.features.filter((f) => f.site === o.sheet.site && f.kind !== "fence" && !(f.kind === "block" && parcelCrops.has(f.crop)));
  const fc = { type: "FeatureCollection", features: feats.map((f) => ({ type: "Feature", id: f.id, properties: f, geometry: f.geom })) };
  const cls = (f) => `mp-g ${f.kind}${f.status === "planned" ? " pln" : ""}${f.id === o.sel ? " sel" : ""}`;
  // the halo first (under every line), then the ink
  L.geoJSON(fc, { interactive: false, filter: (f) => LINE_KINDS.includes(f.properties.kind), style: () => ({ className: "mp-halo" }) }).addTo(map);
  const layer = L.geoJSON(fc, {
    style: (f) => ({ className: cls(f.properties) }),
    pointToLayer: (f, ll) => L.circleMarker(ll, { radius: f.properties.kind === "camera" ? 4 : 6, className: cls(f.properties) }),
    onEachFeature: (f, l) => {
      const p = f.properties, nm = (p.names && (p.names[o.lang] || p.names.ru || p.names.en || p.names.ka)) || "";
      // as on the plan: a name where it fitted there, else its number in the legend
      if (o.nums && o.nums.has(p.id)) l.bindTooltip(String(o.nums.get(p.id)), { permanent: true, direction: "center", className: "mp-lab mp-num", opacity: 1 });
      else if ((["parcel", "lease", "district"].includes(p.kind) && !(land && p.kind === "parcel")) || (p.kind === "block" && o.sheet.id === "yard"))
        l.bindTooltip(esc(nm.split(" · ")[0]), { permanent: true, direction: "center", className: "mp-lab", opacity: 1 });
      l.on("click", () => o.onTap && o.onTap(p.id));
    },
  }).addTo(map);
  // the day's marks (map.ts marksOf) as small boxed signs
  for (const f of feats) {
    const m = o.marks && o.marks[f.id];
    if (!m) continue;
    const c = layer.getLayers().find((l) => l.feature && l.feature.id === f.id);
    if (!c || !c.getBounds) continue;
    L.marker(c.getBounds().getCenter(), { interactive: false, icon: L.divIcon({ className: "mp-mk", html: `<i class="dot ${m.lv}"></i>`, iconSize: [18, 18] }) }).addTo(map);
  }
  const keep = VIEW[o.co + ":" + o.sheet.id];
  const [w, s, e, n] = o.sheet.bbox;
  if (keep) map.setView(keep.c, keep.z, { animate: false });
  else map.fitBounds([[s, w], [n, e]], { padding: [12, 12], animate: false });
  map.on("moveend", () => { VIEW[o.co + ":" + o.sheet.id] = { c: map.getCenter(), z: map.getZoom() }; });
  // + − as boxed cells
  const z = document.createElement("div");
  z.className = "mp-zoom";
  z.innerHTML = `<button type="button" data-z="1" aria-label="${esc(L_("zoom_in"))}">+</button><button type="button" data-z="-1" aria-label="${esc(L_("zoom_out"))}">−</button>`;
  z.addEventListener("click", (ev) => { const b = ev.target.closest("[data-z]"); if (b) { ev.stopPropagation(); map.setZoom(map.getZoom() + Number(b.dataset.z)); } });
  L.DomEvent.disableClickPropagation(z);
  el.appendChild(z);
  swipes(false);
  // the view goes (the plan cell, another tab, the company switch): swipes back on, the map freed
  const view = document.getElementById("view") || document.body;
  const mo = new MutationObserver(() => { if (!el.isConnected) { mo.disconnect(); try { map.remove(); } catch (x) {} if (MAPS[o.co] && MAPS[o.co].map === map) delete MAPS[o.co]; if (!Object.keys(MAPS).length) swipes(true); } });
  mo.observe(view, { childList: true, subtree: true });
  return map;
}
export function leave(co) {
  const m = MAPS[co];
  if (m) { try { m.map.remove(); } catch (e) {} delete MAPS[co]; }
  if (!Object.keys(MAPS).length) swipes(true);
}

function css() {
  if (typeof document === "undefined" || document.getElementById("mps-css")) return;
  const st = document.createElement("style"); st.id = "mps-css";
  st.textContent = `
.mp-sat{background:var(--q-surface-2)}.mp-sat.leaflet-container,.mp-sat .leaflet-container{background:var(--q-surface-2);font:inherit}
.mp-sat{isolation:isolate;z-index:0}.mp-sat *,.mp-sat .leaflet-tooltip{border-radius:0!important;box-shadow:none!important}
.mp-sat .leaflet-tooltip::before{display:none}
.mp-sat .mp-halo{fill:none;stroke:var(--q-surface);stroke-width:3.2;stroke-opacity:.85}
.mp-sat .mp-g{fill:none;stroke:var(--q-ink);stroke-width:1.5}.mp-sat .mp-g.parcel{stroke-width:2}.mp-sat .mp-g.lease,.mp-sat .mp-g.pln{stroke-dasharray:6 4}
.mp-sat .mp-g.servitude{stroke-dasharray:2 3}.mp-sat .mp-g.block{stroke-dasharray:1 3;stroke-width:2}.mp-sat .mp-g.building{fill:var(--q-ink);fill-opacity:.55}
.mp-sat .mp-g.river,.mp-sat .mp-g.canal{stroke:var(--q-info)}.mp-sat .mp-g.well,.mp-sat .mp-g.camera{fill:var(--q-surface);fill-opacity:1}.mp-sat .mp-g.sel{stroke:var(--q-accent);stroke-width:3}
.mp-sat .leaflet-tooltip.mp-lab{background:var(--q-surface);color:var(--q-ink);border:1px solid var(--q-rule);padding:1px 4px;font:600 11px/14px var(--ff);white-space:nowrap}
.mp-sat .leaflet-tooltip.mp-lab.mp-num{background:var(--q-invert);color:var(--q-on-invert);border-color:var(--q-surface);font-weight:800;padding:0 4px}
.mp-mk{display:flex;align-items:center;justify-content:center;background:var(--q-surface);border:1px solid var(--q-rule)}.mp-mk .dot{transform:scale(.8)}.mp-mk .dot.bad{transform:rotate(45deg) scale(.6)}.mp-mk .dot.ok{transform:rotate(45deg) scale(.8)}
.mp-zoom{position:absolute;right:8px;bottom:8px;z-index:800;display:flex;flex-direction:column;border:3px solid var(--q-rule);background:var(--q-surface)}
.mp-zoom button{width:44px;height:44px;border:0;border-radius:0;background:var(--q-surface);color:var(--q-ink);font:800 20px/1 var(--ff);cursor:pointer}.mp-zoom button+button{border-top:1.5px solid var(--q-rule)}
.mp-satnote{padding:6px 10px;border:1.5px solid var(--q-rule);border-top:0;background:var(--q-warn-bg);color:var(--q-warn);font:600 12.5px/17px var(--ff)}
.mp-chip{display:inline-block;margin:8px 0 6px;padding:3px 8px;border:1.5px solid var(--q-rule);font:600 12px/16px var(--ff)}
.mp-ramp{display:flex;align-items:flex-start;gap:0;padding-bottom:18px;font-size:11.5px;line-height:14px;color:var(--q-ink-2)}.mp-ramp span{padding:0 6px}.mp-rb{position:relative;flex:1 1 auto;display:flex}.mp-ramp i{flex:1 1 0;height:14px;border:1px solid var(--q-rule)}.mp-ramp i+i{border-left:0}.mp-rb b{position:absolute;top:16px;transform:translateX(-50%);font-weight:600;color:var(--q-muted)}
/* the NDVI ramp = kbtools/ndvi.py RAMP (the PNG is painted with these; a field layer with its legend, fixed by the image, not a theme colour) */
.mp-ramp .r1{background:#A5602A}.mp-ramp .r2{background:#D9B36A}.mp-ramp .r3{background:#E8E6A0}.mp-ramp .r4{background:#8CC265}.mp-ramp .r5{background:#2E7D32}
.mp-ndvi-none{margin:8px 0 4px;font-size:12.5px;line-height:17px;color:var(--q-muted)}
`;
  document.head.appendChild(st);
}

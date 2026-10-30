/* Map: Leaflet + OpenStreetMap tiles. Pins colored by category; tap → detail sheet.
   Expects WSP.locations (array of Location objects) and the id of the city to open on. */
window.WSP = window.WSP || {};
WSP.map = (function () {
  const CATS = {
    'panic':     { label: 'Panic',        glyph: 'P' },
    'music':     { label: 'Music',        glyph: '♫' },
    'food':      { label: 'Food',         glyph: 'F' },
    'drink':     { label: 'Drinks',       glyph: 'D' },
    'art':       { label: 'Art',          glyph: 'A' },
    'halloween': { label: 'Halloween and All Saints', glyph: 'H' },
    'hotel':     { label: 'Your hotel',   glyph: '★' },
  };
  /* New Orleans: the map opens on the hotel and the Quarter, the chips fly farther out */
  const CITY_VIEWS = { home: [29.9455, -90.0670, 15], all: [29.955, -90.075, 13], quarter: [29.955, -90.066, 15], uptown: [29.935, -90.105, 13], lake: [30.0, -90.06, 12] };
  let map, miniMap, layerByCat = {}, markersById = {}, active = new Set(Object.keys(CATS)), youMarker;

  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  function pinIcon(cat) {
    const c = cssVar(`--wsp-cat-${cat}`) || '#666', ink = cssVar(`--wsp-cat-${cat}-ink`) || '#fff';
    return L.divIcon({ className: '', html: `<div class="pin" style="--c:${c};--ink:${ink}"><span>${(CATS[cat] || {}).glyph || '●'}</span></div>`, iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] });
  }

  function init(locations, cityId) {
    const el = document.getElementById('leaflet-map'); if (!el || typeof L === 'undefined') return;
    const v = CITY_VIEWS[cityId] || CITY_VIEWS.all;
    map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([v[0], v[1]], v[2]);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const cityBar = document.getElementById('map-cities');
    if (cityBar) {
      const set = (id) => cityBar.querySelectorAll('[data-city]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.city === id)));
      set(CITY_VIEWS[cityId] ? cityId : 'all');
      cityBar.addEventListener('click', (e) => { const b = e.target.closest('[data-city]'); if (!b) return; const w = CITY_VIEWS[b.dataset.city]; if (!w) return; set(b.dataset.city); map.closePopup(); map.flyTo([w[0], w[1]], w[2], { duration: .8 }); });
    }

    Object.keys(CATS).forEach(c => { layerByCat[c] = L.layerGroup().addTo(map); });
    locations.forEach(loc => {
      if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return;
      const cat = CATS[loc.category] ? loc.category : 'nature';
      const m = L.marker([loc.lat, loc.lng], { icon: pinIcon(cat), title: loc.name, keyboard: false });
      m.bindPopup(`<b>${esc(loc.name)}</b><br>${esc(loc.blurb ? loc.blurb.slice(0, 110) + (loc.blurb.length > 110 ? '…' : '') : '')}<br>${cat === 'airport' ? '' : `<a href="#" data-open="${esc(loc.id)}">Details</a> · `}<a href="${esc(loc.gmaps_url || gmapsFallback(loc))}" target="_blank" rel="noopener">Maps</a>`);
      m.on('popupopen', (e) => { const a = e.popup.getElement().querySelector('[data-open]'); if (a) a.addEventListener('click', (ev) => { ev.preventDefault(); WSP.sheet.openLocation(loc); }); });
      m.addTo(layerByCat[cat]); markersById[loc.id] = m;
    });

    renderFilters(locations);
    const btn = document.getElementById('locate-btn'); if (btn) btn.addEventListener('click', locate);
    setTimeout(() => map.invalidateSize(), 300);
  }

  /* the walks: the street path in its own color, numbered stops, a chip to show each one */
  const walkLayers = {};
  function walks(W) {
    if (!map || !W) return;
    const wrap = document.getElementById('map-walks');
    const COL = { fri: cssVar('--wsp-teal-60') || '#5f3494', sat: cssVar('--wsp-green-60') || '#2d5f38' };
    const NAME = { fri: 'Friday walk', sat: 'Saturday walk' };
    Object.keys(W).forEach(k => {
      const w = W[k]; if (!w.path || w.path.length < 2) return;
      const g = L.layerGroup();
      L.polyline(w.path, { color: '#fff', weight: 10, opacity: .9 }).addTo(g);
      L.polyline(w.path, { color: COL[k], weight: 6, opacity: .95 }).addTo(g);
      L.marker(w.path[0], { icon: L.divIcon({ className: '', html: `<div class="walk-pin walk-pin--start" style="--c:${COL[k]}">★</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }), title: 'Your hotel', keyboard: false }).addTo(g).bindPopup('<b>Your hotel</b><br>Start and end here');
      w.stops.forEach((s, i) => { if (typeof s.lat !== 'number' || !s.place) return;
        L.marker([s.lat, s.lng], { icon: L.divIcon({ className: '', html: `<div class="walk-pin" style="--c:${COL[k]}">${i + 1}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }), title: s.name, keyboard: false, zIndexOffset: 500 })
          .addTo(g).bindPopup(`<b>${i + 1}. ${esc(s.name)}</b>${s.time ? `<br>${esc(s.time)}` : ''}<br><a href="#" data-open="${esc(s.place)}">Details</a>`)
          .on('popupopen', (e) => { const a = e.popup.getElement().querySelector('[data-open]'); if (a) a.addEventListener('click', (ev) => { ev.preventDefault(); WSP.sheet.openLocation({ id: s.place }); }); }); });
      g.addTo(map); walkLayers[k] = { g, bounds: L.latLngBounds(w.path).pad(.15) };
    });
    if (wrap) {
      wrap.innerHTML = Object.keys(walkLayers).map(k => `<button class="chip" type="button" data-walk="${k}" aria-pressed="true"><span class="dot" style="--c:${COL[k]}"></span>${NAME[k]}${W[k].miles ? ` <span class="muted num">${W[k].miles} mi</span>` : ''}</button>`).join('');
      wrap.addEventListener('click', (e) => { const b = e.target.closest('[data-walk]'); if (!b) return; const k = b.dataset.walk, on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(on)); if (on) { walkLayers[k].g.addTo(map); map.flyToBounds(walkLayers[k].bounds, { duration: .8 }); } else map.removeLayer(walkLayers[k].g); });
    }
  }
  /* from a walk card: open the map, show that walk, frame it */
  function showWalk(k) {
    const w = walkLayers[k]; if (!w || !map) return;
    if (WSP.shell) { WSP.shell.go && WSP.shell.go('map', { scroll: false }); WSP.shell.setOpen('map', true); WSP.shell.lockMap && WSP.shell.lockMap(false); }
    /* just this walk: the other walk and the category pins step aside ("All" brings the pins back) */
    Object.keys(walkLayers).forEach(x => { const on = x === k; if (on) walkLayers[x].g.addTo(map); else map.removeLayer(walkLayers[x].g); const c = document.querySelector(`[data-walk="${x}"]`); if (c) c.setAttribute('aria-pressed', String(on)); });
    active = new Set(); Object.keys(layerByCat).forEach(c => map.removeLayer(layerByCat[c]));
    document.querySelectorAll('#map-filters [data-cat]').forEach(x => x.setAttribute('aria-pressed', 'false'));
    setTimeout(() => { map.getContainer().scrollIntoView({ behavior: WSP.motion ? WSP.motion() : 'smooth', block: 'center' }); }, 120);
    setTimeout(() => { map.invalidateSize(); map.fitBounds(w.bounds); }, 250);
  }

  function renderFilters(locations) {
    const wrap = document.getElementById('map-filters'); if (!wrap) return;
    const counts = {}; locations.forEach(l => { const c = CATS[l.category] ? l.category : 'nature'; counts[c] = (counts[c] || 0) + 1; });
    wrap.innerHTML = `<button class="chip" data-cat="*" aria-pressed="true">All</button>` + Object.keys(CATS).filter(c => counts[c]).map(c =>
      `<button class="chip" data-cat="${c}" aria-pressed="true"><span class="dot" style="--c:var(--wsp-cat-${c})"></span>${CATS[c].label} <span class="muted num">${counts[c]}</span></button>`).join('');
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      const cat = b.dataset.cat;
      if (cat === '*') { active = new Set(Object.keys(CATS)); }
      else if (active.size === Object.keys(CATS).length) { active = new Set([cat]); } // first narrowing: solo
      else if (active.has(cat)) { active.delete(cat); if (!active.size) active = new Set(Object.keys(CATS)); }
      else active.add(cat);
      wrap.querySelectorAll('[data-cat]').forEach(x => x.setAttribute('aria-pressed', x.dataset.cat === '*' ? String(active.size === Object.keys(CATS).length) : String(active.has(x.dataset.cat))));
      Object.keys(layerByCat).forEach(c => { if (active.has(c)) layerByCat[c].addTo(map); else map.removeLayer(layerByCat[c]); });
    });
  }

  function focus(id) {
    const m = markersById[id]; if (!m || !map) return;
    if (WSP.shell) { WSP.shell.setOpen('map', true); WSP.shell.lockMap(false); }
    setTimeout(() => { const el = document.getElementById('map'); const canvas = map.getContainer(); canvas.scrollIntoView({ behavior: WSP.motion ? WSP.motion() : 'smooth', block: 'center' }); el.tabIndex = -1; el.focus({ preventScroll: true }); }, 80);   /* review 11: the map itself, centered, so the pin and its popup are in view on a short phone */   /* review 8: after the card opens, so nothing cancels the scroll; focus follows */
    setTimeout(() => { map.invalidateSize(); map.flyTo(m.getLatLng(), 17, { duration: .8 }); setTimeout(() => m.openPopup(), 900); }, 120);
  }

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      const ll = [p.coords.latitude, p.coords.longitude];
      if (youMarker) youMarker.setLatLng(ll); else youMarker = L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="pin is-you"></div>', iconSize: [26, 26], iconAnchor: [13, 13] }), title: 'You' }).addTo(map);
      map.flyTo(ll, 16);
    }, () => { alert('Location is off for this site. Turn it on in your browser and tap again.'); }, { enableHighAccuracy: true, timeout: 8000 });
  }

  /* A small second map: hotel ↔ venue with the walking route. */
  async function mini(elId, hotel, venue) {
    const el = document.getElementById(elId); if (!el || !hotel || !venue || typeof L === 'undefined') return;
    const m = L.map(el, { scrollWheelZoom: false, dragging: false, touchZoom: false, doubleClickZoom: false, zoomControl: false, attributionControl: false, keyboard: false }); miniMap = m;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
    L.marker([hotel.lat, hotel.lng], { icon: pinIcon('hotel'), title: hotel.name }).addTo(m).bindTooltip('Hotel', { permanent: true, direction: 'right', offset: [10, -14], className: 'mini-tip' });
    L.marker([venue.lat, venue.lng], { icon: pinIcon('venue'), title: venue.name }).addTo(m).bindTooltip('Riverside', { permanent: true, direction: 'left', offset: [-10, -14], className: 'mini-tip' });
    let line = [[hotel.lat, hotel.lng], [venue.lat, venue.lng]], dashed = true;
    try {
      const r = await fetch(`https://router.project-osrm.org/route/v1/foot/${hotel.lng},${hotel.lat};${venue.lng},${venue.lat}?overview=full&geometries=geojson`);
      if (r.ok) { const j = await r.json(); const c = j.routes && j.routes[0] && j.routes[0].geometry.coordinates; if (c && c.length > 1) { line = c.map(([x, y]) => [y, x]); dashed = false; } }
    } catch (e) {}
    const pl = L.polyline(line, { color: cssVar('--wsp-cat-venue') || '#007190', weight: 5, opacity: .9, dashArray: dashed ? '8 6' : null }).addTo(m);
    m._wspBounds = pl.getBounds().pad(.6); m.fitBounds(m._wspBounds);
    setTimeout(() => m.invalidateSize(), 300);
  }

  function setInteractive(on) {
    if (!map) return;
    ['dragging', 'touchZoom', 'scrollWheelZoom', 'doubleClickZoom', 'boxZoom', 'keyboard'].forEach(h => { if (map[h]) on ? map[h].enable() : map[h].disable(); });
    if (!on) map.closePopup();
    /* review 7: locked map, no focus stops on pins (many sit outside the frame) */
    map.getContainer().querySelectorAll('.leaflet-control a').forEach(i => { i.tabIndex = on ? 0 : -1; }); map.getContainer().querySelectorAll('.leaflet-marker-icon').forEach(i => { i.tabIndex = -1; });   /* review 9: pins are reached from the place lists, not by Tab across the map */
  }
  function refresh() { if (map) { map.invalidateSize(); } }
  function refreshMini() { if (miniMap) { miniMap.invalidateSize(); const b = miniMap._wspBounds; if (b) miniMap.fitBounds(b); } }

  function gmapsFallback(loc) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((loc.name || '') + ' ' + (String(loc.address || '').split(/\.\s|\s\(/)[0] || loc.city || 'New Orleans'))}`; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  return { init, walks, showWalk, focus, mini, setInteractive, refresh, refreshMini, CATS, gmapsFallback };
})();

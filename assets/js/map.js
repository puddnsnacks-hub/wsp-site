/* Map: Leaflet + OpenStreetMap tiles. Pins colored by category; tap → detail sheet.
   Expects WSP.locations (array of Location objects) and optional WSP.closurePolygon. */
window.WSP = window.WSP || {};
WSP.map = (function () {
  const CENTER = [43.0389, -87.9100];
  const CATS = {
    'venue':       { label: 'Venue',        glyph: '♪' },
    'hotel':       { label: 'Hotel',        glyph: 'H' },
    'stage':       { label: 'Live music',   glyph: '♫' },
    'closure':     { label: 'Street party', glyph: '✦' },
    'watch-party': { label: 'Watch the game', glyph: 'W' },
    'restaurant':  { label: 'Eat',          glyph: 'E' },
    'street-food': { label: 'Street food',  glyph: 'S' },
    'bar':         { label: 'Drink',        glyph: 'D' },
    'laverne':     { label: 'Laverne & Shirley', glyph: 'L' },
    'landmark':    { label: 'See',          glyph: '●' },
    'practical':   { label: 'Practical',    glyph: '+' },
  };
  let map, miniMap, layerByCat = {}, markersById = {}, active = new Set(Object.keys(CATS)), youMarker;

  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  function pinIcon(cat) {
    const c = cssVar(`--wsp-cat-${cat}`) || '#666', ink = cssVar(`--wsp-cat-${cat}-ink`) || '#fff';
    return L.divIcon({ className: '', html: `<div class="pin" style="--c:${c};--ink:${ink}"><span>${(CATS[cat] || {}).glyph || '●'}</span></div>`, iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] });
  }

  function init(locations, closurePolygon) {
    const el = document.getElementById('leaflet-map'); if (!el || typeof L === 'undefined') return;
    map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView(CENTER, 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    if (closurePolygon && closurePolygon.length >= 3) {
      L.polygon(closurePolygon, { color: cssVar('--wsp-closure-stroke'), fillColor: cssVar('--wsp-closure-stroke'), fillOpacity: .18, weight: 2, dashArray: '6 4' })
        .addTo(map).bindTooltip('Street closed to cars', { sticky: true });
    }

    Object.keys(CATS).forEach(c => { layerByCat[c] = L.layerGroup().addTo(map); });
    locations.forEach(loc => {
      if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return;
      const cat = CATS[loc.category] ? loc.category : 'landmark';
      const m = L.marker([loc.lat, loc.lng], { icon: pinIcon(cat), title: loc.name, keyboard: true });
      m.bindPopup(`<b>${esc(loc.name)}</b>${esc(loc.blurb ? loc.blurb.slice(0, 110) + (loc.blurb.length > 110 ? '…' : '') : '')}<br><a href="#" data-open="${esc(loc.id)}">Details</a> · <a href="${esc(loc.gmaps_url || gmapsFallback(loc))}" target="_blank" rel="noopener">Maps</a>`);
      m.on('popupopen', (e) => { const a = e.popup.getElement().querySelector('[data-open]'); if (a) a.addEventListener('click', (ev) => { ev.preventDefault(); WSP.sheet.openLocation(loc); }); });
      m.addTo(layerByCat[cat]); markersById[loc.id] = m;
    });

    renderFilters(locations);
    const btn = document.getElementById('locate-btn'); if (btn) btn.addEventListener('click', locate);
    setTimeout(() => map.invalidateSize(), 300);
  }

  function renderFilters(locations) {
    const wrap = document.getElementById('map-filters'); if (!wrap) return;
    const counts = {}; locations.forEach(l => { const c = CATS[l.category] ? l.category : 'landmark'; counts[c] = (counts[c] || 0) + 1; });
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
    document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  }
  function refresh() { if (map) { map.invalidateSize(); } }
  function refreshMini() { if (miniMap) { miniMap.invalidateSize(); const b = miniMap._wspBounds; if (b) miniMap.fitBounds(b); } }

  function gmapsFallback(loc) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((loc.name || '') + ' ' + (loc.address || 'Milwaukee WI'))}`; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  return { init, focus, mini, setInteractive, refresh, refreshMini, CATS, gmapsFallback };
})();

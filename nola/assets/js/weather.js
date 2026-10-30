/* Weather: Open-Meteo, no key. New Orleans, at the hotel.
   Fahrenheit, New Orleans time. Fills the header temp pill and the Weather widget. Caches 10 minutes in sessionStorage. */
window.WSP = window.WSP || {};
WSP.weather = (function () {
  const TZ = 'America/Chicago';
  const CITIES = [{ id: 'nola', name: 'New Orleans', lat: 29.9431, lon: -90.0664 }];
  let CITY = CITIES[0];
  const urlFor = (c) => `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day,precipitation&hourly=temperature_2m,weather_code,precipitation_probability,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=${encodeURIComponent(TZ)}&forecast_days=5`;
  const I = () => WSP.icons;

  async function fetchWx() {
    try {
      const c = sessionStorage.getItem('nola-wx-' + CITY.id);
      if (c) { const o = JSON.parse(c); if (Date.now() - o.at < 10 * 60e3) return o.data; }
    } catch (e) {}
    const r = await fetch(urlFor(CITY)); if (!r.ok) throw new Error('weather ' + r.status);
    const data = await r.json();
    try { sessionStorage.setItem('nola-wx-' + CITY.id, JSON.stringify({ at: Date.now(), data })); } catch (e) {}
    return data;
  }

  function svgInner(key) { const m = I().ui[key].match(/<svg[^>]*>([\s\S]*)<\/svg>/); return m ? m[1] : ''; }
  const rnd = (n) => Math.round(n);
  const dayName = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ });
  /* Open-Meteo gives local wall-clock times with no offset: read them as New Orleans time, wherever the phone is */
  let OFF = 0; const at = (t) => new Date(Date.parse(t + 'Z') - OFF * 1000);
  const hourLabel = (iso) => { let h = Number(iso.slice(11, 13)); const ap = h >= 12 ? 'p' : 'a'; h = h % 12 || 12; return h + ap; };

  function renderHeader(data) {
    const cur = data.current; const key = I().wmo(cur.weather_code, !cur.is_day);
    const icon = document.getElementById('temp-icon'); if (icon) { icon.innerHTML = svgInner(key); icon.setAttribute('fill', 'none'); icon.setAttribute('stroke', 'currentColor'); icon.setAttribute('stroke-width', '1.8'); icon.setAttribute('stroke-linecap', 'round'); icon.setAttribute('stroke-linejoin', 'round'); }
    const t = document.getElementById('temp-now'); if (t) t.textContent = rnd(cur.temperature_2m) + '°';
    const d = document.getElementById('temp-desc'); if (d) d.textContent = CITY.name + ' · ' + (I().wmoText[cur.weather_code] || '') + ' · feels ' + rnd(cur.apparent_temperature) + '°';
  }

  function renderWidget(data, mount, showNights) {
    const cur = data.current, H = data.hourly, D = data.daily; OFF = data.utc_offset_seconds || 0;
    const nowKey = I().wmo(cur.weather_code, !cur.is_day);
    const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    // Next 14 hours from now
    const nowIdx = Math.max(0, H.time.findIndex(t => at(t) >= new Date(Date.now() - 30 * 60e3)));
    const hours = H.time.slice(nowIdx, nowIdx + 14).map((t, i) => {
      const k = nowIdx + i; const isShow = false;
      return `<div class="wx-hour${isShow ? ' showtime' : ''}" title="${I().wmoText[H.weather_code[k]] || ''}"><span>${hourLabel(t)}</span>${I().ui[I().wmo(H.weather_code[k], !H.is_day[k])]}<span class="t num">${rnd(H.temperature_2m[k])}°</span><span>${H.precipitation_probability[k]}%</span></div>`;
    }).join('');
    const days = D.time.slice(0, 4).map((t, i) => `<div class="wx-day${t === todayIso ? ' today' : ''}"><span class="d">${t === todayIso ? 'Today' : dayName(t)}</span>${I().ui[I().wmo(D.weather_code[i], false)]}<span class="hi num">${rnd(D.temperature_2m_max[i])}°</span><span class="lo num">${rnd(D.temperature_2m_min[i])}°</span><span class="p num">${D.precipitation_probability_max[i]}% rain</span></div>`).join('');
    const sunset = D.sunset && D.sunset[0] ? at(D.sunset[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }) : '';
    mount.innerHTML = `
      <div class="wx-now">${I().ui[nowKey]}<div><div class="big num">${rnd(cur.temperature_2m)}°</div></div><div class="desc"><span class="strong">${I().wmoText[cur.weather_code] || ''}</span><span>Feels like ${rnd(cur.apparent_temperature)}° · wind ${rnd(cur.wind_speed_10m)} mph</span>${sunset ? `<span>Sunset ${sunset}</span>` : ''}</div></div>
      <div><span class="label">Next hours</span><div class="wx-hours" style="margin-top:6px">${hours}</div></div>
      <div class="wx-days">${days}</div>`;
  }

  async function init() {
    const mount = document.querySelector('[data-widget="weather"] .body');
    try {
      const data = await fetchWx();
      renderHeader(data);
      if (mount) renderWidget(data, mount, true);
      return data;
    } catch (e) {
      if (mount) mount.innerHTML = `<p class="caption">Couldn't reach the forecast. <a href="https://forecast.weather.gov/MapClick.php?lat=29.9431&lon=-90.0664" target="_blank" rel="noopener">Open the National Weather Service forecast for New Orleans</a>.</p>`;
      const d = document.getElementById('temp-desc'); if (d) d.textContent = 'Forecast';
      const pill = document.getElementById('temp-pill'); if (pill) { pill.href = `https://forecast.weather.gov/MapClick.php?lat=29.9431&lon=-90.0664`; pill.target = '_blank'; pill.rel = 'noopener'; pill.setAttribute('aria-label', 'Forecast at the National Weather Service'); pill.classList.add('is-offline'); }
      return null;
    }
  }
  async function setIsland(id) { const c = CITIES.find(x => x.id === id); if (!c) return; CITY = c; const m = document.querySelector('[data-widget="weather"] .body'); if (m) m.setAttribute('aria-busy', 'true'); await init(); if (m) { m.removeAttribute('aria-busy'); const b = m.querySelector(`[data-wx="${id}"]`); if (b) b.focus(); } }
  return { init, setIsland, get CITY() { return CITY; }, CITIES };
})();

/* switching islands: the forecast redraws in place, under the chips */
document.addEventListener('click', (e) => { const b = e.target.closest('[data-wx]'); if (!b) return; e.preventDefault(); WSP.weather.setIsland(b.dataset.wx); });

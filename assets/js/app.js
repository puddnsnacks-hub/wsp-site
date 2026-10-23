/* app.js — loads data/*.json, renders every widget, feeds the map.
   Each widget renders independently: a missing or broken file leaves a quiet
   "coming soon" note and never blocks the rest of the page. */
window.WSP = window.WSP || {};
(function () {
  const I = WSP.icons.ui, TZ = 'America/Chicago';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const body = (name) => $(`[data-widget="${name}"] .body`);
  const gmaps = (loc) => loc.gmaps_url || WSP.map.gmapsFallback(loc);
  const imgSrc = (img) => img && (img.local || img.src) || '';
  const pick = (o, k) => o && (o[k + '_local'] || o[k]) || '';
  const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const nowHour = () => Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: TZ }));
  const dayKey = (iso) => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(iso + 'T12:00:00').getDay()];
  const longDay = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  async function load(name) {
    try { const r = await fetch(`data/${name}.json`, { cache: 'no-cache' }); if (!r.ok) throw 0; return await r.json(); }
    catch (e) { return null; }
  }
  function pending(name, msg) { const b = body(name); if (b) b.innerHTML = `<div class="pending-note">${esc(msg || 'Research still coming in — check back in a bit')}</div>`; }
  function src(url, label) { return url ? ` <a class="src" href="${esc(url)}" target="_blank" rel="noopener" title="Source">${label || 'src'}</a>` : ''; }
  function media(img, cls = '') {
    if (!imgSrc(img)) return '';
    return `<figure class="media ${cls}"><img src="${esc(imgSrc(img))}" alt="" loading="lazy" onerror="this.closest('figure').remove()">${img.credit ? `<figcaption class="credit">${img.credit_url ? `<a href="${esc(img.credit_url)}" target="_blank" rel="noopener">${esc(img.credit)}</a>` : esc(img.credit)}</figcaption>` : ''}</figure>`;
  }
  function hoursToday(h) {
    if (!h) return ''; if (typeof h === 'string') return h;
    const k = dayKey(todayISO()); return h[k] ? `Today ${h[k]}` : '';
  }
  function links(loc, extra = '') {
    const out = [`<a class="link-pill maps" href="${esc(gmaps(loc))}" target="_blank" rel="noopener">${I.pin}Maps</a>`];
    if (loc.yelp_photos_url) out.push(`<a class="link-pill" href="${esc(loc.yelp_photos_url)}" target="_blank" rel="noopener">${I.camera}${/restaurant|street-food/.test(loc.category || '') ? 'Food photos' : 'Photos'}</a>`);
    if (loc.spotify_url) out.push(`<a class="link-pill" href="${esc(loc.spotify_url)}" target="_blank" rel="noopener">${I.spotify}Spotify</a>`);
    if (loc.reservation && loc.reservation.url) out.push(`<a class="link-pill" href="${esc(loc.reservation.url)}" target="_blank" rel="noopener">${I.ticket}Reserve</a>`);
    if (loc.website) out.push(`<a class="link-pill" href="${esc(loc.website)}" target="_blank" rel="noopener">${I.link}Site</a>`);
    if (loc.lat && loc.lng) out.push(`<button class="link-pill" data-focus="${esc(loc.id)}">${I.pin}On map</button>`);
    return `<div class="links">${out.join('')}${extra}</div>`;
  }
  function metaBits(loc) {
    const m = [];
    if (loc.price) m.push(esc(loc.price));
    if (loc.walk_from_venue_minutes != null) m.push(`${loc.walk_from_venue_minutes} min walk`);
    else if (loc.walk_from_riverside_miles != null) m.push(`${loc.walk_from_riverside_miles} mi from the Riverside`);
    else if (loc.travel_from_downtown) m.push(esc(loc.travel_from_downtown));
    if (loc.best_time) m.push(esc(loc.best_time));
    if (loc.best_window) m.push(esc(loc.best_window));
    const h = hoursToday(loc.hours_this_weekend); if (h) m.push(esc(h));
    return m.length ? `<div class="meta">${m.map(x => `<span>${x}</span>`).join('<span aria-hidden="true">·</span>')}</div>` : '';
  }
  function placeRow(loc, opts = {}) {
    const cat = loc.category || 'landmark'; const img = imgSrc(loc.image);
    const name = `<h3><a href="#" data-sheet="${esc(loc.id)}">${esc(loc.name)}</a></h3>`;
    const extraLine = opts.line ? `<p class="caption">${opts.line(loc)}</p>` : '';
    return `<li class="place${img ? ' has-media' : ''}" data-id="${esc(loc.id)}">
      ${img ? `<img class="thumb" src="${esc(img)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : `<span class="cat" style="--c:var(--wsp-cat-${esc(cat)})"></span>`}
      <div class="main">${name}${metaBits(loc)}<p class="blurb">${esc(loc.blurb || '')}</p>${extraLine}${loc.tags && loc.tags.length ? `<div class="tags">${loc.tags.slice(0, 4).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}${links(loc)}</div></li>`;
  }
  const FOLD = 4;
  function factsList(arr, limit = 6, cls = '') {
    arr = arr || []; const rows = arr.map((f, i) => `<li ${i >= limit ? 'data-folded ' : ''}><span class="n num">${i + 1}</span><span>${esc(typeof f === 'string' ? f : f.fact || f.text)}${src(typeof f === 'string' ? '' : f.source)}</span></li>`);
    const more = arr.length > limit ? `<button class="btn btn--sm fold-btn" type="button" data-fold-n="${arr.length - limit}">Show ${arr.length - limit} more</button>` : '';
    return `<ul class="facts-list places${arr.length > limit ? ' folded' : ''} ${cls}">${rows.join('')}</ul>${more}`;
  }
  function placeList(arr, opts = {}) {
    arr = arr || []; const limit = opts.limit || FOLD;
    const rows = arr.map((l, i) => placeRow(l, opts).replace('<li class="place', `<li ${i >= limit ? 'data-folded ' : ''}class="place`));
    const more = arr.length > limit ? `<button class="btn btn--sm fold-btn" type="button" data-fold-n="${arr.length - limit}">Show ${arr.length - limit} more</button>` : '';
    return `<ul class="places${arr.length > limit ? ' folded' : ''}">${rows.join('')}</ul>${more}`;
  }
  document.addEventListener('click', (e) => {
    const f = e.target.closest('.fold-btn'); if (!f) return;
    const ul = f.previousElementSibling; const open = ul.classList.toggle('folded');
    f.textContent = open ? `Show ${f.dataset.foldN} more` : 'Show fewer';
    if (open) ul.scrollIntoView({ block: 'nearest' });
  });

  /* ---------- Detail sheet ---------- */
  const byId = {};
  WSP.sheet = {
    openLocation(loc) {
      const sb = $('#sheet-body'); if (!sb) return;
      const rows = [];
      if (loc.address) rows.push(['Address', esc(loc.address)]);
      if (loc.hours_this_weekend) rows.push(['Hours', typeof loc.hours_this_weekend === 'string' ? esc(loc.hours_this_weekend) : ['fri', 'sat', 'sun', 'mon'].filter(k => loc.hours_this_weekend[k]).map(k => `<b>${k[0].toUpperCase() + k.slice(1)}</b> ${esc(loc.hours_this_weekend[k])}`).join('<br>')]);
      if (loc.must_order) rows.push(['Order', esc([].concat(loc.must_order).join(', '))]);
      if (loc.signature_drink) rows.push(['Drink', esc(loc.signature_drink)]);
      if (loc.vibe) rows.push(['Vibe', esc(loc.vibe)]);
      if (loc.why_special) rows.push(['Why', esc(loc.why_special)]);
      if (loc.tv_setup) rows.push(['Screens', esc(loc.tv_setup)]);
      if (loc.cost) rows.push(['Cost', esc(loc.cost)]);
      if (loc.reservation && loc.reservation.needed != null) rows.push(['Reservation', loc.reservation.needed ? 'Recommended' : 'Walk in']);
      if (loc.wsp_fan_note) rows.push(['Panic fans', esc(loc.wsp_fan_note)]);
      if (loc.why) rows.push(['Why go', esc(loc.why)]);
      if (loc.phone) rows.push(['Phone', `<a href="tel:${esc(loc.phone.replace(/[^\d+]/g, ''))}">${esc(loc.phone)}</a>`]);
      sb.innerHTML = `${media(loc.image)}<div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
        <span class="eyebrow"><span class="dot" style="display:inline-block;width:9px;height:9px;background:var(--wsp-cat-${esc(loc.category || 'landmark')});margin-right:8px;vertical-align:middle"></span>${esc((WSP.map.CATS[loc.category] || {}).label || loc.category || '')}</span>
        <h3 id="sheet-title" class="heading-sm">${esc(loc.name)}</h3>
        <p class="prose">${esc(loc.blurb || '')}</p>
        ${rows.length ? `<dl style="display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:var(--pds-text-caption);margin:0">${rows.map(([k, v]) => `<dt class="label" style="padding-top:2px">${k}</dt><dd style="margin:0">${v}</dd>`).join('')}</dl>` : ''}
        ${links(loc)}${loc.source ? `<p class="caption">Source: <a href="${esc(loc.source)}" target="_blank" rel="noopener">${esc(new URL(loc.source, location.href).hostname)}</a></p>` : ''}</div>`;
      $('#sheet').classList.add('open'); $('#sheet').setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('open');
    },
    close() { $('#sheet').classList.remove('open'); $('#sheet').setAttribute('aria-hidden', 'true'); $('#scrim').classList.remove('open'); }
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-sheet]'); if (a) { e.preventDefault(); const l = byId[a.dataset.sheet]; if (l) WSP.sheet.openLocation(l); return; }
    const f = e.target.closest('[data-focus]'); if (f) { e.preventDefault(); WSP.sheet.close(); WSP.map.focus(f.dataset.focus); return; }
    if (e.target.closest('#sheet-close') || e.target.id === 'scrim') WSP.sheet.close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') WSP.sheet.close(); });

  /* ---------- Theme toggle ---------- */
  $('#theme-toggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next); try { localStorage.setItem('wsp-theme', next); } catch (e) {}
  });

  /* ---------- Mega menu + current-section label ---------- */
  const mega = $('#mega'), menuBtn = $('#menu-btn'), nowAt = $('#now-at');
  const sectionTitle = (id) => { const h = $(`#${id} > header h2`) || $(`#${id} h2`); return h ? h.textContent.trim() : id; };
  function setMenu(open) { mega.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); if (open) mega.querySelector('a').focus({ preventScroll: true }); }
  menuBtn.addEventListener('click', () => setMenu(mega.hidden));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !mega.hidden) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', (e) => { if (!mega.hidden && !e.target.closest('.site-nav')) setMenu(false); });
  mega.addEventListener('click', (e) => {
    const a = e.target.closest('a'); if (!a) return;
    const id = a.getAttribute('href').slice(1); const sec = document.getElementById(id); setMenu(false);
    if (!sec) return;
    e.preventDefault();
    let target = sec;
    if (a.dataset.tab) { const t = sec.querySelector('#' + a.dataset.tab); if (t) t.click(); }
    if (a.dataset.openDetails) { const d = [...sec.querySelectorAll('details')].find(x => x.textContent.toLowerCase().includes(a.dataset.openDetails.toLowerCase())); if (d) { d.open = true; target = d; } }
    if (a.dataset.scrollTo) { const el = sec.querySelector(a.dataset.scrollTo); if (el) target = el; }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#' + id);
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { es.forEach(en => { if (en.isIntersecting) nowAt.textContent = sectionTitle(en.target.id); }); }, { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('main section.w').forEach(s => io.observe(s));
  }

  /* ---------- Renderers ---------- */
  function renderTonight(c, ws, cl) {
    const b = body('tonight'); if (!b) return;
    const shows = (c && c.shows) || []; const t = todayISO(); const h = nowHour();
    let show = shows.find(s => s.date === t) || null;
    // After 1 AM Central, "tonight" still means the show that just happened until 4 AM; after that, next show.
    if (show && h < 4) { /* keep */ } else if (!show || h >= 4) show = shows.find(s => s.date >= t) || shows[shows.length - 1];
    const idx = shows.indexOf(show); const isPast = show && show.date < t;
    const eyebrow = $('#tonight-eyebrow'), title = $('#tonight-h');
    if (!show) { eyebrow.textContent = 'The run'; title.textContent = 'Widespread Panic at the Riverside'; b.innerHTML = '<p class="muted">Show data is still loading.</p>'; return; }
    eyebrow.textContent = show.date === t ? `Tonight · Night ${idx + 1} of ${shows.length}` : (isPast ? 'The run is over' : `Next · Night ${idx + 1} of ${shows.length}`);
    title.innerHTML = `${esc(show.weekday)} <span class="muted" style="font-weight:400">${esc(longDay(show.date).replace(/^\w+, /, ''))}</span>`;
    const game = ws && ws.games ? ws.games.find(g => g.date === show.date && g.game) : null;
    const party = cl && cl.event && cl.event.name ? cl.event : null;
    const afterParty = (show.notes || '').match(/after-?party[^.]*\./i);
    b.innerHTML = `<div class="tonight">
      <div class="lead">
        <p class="show-title">Widespread <em>Panic</em></p>
        <p class="muted">${esc(show.notes || '')}</p>
        <div class="share-row" style="margin-top:8px">
          ${c.walk && c.walk.gmaps_directions_url ? `<a class="btn btn--primary" href="${esc(c.walk.gmaps_directions_url)}" target="_blank" rel="noopener">${I.walk}Walk from the hotel · ${c.walk.from_hotel_to_venue_minutes} min</a>` : ''}
          <a class="btn" href="#street">Street party</a>
          ${game ? '<a class="btn" href="#series">The game</a>' : ''}
        </div>
      </div>
      <div class="facts">
        <div class="fact"><span class="v">${esc(show.doors || '—')}</span><span class="k">Doors</span></div>
        <div class="fact"><span class="v">${esc(show.show || '—')}</span><span class="k">Show</span></div>
        ${game ? `<div class="fact"><span class="v">${esc(game.first_pitch_central)}</span><span class="k">Game ${game.game} · ${esc(game.matchup || '')}</span></div>` : `<div class="fact"><span class="v">No game</span><span class="k">Off day for the Series</span></div>`}
        ${party ? (() => { const hd = (party.hours_by_day || []).find(d => d.date === show.date) || {}; return `<div class="fact"><span class="v">${esc((hd.music || hd.open || 'Open').replace(/\s*\(.*\)$/, ''))}</span><span class="k">Street party music · street open from ${esc(hd.open || 'noon')}</span></div>`; })() : ''}
        <div class="fact"><span class="v" id="tonight-wx">—</span><span class="k">At showtime</span></div>
      </div>
    </div>
    ${ws && ws.series && ws.series.brewers_in_it ? `<div class="notice" style="margin-top:16px;background:var(--dt-accent-90);color:var(--dt-accent-15);border-color:var(--dt-accent-30)"><b>The Brewers are in the World Series.</b> ${esc(ws.series.series_status || '')} Expect the whole city in blue and gold — bars will be loud, screens everywhere, and the walk home at 11:30 will tell you the score.</div>` : ''}`;
  }

  function renderConcert(c) {
    const b = body('concert'); if (!c) return pending('concert');
    const v = c.venue || {};
    b.innerHTML = `
      ${media(v.image)}
      <div class="day-group">${(c.shows || []).map((s, i) => `<div class="slot"><span class="time">${esc(s.weekday).slice(0, 3)} ${esc(s.date.slice(5).replace('-', '/'))}</span><div class="who"><h3>Night ${i + 1} ${s.status ? `<span class="status status--${/sold/i.test(s.status) ? 'closed' : 'open'}" style="vertical-align:middle;margin-left:6px">${esc(s.status)}</span>` : ''}</h3><p>Doors ${esc(s.doors)} · Show ${esc(s.show)}</p><p>${esc(s.notes || '')}</p><div class="links">${s.ticket_url ? `<a class="link-pill" href="${esc(s.ticket_url)}" target="_blank" rel="noopener">${I.ticket}Tickets</a>` : ''}${s.source ? `<a class="link-pill" href="${esc(s.source)}" target="_blank" rel="noopener">${I.link}Event page</a>` : ''}</div></div></div>`).join('')}</div>
      ${v.name ? `<div><span class="eyebrow">The room</span><p class="prose" style="margin-top:6px">${esc(v.blurb || '')}</p>${links(v)}</div>` : ''}
      ${v.tips && v.tips.length ? `<details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">Venue rules and tips (${v.tips.length})</summary><ul class="rules" style="margin-top:8px">${v.tips.map(t => `<li class="rule"><span class="ic">${I.check}</span><span>${esc(typeof t === 'string' ? t : t.tip || t.rule || JSON.stringify(t))}</span></li>`).join('')}</ul>${v.box_office_source ? `<p class="caption" style="margin-top:8px"><a href="${esc(v.box_office_source)}" target="_blank" rel="noopener">Official FAQ</a></p>` : ''}</details>` : ''}
      ${c.fan_tips && c.fan_tips.length ? `<details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">Panic-fan tips for this run (${c.fan_tips.length})</summary><ul class="rules" style="margin-top:8px">${c.fan_tips.map(t => `<li class="rule"><span class="ic">${I.star}</span><span>${esc(typeof t === 'string' ? t : t.tip || JSON.stringify(t))}</span></li>`).join('')}</ul></details>` : ''}
      ${c.band ? `<div><span class="eyebrow">The band</span><p class="prose" style="margin-top:6px">${esc(c.band.blurb || '')}</p><div class="links">${c.band.spotify_url ? `<a class="link-pill" href="${esc(c.band.spotify_url)}" target="_blank" rel="noopener">${I.spotify}Spotify</a>` : ''}${(c.setlist_resources || []).map(r => `<a class="link-pill" href="${esc(r.url)}" target="_blank" rel="noopener" title="${esc(r.note || '')}">${I.link}${esc(r.name)}</a>`).join('')}</div></div>` : ''}`;
  }

  function renderClosure(cl) {
    const b = body('closure'); if (!cl) return pending('closure', 'Confirming the closure and the stage schedule');
    const ev = cl.event || {}, cz = cl.closure || {};
    if (!ev.name && !(cl.schedule || []).length) { b.innerHTML = `<p class="prose">${esc((cl.open_questions || []).join(' ') || 'No closure details found yet.')}</p>`; return; }
    const byDay = {}; (cl.schedule || []).forEach(s => { (byDay[s.date] = byDay[s.date] || []).push(s); });
    (cl.after_parties || []).forEach(s => { (byDay[s.date] = byDay[s.date] || []).push(Object.assign({}, s, { stage: 'After-party · ' + (byId[s.venue_id] ? byId[s.venue_id].name : "Mo's Irish Pub"), start: (s.start || '').replace(/\s*\(doors\).*$/i, ' doors'), is_after: true })); });
    const other = cl.other_free_live_music_nearby_this_weekend || [];
    b.innerHTML = `
      ${ev.summary ? `<p class="prose">${esc(ev.summary)}${src(ev.source)}</p>` : ''}
      ${cz.streets ? `<div class="notice"><b>Closed to cars:</b> ${esc(cz.streets)}${cz.closed_from ? ` — ${esc(cz.closed_from)} to ${esc(cz.closed_until || '')}` : ''}${src(cz.source)}</div>` : ''}
      ${(ev.hours_by_day || []).length ? `<div class="facts" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:12px">${ev.hours_by_day.map(d => `<div style="border-top:1px solid var(--pds-border-subtle);padding-top:6px"><div class="label">${esc(longDay(d.date).split(',')[0])}</div><div class="strong num">Street open ${esc(d.open)}</div><div class="caption num">Music ${esc((d.music || '').replace(/\s*\(.*\)$/, ''))}${d.street_reopens_to_cars ? ` · cars back ${esc(d.street_reopens_to_cars)}` : ''}</div></div>`).join('')}</div>` : ''}
      ${(cl.rules || []).length ? `<details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">The rules in the zone (${cl.rules.length})</summary><ul class="rules">${cl.rules.map(r => `<li class="rule"><span class="ic">${I.info}</span><span><b>${esc(r.rule)}</b>${r.detail ? ` — ${esc(r.detail)}` : ''}${src(r.source)}</span></li>`).join('')}</ul></details>` : ''}
      ${Object.keys(byDay).length ? `<div><span class="eyebrow">Live music schedule</span>${Object.keys(byDay).sort().map(d => `<details class="day-group" style="margin-top:10px" ${d === todayISO() || (todayISO() > Object.keys(byDay).sort().slice(-1)[0] && d === Object.keys(byDay).sort().slice(-1)[0]) || todayISO() < Object.keys(byDay).sort()[0] && d === Object.keys(byDay).sort()[0] ? 'open' : ''}><summary class="eyebrow" style="cursor:pointer;min-height:36px;display:flex;align-items:center">${esc(longDay(d))}${d === todayISO() ? ' · today' : ''}</summary>${byDay[d].map(s => `<div class="slot${imgSrc(s.image) ? ' has-media' : ''}"><span class="time num">${esc(s.start || '')}${s.end ? `–${esc(s.end)}` : ''}</span><div class="who"><h3>${esc(s.band)}</h3>${s.hometown || s.stage ? `<span class="label">${esc(s.hometown || '')}${s.stage ? ` · ${esc(byId[s.stage] ? byId[s.stage].name : s.stage)}` : ''}</span>` : ''}<p>${esc(s.style || '')}</p><div class="links">${s.spotify_url ? `<a class="link-pill" href="${esc(s.spotify_url)}" target="_blank" rel="noopener">${I.spotify}Spotify</a>` : ''}${s.website ? `<a class="link-pill" href="${esc(s.website)}" target="_blank" rel="noopener">${I.link}Site</a>` : ''}</div></div>${imgSrc(s.image) ? `<img class="art" src="${esc(imgSrc(s.image))}" alt="${esc(s.band)}" loading="lazy" title="${esc(s.image.credit || '')}" onerror="this.remove()">` : ''}</div>`).join('')}</details>`).join('')}</div>` : ''}
      ${(cl.food_and_drink_in_zone || []).length || cl.food_and_drink_note ? `<div><span class="eyebrow">Food and drink in the zone</span>${cl.food_and_drink_note ? `<p class="caption" style="margin-top:6px">${esc(cl.food_and_drink_note)}</p>` : ''}${placeList(cl.food_and_drink_in_zone)}</div>` : ''}
      ${other.length ? `<details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">Other free live music nearby this weekend (${other.length})</summary><ul class="rules">${other.map(o => `<li class="rule"><span class="ic">${I.star}</span><span><b>${esc(o.name)}</b> — ${esc(o.venue || '')}${o.dates ? `, ${esc(o.dates)}` : ''}${o.cost ? ` · ${esc(o.cost)}` : ''}. ${esc(o.note || '')}${src(o.source)}</span></li>`).join('')}</ul></details>` : ''}
      ${(cl.transit_notes || []).length ? `<details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">Getting around the closure</summary><ul class="rules">${cl.transit_notes.map(t => `<li class="rule"><span class="ic">${I.walk}</span><span>${esc(t)}</span></li>`).join('')}</ul></details>` : ''}
      ${ev.official_url ? `<p class="caption"><a href="${esc(ev.official_url)}" target="_blank" rel="noopener">Official event page</a></p>` : ''}`;
  }

  function renderSeries(ws) {
    const b = body('worldseries'); if (!ws) return pending('worldseries');
    const s = ws.series || {}; const t = todayISO();
    b.innerHTML = `
      <div class="notice">${esc(s.milwaukee_angle || s.series_status || '')}${src(s.source)}</div>
      <div style="display:flex;flex-direction:column;gap:10px">${(ws.games || []).filter(g => g.date >= '2026-10-23' && g.date <= '2026-10-26').map(g => g.game ? `<div class="game${g.after_departure ? ' after' : ''}${g.date === t ? ' today' : ''}"><div><div class="label">${esc(g.weekday)} ${esc(g.date.slice(5).replace('-', '/'))}${g.date === t ? ' · today' : ''}${g.after_departure ? ' · after your flight' : ''}</div><div class="matchup">${esc(g.matchup || '')}</div><div class="when">${esc(g.venue || '')}${g.city ? `, ${esc(g.city)}` : ''} · ${esc(g.tv || '')}</div></div><div><div class="big num">${esc(g.first_pitch_central)}</div><div class="label" style="text-align:right">first pitch</div></div>${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}</div>` : `<div class="game" style="opacity:.75"><div><div class="label">${esc(g.weekday)} ${esc(g.date.slice(5).replace('-', '/'))}</div><div class="matchup">No game</div><div class="when">${esc(g.note || 'Travel day')}</div></div></div>`).join('')}</div>
      ${s.storylines && s.storylines.length ? `<details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">Storylines to drop at the bar</summary><ul class="rules">${s.storylines.map(x => `<li class="rule"><span class="ic">${I.star}</span><span>${esc(typeof x === 'string' ? x : x.text || JSON.stringify(x))}</span></li>`).join('')}</ul></details>` : ''}
      <div><span class="eyebrow">Where to watch</span>${placeList(ws.watch_spots)}</div>
      ${ws.getting_around ? `<details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">Getting to the watch parties</summary><ul class="rules">${['deer_district', 'third_ward', 'american_family_field'].filter(k => ws.getting_around[k]).map(k => `<li class="rule"><span class="ic">${I.walk}</span><span><b>${esc(k.replace(/_/g, ' '))}</b> — ${esc(ws.getting_around[k])}</span></li>`).join('')}</ul></details>` : ''}`;
  }

  function renderLineups(lu) {
    const b = body('lineups'); if (!lu || !lu.games) return pending('lineups', 'Pulling probable pitchers and lineups');
    const T = lu.teams || {}; const t = todayISO();
    const teamVars = (code) => { const tm = T[code] || {}; const c = (tm.colors || {}); return `--team-primary:${esc(c.primary || '#333')};--team-secondary:${esc(c.secondary || '#fff')}`; };
    const statKeys = (s) => Object.keys(s || {}).slice(0, 4);
    const card = (p, code, isP) => {
      if (!p) return '';
      const s = p.stats_2026 || {};
      return `<button class="card${isP ? ' pitcher' : ''}" type="button" aria-label="${esc(p.name)}, flip for the card back" style="${teamVars(code)}"><div class="inner">
        <div class="face front"><div class="photo">${pick(p, 'headshot_url') ? `<img src="${esc(pick(p, 'headshot_url'))}" alt="" loading="lazy" onerror="this.remove()">` : ''}${p.number != null ? `<span class="no">${esc(p.number)}</span>` : ''}${p.order ? `<span class="order">${esc(p.order)}</span>` : ''}</div>
          <div class="nameplate"><b>${esc(p.name)}</b><span>${esc(p.position || '')}${p.bats ? ` · B/T ${esc(p.bats)}/${esc(p.throws || '')}` : ''}${isP ? ' · Starting pitcher' : ''}</span>
          ${statKeys(s).length ? `<div class="stats">${statKeys(s).map(k => `<div><b>${esc(s[k])}</b><span>${esc(k)}</span></div>`).join('')}</div>` : ''}</div></div>
        <div class="face back"><b>${esc(p.name)}</b><span class="line">${[p.age ? `Age ${p.age}` : '', p.hometown].filter(Boolean).map(esc).join(' · ')}</span>
          ${p.postseason_2026 ? `<span class="line">${esc(p.postseason_2026)}</span>` : ''}
          <p>${esc(p.card_back || '')}</p>
          ${p.weird_fact ? `<p><b style="font-size:12px">Odd fact.</b> ${esc(p.weird_fact)}</p>` : ''}
          ${p.texas_tie ? `<p><b style="font-size:12px">Texas tie.</b> ${esc(p.texas_tie)}</p>` : ''}
          ${p.source ? `<a class="line" href="${esc(p.source)}" target="_blank" rel="noopener">source</a>` : ''}</div></div></button>`;
    };
    const teamBlock = (g, code) => {
      const tm = T[code] || { name: code }; const announced = (g.lineups && g.lineups[code] && g.lineups[code].length); const nine = announced ? g.lineups[code] : ((g.projected_lineups && g.projected_lineups[code]) || []);
      const sp = g.probable_pitchers && g.probable_pitchers[code];
      return `<div style="${teamVars(code)}"><div class="team-head">${pick(tm, 'logo_url') ? `<img src="${esc(pick(tm, 'logo_url'))}" alt="">` : ''}<h3>${esc(tm.name)}</h3><span class="label">${esc(tm.record_2026 || '')}<br>${announced ? 'Lineup announced' : (nine.length ? 'Projected' : 'Lineup TBA')}</span></div>
        <div class="cards" style="margin-top:10px">${card(sp, code, true)}${nine.map(p => card(p, code, false)).join('')}</div>
        ${!sp && !nine.length ? '<p class="caption" style="margin-top:8px">Nothing posted yet for this game.</p>' : ''}</div>`;
    };
    const games = lu.games.filter(g => g.game);
    const def = games.find(g => g.date === t) || games.find(g => g.date >= t) || games[0];
    b.innerHTML = `<div class="lineup-tabs" role="tablist">${games.map(g => `<button class="chip" role="tab" aria-pressed="${g === def}" data-g="${g.game}">Game ${g.game} · ${esc(g.date.slice(5).replace('-', '/'))}${g.status === 'final' ? ' · Final' : ''}</button>`).join('')}</div>
      ${games.map(g => `<div class="lineup-game" data-game="${g.game}" ${g === def ? '' : 'hidden'}>
        <p class="caption">${esc(T[g.away] ? T[g.away].nickname : g.away)} at ${esc(T[g.home] ? T[g.home].nickname : g.home)} · ${esc(g.venue || '')} · first pitch ${esc(g.first_pitch_central || '')}${g.result ? ` · <b>Final: ${esc(T[g.home].nickname)} ${esc(g.result[g.home])}, ${esc(T[g.away].nickname)} ${esc(g.result[g.away])}</b>` : ''}${g.lineup_source ? ` · <a href="${esc(g.lineup_source)}" target="_blank" rel="noopener">lineups</a>` : ''}</p>
        <div class="lineup-teams">${teamBlock(g, g.home)}${teamBlock(g, g.away)}</div></div>`).join('')}
      ${Object.keys(T).some(k => T[k].mascot) ? `<div><span class="eyebrow">The mascots</span><div class="cards" style="margin-top:10px;grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">${Object.keys(T).flatMap(k => [T[k].mascot, T[k].mascot_extra].filter(Boolean).map(mc => card(mc, k, false))).join('')}</div></div>` : ''}
      <p class="caption">As of ${esc(lu.as_of ? new Date(lu.as_of).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', timeZone: TZ }) : '')} CT. Official lineups: <a href="https://www.mlb.com/brewers/roster/starting-lineups" target="_blank" rel="noopener">Brewers</a> · <a href="https://www.mlb.com/rays/roster/starting-lineups" target="_blank" rel="noopener">Rays</a>.</p>`;
    b.addEventListener('click', (e) => {
      const c = e.target.closest('.card'); if (c) { c.classList.toggle('flipped'); return; }
      const tb = e.target.closest('[data-g]'); if (tb) { b.querySelectorAll('[data-g]').forEach(x => x.setAttribute('aria-pressed', x === tb)); b.querySelectorAll('[data-game]').forEach(x => x.hidden = x.dataset.game !== tb.dataset.g); }
    });
  }

  function renderPeeps(pp) {
    if (!pp || !Array.isArray(pp.peeps) || !pp.peeps.length) return;
    const where = pp.show_in || ['header'];
    const figs = (cls) => `<div class="peeps ${cls}">${pp.peeps.map(x => `<figure class="peep" title="${esc(x.name)}"><img src="${esc(x.image)}" alt="${esc(x.name)}" loading="lazy" onerror="this.closest('figure').remove()">${x.line ? `<figcaption>${esc(x.line)}</figcaption>` : `<figcaption>${esc(x.name)}${x.role ? ` · <span class="muted">${esc(x.role)}</span>` : ''}</figcaption>`}</figure>`).join('')}</div>`;
    if (where.includes('header')) { const h = $('.site-header .inner'); if (h) h.insertAdjacentHTML('beforeend', figs('peeps--header')); }
    if (where.includes('tonight')) { const t = $('[data-widget="tonight"] .tonight .lead'); if (t) t.insertAdjacentHTML('afterbegin', figs('peeps--tonight')); }
    if (where.includes('footer')) { const f = $('footer .inner'); if (f) f.insertAdjacentHTML('afterbegin', figs('peeps--footer')); }
  }

  function renderBars(a) {
    const b = body('bars'); if (!a || !a.bars) return pending('bars');
    const pre = a.bars.filter(x => /pre/i.test(x.best_time || '')), after = a.bars.filter(x => /after|late/i.test(x.best_time || '') && !/pre/i.test(x.best_time || '')), day = a.bars.filter(x => !pre.includes(x) && !after.includes(x));
    const grp = (label, arr) => arr.length ? `<div><span class="eyebrow">${label}</span>${placeList(arr, { line: (l) => [l.vibe, l.signature_drink ? `Order: ${l.signature_drink}` : ''].filter(Boolean).map(esc).join(' · ') })}</div>` : '';
    const hw = a.halloween_weekend || [];
    const headline = a.this_weekend_headline && a.this_weekend_headline.note ? `<div class="notice">${esc(a.this_weekend_headline.note)}</div>` : '';
    b.innerHTML = headline + grp('Before doors', pre) + grp('After the encore', after) + grp('Daytime', day) + (hw.length ? `<details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">Halloween weekend, if you're into it (${hw.length})</summary><ul class="rules">${hw.map(h => h.lat ? `<li class="rule"><span class="ic">${I.pin}</span><span><b><a href="#" data-sheet="${esc(h.id)}">${esc(h.name)}</a></b> — ${esc(h.blurb || '')}</span></li>` : `<li class="rule"><span class="ic">${I.star}</span><span><b>${esc(h.name)}</b>${h.when ? ` · ${esc(h.when)}` : ''}${h.cost ? ` · ${esc(h.cost)}` : ''} — ${esc(h.why || '')}${h.location && h.location.lat ? ` <a href="#" data-sheet="${esc(h.location.id)}">${esc(h.location.name)}</a>` : ''}${src(h.source)}</span></li>`).join('')}</ul></details>` : '');
  }

  function renderFood(f) {
    const b = body('food'); if (!f) return pending('food');
    const tabs = [['destination', 'Worth the trip', () => placeList(f.destination, { line: (l) => l.must_order ? `Order: ${esc([].concat(l.must_order).join(', '))}` : '' })], ['street', 'Street food', () => placeList(f.street_food, { line: (l) => l.must_order ? `Order: ${esc([].concat(l.must_order).join(', '))}` : '' })], ['traditions', 'Milwaukee traditions', () => `<ul class="facts-list">${(f.milwaukee_food_traditions || []).map((t, i) => `<li><span class="n">${i + 1}</span><span><b class="strong">${esc(t.name)}</b> — ${esc(t.what)}${(t.where_from_this_list || []).length ? `<br><span class="caption">Try it at: ${t.where_from_this_list.map(id => byId[id] ? `<a href="#" data-sheet="${esc(id)}">${esc(byId[id].name)}</a>` : esc(id)).join(', ')}</span>` : ''}</span></li>`).join('')}</ul>`], ['monday', 'Monday before the flight', () => placeList((f.monday_brunch_before_flight || []).map(x => typeof x === 'string' ? byId[x] : x).filter(Boolean))]];
    b.innerHTML = `<div class="tabs" role="tablist">${tabs.map(([id, label], i) => `<button class="tab" role="tab" id="tab-${id}" aria-selected="${i === 0}" aria-controls="panel-${id}">${label}</button>`).join('')}</div>${tabs.map(([id, , fn], i) => `<div role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" ${i ? 'hidden' : ''}>${fn()}</div>`).join('')}`;
    b.querySelector('.tabs').addEventListener('click', (e) => { const t = e.target.closest('.tab'); if (!t) return; b.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', x === t)); b.querySelectorAll('[role=tabpanel]').forEach(p => p.hidden = p.id !== t.getAttribute('aria-controls')); });
  }

  function renderHotel(c, a) {
    const b = body('hotel'); const h = c && c.hotel; if (!h) return pending('hotel');
    const ga = (a && a.getting_around) || {};
    b.innerHTML = `${media(h.image)}
      <div><h3 class="heading-sm">${esc(h.name)}</h3><p class="caption">${esc(h.address || '')}</p><p class="prose" style="margin-top:6px">${esc(h.blurb || '')}</p>${(h.amenities || []).length ? `<div class="tags" style="margin-top:8px">${h.amenities.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : ''}${links(h)}</div>
      ${c.venue ? `<div class="mini-map-wrap"><div id="mini-map" class="mini-map" aria-label="Map from the hotel to the Riverside Theater"></div>${c.walk ? `<div class="mini-cap"><span class="strong">${esc(String(c.walk.from_hotel_to_venue_minutes || ''))} min walk · ${esc(String(c.walk.distance_miles || ''))} mi</span><a class="btn btn--sm btn--primary" href="${esc(c.walk.gmaps_directions_url)}" target="_blank" rel="noopener">${I.walk}Directions</a></div>` : ''}</div>` : ''}
      ${c.walk ? `<div class="notice"><b>To the Riverside:</b> ${esc(c.walk.route_summary || '')}</div>` : ''}
      ${ga.the_hop || ga.airport ? `<div class="rules">${ga.the_hop ? `<div class="rule"><span class="ic">${I.walk}</span><span><b>The Hop (free streetcar)</b> — ${esc(ga.the_hop.route_notes || ga.the_hop.what || '')} ${ga.the_hop.hours ? esc(ga.the_hop.hours) : ''}${src(ga.the_hop.source)}</span></div>` : ''}${ga.rideshare ? `<div class="rule"><span class="ic">${I.pin}</span><span><b>Rideshare</b> — ${esc(ga.rideshare)}</span></div>` : ''}${ga.bublr_bikes ? `<div class="rule"><span class="ic">${I.pin}</span><span><b>Bublr bikes</b> — ${esc(ga.bublr_bikes)}</span></div>` : ''}${ga.airport ? `<div class="rule"><span class="ic">${I.clock}</span><span><b>Monday flight</b> — ${esc(ga.airport.name || 'MKE')} is ${esc(String(ga.airport.from_downtown_minutes || ''))} min away. ${ga.airport.monday_3pm_flight_leave_by ? `Leave the hotel by <b>${esc(ga.airport.monday_3pm_flight_leave_by)}</b>.` : ''} ${(ga.airport.options || []).map(esc).join(' · ')}${src(ga.airport.source)}</span></div>` : ''}</div>` : ''}
      ${a && (a.safety_and_practical || []).length ? `<details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">Practical: late nights, pharmacy, urgent care, tipping</summary><ul class="rules">${a.safety_and_practical.map(x => typeof x === 'string' ? `<li class="rule"><span class="ic">${I.info}</span><span>${esc(x)}</span></li>` : x.lat ? `<li class="rule"><span class="ic">${I.pin}</span><span><b><a href="#" data-sheet="${esc(x.id)}">${esc(x.name)}</a></b> — ${esc(x.blurb || x.note || '')} <a href="${esc(gmaps(x))}" target="_blank" rel="noopener">Maps</a></span></li>` : `<li class="rule"><span class="ic">${I.info}</span><span><b>${esc(x.topic || x.name || '')}</b> — ${esc(x.note || '')}${x.location && x.location.lat ? ` <a href="#" data-sheet="${esc(x.location.id)}">${esc(x.location.name)}</a>` : ''}${src(x.source)}</span></li>`).join('')}</ul></details>` : ''}`;
  }

  function renderFacts(a) {
    const b = body('facts'); if (!a) return pending('facts');
    b.innerHTML = `${(a.fun_facts || []).length ? factsList(a.fun_facts, 6) : ''}
      ${(a.neighborhoods || []).length ? `<details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">The neighborhoods, in one line each</summary><ul class="rules">${a.neighborhoods.map(n => `<li class="rule"><span class="ic">${I.pin}</span><span><b>${esc(n.name)}</b>${n.walk_minutes_from_venue != null ? ` <span class="label">${n.walk_minutes_from_venue} min</span>` : ''} — ${esc(n.what || '')} ${esc(n.why || '')}</span></li>`).join('')}</ul></details>` : ''}
      ${a.weather_and_packing ? `<details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">What to wear</summary><p class="prose" style="margin-top:6px">${esc(a.weather_and_packing.typical_late_october || '')}</p><ul class="rules" style="margin-top:6px">${(a.weather_and_packing.packing_tips || []).map(t => `<li class="rule"><span class="ic">${I.check}</span><span>${esc(t)}</span></li>`).join('')}</ul></details>` : ''}`;
  }

  function renderLaverne(l) {
    const b = body('laverne'); if (!l) return pending('laverne', 'Checking whether it was really filmed here');
    b.innerHTML = `
      <div class="two-col">
        <div class="prose"><p class="pull">${esc(l.hook || '')}</p>${media(l.cast_photo)}<p>${esc(l.filmed_here_truth || '')}</p>${l.synopsis ? `<p><b class="strong">The show, in a breath.</b> ${esc(l.synopsis)}</p>` : ''}</div>
        <div class="prose"><details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">The whole history, briefly</summary><div class="prose" style="margin-top:8px">${(Array.isArray(l.history) ? l.history : String(l.history || '').split(/\n\n+/)).map(p => `<p>${esc(p)}</p>`).join('')}</div></details>${l.the_chant ? `<div class="notice"><b>${esc(l.the_chant.text)}</b> — ${esc(l.the_chant.meaning || '')}${src(l.the_chant.source)}</div>` : ''}</div>
      </div>
      ${(l.cast || []).length ? `<div><span class="eyebrow">The cast, and what came next</span><div class="cast" style="margin-top:10px">${l.cast.map(c => `<figure>${imgSrc(c.image) ? `<img src="${esc(imgSrc(c.image))}" alt="${esc(c.actor)}" loading="lazy" title="${esc(c.image.credit || '')}" onerror="this.remove()">` : ''}<figcaption><b>${esc(c.actor)}</b><span class="muted">${esc(c.character)}</span><br>${esc(c.after_the_show || '')}${src(c.source)}</figcaption></figure>`).join('')}</div></div>` : ''}
      ${(l.fun_facts || []).length ? `<div style="display:flex;flex-direction:column;gap:6px"><span class="eyebrow">Fun facts</span>${factsList(l.fun_facts, 5)}</div>` : ''}
      ${(l.milwaukee_pilgrimage || []).length ? `<div><span class="eyebrow">A small pilgrimage</span>${placeList(l.milwaukee_pilgrimage, { limit: 4, line: (x) => [x.why, x.hours].filter(Boolean).map(esc).join(' · ') })}</div>` : ''}
      ${l.watch_it ? `<details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">Watch it in the hotel</summary><p class="caption" style="margin-top:6px">${esc((l.watch_it.where_to_stream || []).join(' · '))}</p><ul class="rules">${(l.watch_it.episodes_to_watch_in_the_hotel || []).map(e => `<li class="rule"><span class="ic">${I.star}</span><span><b>${esc(e.title)}</b> (S${esc(e.season)}E${esc(e.episode)}) — ${esc(e.why || '')}</span></li>`).join('')}</ul></details>` : ''}`;
  }

  function renderShare(locs, share) {
    const b = body('share'); if (!b) return;
    const hotel = locs.find(l => l.category === 'hotel');
    const picks = share && share.google_maps_links ? share.google_maps_links : [];
    const kml = (share && share.kml_url) || 'wsp-milwaukee.kml';
    const mymaps = (share && share.my_maps_url) || '';
    b.innerHTML = `
      <p class="prose">${locs.length} places on this site, ready for your phone's Maps app.</p>
      <div class="share-row">
        ${mymaps ? `<a class="btn btn--primary" href="${esc(mymaps)}" target="_blank" rel="noopener">${I.pin}Open the shared Google Map</a>` : ''}
        <a class="btn ${mymaps ? '' : 'btn--primary'}" href="${esc(kml)}" download>${I.link}Download all pins (KML)</a>
        ${hotel ? `<a class="btn" href="${esc(gmaps(hotel))}" target="_blank" rel="noopener">${I.pin}Hotel in Maps</a>` : ''}
      </div>
      ${picks.length ? `<div><span class="eyebrow">Routes, one tap each</span><div class="share-row" style="margin-top:8px">${picks.map(p => `<a class="btn btn--sm" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.label)}</a>`).join('')}</div></div>` : ''}
      <details><summary class="ui" style="min-height:44px;display:flex;align-items:center;cursor:pointer">Put the KML in Google Maps on your phone</summary><ol class="kbd-steps" style="margin-top:8px"><li>On a computer, open <a href="https://www.google.com/maps/d/" target="_blank" rel="noopener">Google My Maps</a> → Create a new map → Import → choose the KML file.</li><li>Share → "Anyone with the link" → copy the link and text it to yourself.</li><li>On your phone, open the link in the Google Maps app: every pin, colored by type, with the notes attached.</li></ol></details>`;
  }

  /* ---------- Collect every location ---------- */
  function collect(d) {
    const out = [];
    const push = (x, cat) => { if (x && typeof x === 'object' && x.name) { if (cat && !x.category) x.category = cat; out.push(x); } };
    if (d.concert) { push(d.concert.venue, 'venue'); push(d.concert.hotel, 'hotel'); }
    if (d.worldseries) (d.worldseries.watch_spots || []).forEach(x => push(x, 'watch-party'));
    if (d.closure) { (d.closure.stages || []).forEach(x => push(x, 'stage')); (d.closure.food_and_drink_in_zone || []).forEach(x => push(x, 'street-food')); }
    if (d.food) { (d.food.destination || []).forEach(x => push(x, 'restaurant')); (d.food.street_food || []).forEach(x => push(x, 'street-food')); (d.food.monday_brunch_before_flight || []).forEach(x => push(x, 'restaurant')); }
    if (d.area) { (d.area.bars || []).forEach(x => push(x, 'bar')); (d.area.neighborhoods || []).forEach(n => (n.landmarks || []).forEach(x => push(x, 'landmark'))); (d.area.safety_and_practical || []).forEach(x => push(x && x.lat ? x : (x && x.location), 'practical')); (d.area.halloween_weekend || []).forEach(x => push(x && x.lat ? x : (x && x.location), 'landmark')); (d.area.wsp_official_parties || []).forEach(x => push(x, 'stage')); }
    if (d.laverne) (d.laverne.milwaukee_pilgrimage || []).forEach(x => push(x, 'laverne'));
    if (d.locations && Array.isArray(d.locations)) d.locations.forEach(x => push(x));
    const seen = {}; return out.filter(l => { if (!l.id) l.id = l.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'); if (seen[l.id]) { Object.assign(seen[l.id], Object.fromEntries(Object.entries(l).filter(([k, v]) => v != null && seen[l.id][k] == null))); return false; } seen[l.id] = l; return true; });
  }

  /* ---------- Boot ---------- */
  async function boot() {
    const wxP = WSP.weather.init();
    const names = ['concert', 'worldseries', 'closure', 'food', 'area', 'laverne', 'lineups', 'locations', 'share', 'peeps', 'notes', 'welcome', 'updates'];
    const d = Object.fromEntries(await Promise.all(names.map(async n => [n, await load(n)])));
    const locs = collect(d); locs.forEach(l => byId[l.id] = l); WSP.locations = locs;

    renderTonight(d.concert, d.worldseries, d.closure); if (scrollY < 200) nowAt.textContent = 'Tonight';
    renderConcert(d.concert); renderClosure(d.closure); renderSeries(d.worldseries);
    renderBars(d.area); renderFood(d.food); renderHotel(d.concert, d.area); renderFacts(d.area); renderLaverne(d.laverne);
    renderLineups(d.lineups);
    renderShare(locs, d.share);
    renderPeeps(d.peeps);
    WSP.map.init(locs, d.closure && d.closure.closure && d.closure.closure.polygon);
    if (d.concert && d.concert.hotel && d.concert.venue) WSP.map.mini('mini-map', d.concert.hotel, d.concert.venue);
    WSP.shell.init(d);

    const wx = await wxP;
    if (wx && wx.hourly) {
      const t = todayISO(); const idx = wx.hourly.time.findIndex(x => x.startsWith(t + 'T20'));
      const el = $('#tonight-wx'); if (el && idx >= 0) el.textContent = `${Math.round(wx.hourly.temperature_2m[idx])}° · ${wx.hourly.precipitation_probability[idx]}% rain`;
    }
    const stamp = $('#data-stamp'); const asOf = d.worldseries && d.worldseries.as_of; if (stamp && asOf) stamp.textContent = `Researched ${new Date(asOf).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', timeZone: TZ })} CT. Hours and schedules change; tap through to the source before you go.`;
  }
  boot();
})();

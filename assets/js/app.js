/* app.js (nola) — loads data/*.json, renders every card, feeds the map. Same helpers as wsp: tiles, sheets, tabs, drawer.
   Each widget renders independently: a missing or broken file leaves a quiet
   "coming soon" note and never blocks the rest of the page. */
window.WSP = window.WSP || {};
/* Michael, 2026-10-25: every link that leaves the site opens in a new tab (decided at click time, so links built later and the map's links follow too) */
document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href]'); if (!a) return; let u; try { u = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
  if ((u.protocol === 'http:' || u.protocol === 'https:') && u.origin !== location.origin) { a.target = '_blank'; a.rel = 'noopener'; } }, true);
  /* The hero: each day is done, now or ahead, in New Orleans time. */
  WSP.heroType = function () {
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const cities = [...document.querySelectorAll('.h2-day[data-from]')];
    cities.forEach((d, i) => { const from = d.dataset.from, next = cities[i + 1] ? cities[i + 1].dataset.from : null, to = d.dataset.to;
      const st = ymd < from ? 'ahead' : (next ? ymd < next : ymd <= to) ? 'today' : 'past';
      d.dataset.state = st; const t = d.querySelector('.h2-state'); if (t) t.textContent = st === 'past' ? ', done' : st === 'today' ? ', now' : ''; });
  };
  const heroGo = () => { WSP.heroType();
    document.addEventListener('click', (e) => { const a = e.target.closest('[data-hero-go]'); if (!a) return; const ch = a.dataset.heroGo;
      if (WSP.shell && WSP.shell.go) { e.preventDefault(); history.replaceState(null, '', '#' + (a.dataset.heroCard || 'scene-' + ch));
        const first = (a.dataset.heroCard && document.getElementById(a.dataset.heroCard)) || document.querySelector(`#scene-${ch} > section.w:not([hidden]):not([data-nocollapse])`); if (first && WSP.shell.setOpen) WSP.shell.setOpen(first, true);
        setTimeout(() => {
          if (a.dataset.heroCard && first) {   /* a named card: land on the card itself */
            WSP.shell.go(ch, { scroll: false }); const nav = document.querySelector('.site-nav'); const top = first.getBoundingClientRect().top + scrollY - (nav ? nav.offsetHeight : 0) - 12;
            scrollTo({ top: Math.max(0, top), behavior: WSP.motion() }); const t = first.querySelector('.w-toggle'); if (t) t.focus({ preventScroll: true });
          } else { WSP.shell.go(ch); const t = document.querySelector(`#scene-${ch} [data-chapter-toggle]`); if (t) t.focus({ preventScroll: true }); }
        }, 50); } }); };  /* review 5: focus follows */   /* review 2: open the first card, then land on the category head */  /* review 2: land on the first card, open */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', heroGo); else heroGo();
  setInterval(() => WSP.heroType && WSP.heroType(), 5 * 60 * 1000);
  /* review 3: arrow keys move along a tab row, as tabs should */
  document.addEventListener('keydown', (e) => { const t = e.target.closest && e.target.closest('[role=tab]'); if (!t || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const all = [...t.parentNode.querySelectorAll('[role=tab]')]; let i = all.indexOf(t);
    i = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length;
    e.preventDefault(); all[i].focus(); all[i].click(); });
  WSP.motion = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth');
(function () {
  const I = WSP.icons.ui, TZ = 'America/Chicago';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
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
  /* a source can be one URL, a list, or several URLs in one string: each becomes its own small link */
  function src(url, label) { const u = [].concat(url || []).join(' ').split(/[\s;,]+/).filter(x => /^https?:\/\//.test(x)); return u.map((x, i) => ` <a class="src" href="${esc(x)}" target="_blank" rel="noopener" title="Source">${label || 'source'}${u.length > 1 ? ' ' + (i + 1) : ''}</a>`).join(''); }
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
  /* A tile: the picture, the name, one line, and Read more. The rest lives in the sheet. */
  function tile(o) {
    const img = o.art ? `<span class="tile-img tile-garn" style="--c:var(--wsp-cat-${esc(o.cat || 'landmark')})">${o.art}</span>` : o.img ? `<img class="tile-img" src="${esc(o.img)}" alt="" loading="lazy" onerror="this.classList.add('is-gone')">` : `<span class="tile-img tile-cat" style="--c:var(--wsp-cat-${esc(o.cat || 'landmark')})"></span>`;
    const bare = o.bare || (!o.art && !o.img);   /* no picture: no placeholder block */
    return `<li class="tile${bare ? ' tile--bare' : ''}" ${o.attrs || ''}>${bare ? '' : img}<div class="tile-t"><h3>${esc(o.name)}</h3>${o.line ? `<p class="tile-line">${o.line}</p>` : ''}</div><button class="btn btn--sm tile-more" type="button" aria-label="Read more: ${esc(o.name)}" ${o.open}>Read more</button></li>`;
  }
  function placeRow(loc, opts = {}) {
    const cat = loc.category || 'landmark';
    const bits = []; if (loc.walk_from_venue_minutes != null) bits.push(`${loc.walk_from_venue_minutes} min walk`); else if (loc.walk_from_riverside_miles != null) bits.push(`${loc.walk_from_riverside_miles} mi`); if (loc.price) bits.push(esc(loc.price));
    const line = opts.line ? opts.line(loc) : bits.join(' · ');
    return tile({ img: imgSrc(loc.image), cat, name: loc.name, line, open: `data-sheet="${esc(loc.id)}"`, attrs: `data-id="${esc(loc.id)}"` });
  }
  /* Blocks of info that are not places (cast, mascots, bands): the same tile, the content in the sheet. */
  const modals = {}; let modalN = 0;
  function modal(html) { const id = 'm' + (++modalN); modals[id] = html; return `data-modal="${id}"`; }
  const FOLD = 6;
  function factsList(arr, limit = 6, cls = '') {
    arr = arr || []; const rows = arr.map((f, i) => `<li ${i >= limit ? 'data-folded ' : ''}><span class="n num">${i + 1}</span><span>${esc(typeof f === 'string' ? f : f.fact || f.text)}${src(typeof f === 'string' ? '' : f.source)}</span></li>`);
    const more = arr.length > limit ? `<button class="btn btn--sm fold-btn" type="button" data-fold-n="${arr.length - limit}">Show ${arr.length - limit} more</button>` : '';
    return `<ul class="facts-list places${arr.length > limit ? ' folded' : ''} ${cls}">${rows.join('')}</ul>${more}`;
  }
  function placeList(arr, opts = {}) {
    arr = arr || []; const limit = opts.limit || FOLD;
    const rows = arr.map((l, i) => placeRow(l, opts).replace('<li class="tile"', `<li ${i >= limit ? 'data-folded ' : ''}class="tile"`));
    const more = arr.length > limit ? `<button class="btn btn--sm fold-btn" type="button" data-fold-n="${arr.length - limit}">Show ${arr.length - limit} more</button>` : '';
    return `<ul class="tiles${arr.length > limit ? ' folded' : ''}">${rows.join('')}</ul>${more}`;
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
      WSP.sheet._show();
    },
    _show() { const sh = $('#sheet'); WSP.sheet._from = document.activeElement; sh.setAttribute('aria-modal', 'true'); sh.classList.add('open'); sh.setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('open'); sh.scrollTop = 0; const m = $('main'); if (m && !sh.closest('main')) m.inert = true; ['.site-header', '.site-nav', 'footer'].forEach(q => { const x = $(q); if (x) x.inert = true; });  /* review 4: focus stays in the sheet */ const c = $('#sheet-close'); if (c) setTimeout(() => c.focus(), 30); },
    openHTML(html) {
      const sb = $('#sheet-body'); if (!sb) return; sb.innerHTML = html;
      WSP.sheet._show();
    },
    close() { const sh = $('#sheet'); if (!sh.classList.contains('open')) return; sh.classList.remove('open'); sh.setAttribute('aria-hidden', 'true'); $('#scrim').classList.remove('open'); const m = $('main'); if (m) m.inert = false; ['.site-header', '.site-nav', 'footer'].forEach(q => { const x = $(q); if (x) x.inert = false; }); if (WSP.sheet._from && WSP.sheet._from.focus) WSP.sheet._from.focus(); WSP.sheet._from = null; }
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-sheet]'); if (a) { e.preventDefault(); const l = byId[a.dataset.sheet]; if (l) WSP.sheet.openLocation(l); return; }
    const m = e.target.closest('[data-modal]'); if (m) { e.preventDefault(); if (modals[m.dataset.modal]) WSP.sheet.openHTML(modals[m.dataset.modal]); return; }
    const f = e.target.closest('[data-focus]'); if (f) { e.preventDefault(); WSP.sheet.close(); WSP.map.focus(f.dataset.focus); return; }
    if (e.target.closest('#sheet-close') || e.target.id === 'scrim') WSP.sheet.close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') WSP.sheet.close(); });

  /* ---------- Theme toggle ---------- */
  if ($('#theme-toggle')) $('#theme-toggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next); try { localStorage.setItem('nola-theme', next); } catch (e) {}
  });

  /* ---------- Menu: a drawer from the left over a light scrim (Michael 2026-10-24 00:46) ---------- */
  const mega = $('#mega'), menuBtn = $('#menu-btn'), scrim = $('#mega-scrim');
  const sectionTitle = (id) => { const h = $(`#${id} > header h2`) || $(`#${id} h2`); return h ? h.textContent.trim() : id; };
  const isOpen = () => mega.classList.contains('is-open');
  function setMenu(open, focusBack) {
    mega.classList.toggle('is-open', open); if (scrim) scrim.classList.toggle('is-on', open);
    mega.inert = !open; mega.setAttribute('aria-hidden', String(!open));
    document.documentElement.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      const cur = document.body.dataset.chapter || '';
      $$('.mega-cat', mega).forEach(a => { if (a.dataset.chapterLink === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      setTimeout(() => { const f = $('.mega-cat[aria-current]', mega) || $('.mega-cat', mega); if (f) f.focus({ preventScroll: true }); }, 60);
    } else if (focusBack) menuBtn.focus({ preventScroll: true });
  }
  // the drawer and its scrim live at the top of the page's stacking order, not inside the sticky bar
  if (scrim) document.body.append(scrim); document.body.append(mega);
  mega.hidden = false; setMenu(false);
  menuBtn.addEventListener('click', () => setMenu(!isOpen(), true));
  if (scrim) scrim.addEventListener('click', () => setMenu(false, true));
  const closeBtn = $('.mega-close', mega); if (closeBtn) closeBtn.addEventListener('click', () => setMenu(false, true));
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { setMenu(false, true); return; }
    if (e.key === 'Tab') { const f = $$('button, a', mega); const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
  // a swipe toward the left closes it
  let sx = null; mega.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  mega.addEventListener('touchend', (e) => { if (sx !== null && sx - e.changedTouches[0].clientX > 60) setMenu(false, true); sx = null; }, { passive: true });
  mega.addEventListener('click', (e) => {
    const x = e.target.closest('a.mega-xl');
    if (x) { setMenu(false); if (x.dataset.x === 'top') { e.preventDefault(); scrollTo({ top: 0, behavior: WSP.motion() }); history.replaceState(null, '', location.pathname); const h = document.querySelector('.h2-btn'); if (h) setTimeout(() => h.focus({ preventScroll: true }), 60); } return; }
    const a = e.target.closest('a.mega-cat'); if (!a) return;
    e.preventDefault(); setMenu(false);
    const ch = a.dataset.chapterLink;
    if (WSP.shell && WSP.shell.go) WSP.shell.go(ch);
    history.replaceState(null, '', '#scene-' + ch);
    setTimeout(() => { const t = document.querySelector(`#scene-${ch} [data-chapter-toggle]`) || document.querySelector(`#scene-${ch} h2`); if (t) { if (!t.matches('button, a')) t.tabIndex = -1; t.focus({ preventScroll: true }); } }, 80);  /* review 4: focus follows her to the category */
  });

  /* ---------- Shared pieces for the trip ---------- */
  const arr = (x) => Array.isArray(x) ? x : (x == null || x === '' ? [] : [x]);
  const known = (v) => v != null && v !== '' && !/^\s*(not found|unknown|n\/a|tbd)\b/i.test(String(v));
  const txt = (v) => known(v) ? esc(String(v)) : '';
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const isoDates = (v) => [...String(Array.isArray(v) ? v.join(' ') : (v || '')).matchAll(/(\d{4})-(\d{2})-(\d{2})/g)].map(m => m[0]);
  const dLabel = (iso, wd) => { const d = new Date(iso + 'T12:00:00'); return `${wd ? WD[d.getDay()] + ' ' : ''}${MON[d.getMonth()]} ${d.getDate()}`; };
  /* "2026-10-28/2026-11-01" reads as a run, a list reads as days, one date reads with its weekday */
  function when(v) {
    const ds = isoDates(v); if (!ds.length) return txt(Array.isArray(v) ? v.join(', ') : v);
    const ranged = !Array.isArray(v) && ds.length === 2 && /\d\s*(\/|to|–|—|-\s|through|until)\s*\d|\d\/\d/.test(String(v));
    if (ds.length === 1) return dLabel(ds[0], true);
    if (ranged || (Array.isArray(v) && v.length === 2 && /\//.test(v.join('')))) return `${dLabel(ds[0])} – ${dLabel(ds[1])}`;
    return ds.map((x, i) => i && x.slice(5, 7) === ds[i - 1].slice(5, 7) ? String(Number(x.slice(8))) : dLabel(x)).join(', ');
  }
  /* is it on today, and has it all gone by? (New Orleans time) */
  function span(v) { const ds = isoDates(v).sort(); if (!ds.length) return null; const ranged = !Array.isArray(v) && ds.length === 2; return { first: ds[0], last: ds[ds.length - 1], all: ranged ? null : ds }; }
  const onToday = (v) => { const s = span(v), t = todayISO(); if (!s) return false; return s.all ? s.all.includes(t) : s.first <= t && t <= s.last; };
  const gone = (v) => { const s = span(v); return !!s && s.last < todayISO(); };
  const srcList = (urls) => { const u = [...new Set(arr(urls).join(' ').split(/[\s;,]+/).filter(x => /^https?:\/\//.test(x)))]; return u.length ? `<p class="caption src-list">Sources: ${u.map((x, i) => `<a href="${esc(x)}" target="_blank" rel="noopener">${esc(host(x))}</a>`).join(', ')}</p>` : ''; };
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'source'; } };
  const row = (k, v) => v ? `<p class="bm-garn"><b>${k}:</b> ${v}</p>` : '';
  const pill = (href, label, icon, cls = '') => href && /^(https?:|tel:)/.test(href) ? `<a class="link-pill ${cls}" href="${esc(href)}" target="_blank" rel="noopener">${icon}${label}</a>` : '';
  const mapsFor = (p) => p.gmaps_url || WSP.map.gmapsFallback(p);
  const onMap = (p) => typeof p.lat === 'number' && typeof p.lng === 'number' && p.id ? `<button class="link-pill" data-focus="${esc(p.id)}">${I.pin}On map</button>` : '';
  function tabs(bd, key, groups) {
    groups = groups.filter(g => g && g[2]);
    if (!groups.length) return;
    bd.innerHTML = `<div class="tabs" role="tablist">${groups.map(([id, l], i) => `<button class="tab" role="tab" id="${key}-${id}" aria-selected="${i === 0}" aria-controls="${key}p-${id}" tabindex="${i ? -1 : 0}">${esc(l)}</button>`).join('')}</div>${groups.map(([id, , html], i) => `<div role="tabpanel" id="${key}p-${id}" aria-labelledby="${key}-${id}" ${i ? 'hidden' : ''}>${html}</div>`).join('')}`;
    bd.querySelector('.tabs').addEventListener('click', (e) => { const t = e.target.closest('.tab'); if (!t) return; bd.querySelectorAll('.tab').forEach(x => { x.setAttribute('aria-selected', x === t); x.tabIndex = x === t ? 0 : -1; }); bd.querySelectorAll('[role=tabpanel]').forEach(x => x.hidden = x.id !== t.getAttribute('aria-controls')); });
  }
  /* a tile line: no asides, no year, en dashes, nothing "not found" */
  const tidy = (t) => String(t || '').replace(/\s*\([^)]*\)/g, '').replace(/,?\s*2026\b/g, '').replace(/\s+-\s+/g, ' – ').replace(/(\d)-(\d)/g, '$1–$2').split(/[.;]\s/).filter(x => !/not found/i.test(x))[0] || '';
  const roastLine = (sig) => { if (!known(sig)) return ''; const parts = String(sig).split(/[,;.(]\s*/).map(x => x.trim()).filter(Boolean); return parts.find(x => /cochinillo|suckling|lech[oó]n|cordero|lamb|roast|asado/i.test(x)) || parts[0]; };
  const tiles = (list) => list.length ? `<ul class="tiles">${list.join('')}</ul>` : '';
  const ruleList = (list, k = 'note') => { list = arr(list).filter(x => x && (typeof x === 'string' || x[k])); return list.length ? `<ul class="rules">${list.map(t => `<li class="rule"><span class="ic">${I.info}</span><span>${esc(typeof t === 'string' ? t : t[k])}${typeof t === 'string' ? '' : src(t.source)}</span></li>`).join('')}</ul>` : ''; };
  /* a dated list: the year in the margin, the fact beside it, its source after it */
  const yearList = (list, k = 'fact') => { list = arr(list).filter(x => x && x[k]); return list.length ? `<ol class="yr-list">${list.map(f => `<li><span class="yr num">${esc(f.year || '')}</span><span>${esc(f[k])}${src(f.source)}</span></li>`).join('')}</ol>` : ''; };

  /* ================= NOLA ================= */
  const P = {};   /* every place by id */
  const DAYS = [['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
  /* a small picture for each kind of place, drawn in its category color */
  const ART = {
    panic: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 34c6-14 10-20 16-20s10 6 16 20" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="12" r="4" fill="currentColor"/><path d="M14 38h20" stroke="currentColor" stroke-width="3"/></svg>',
    music: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 22h22l10-8v20l-10-8H8z" fill="currentColor"/><circle cx="40" cy="24" r="3" fill="currentColor"/></svg>',
    food: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 26c0-8 8-12 18-12s18 4 18 12z" fill="currentColor"/><path d="M6 30h36v4H6z" fill="currentColor"/></svg>',
    drink: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 10h28L24 26z" fill="currentColor"/><path d="M24 26v12M16 40h16" stroke="currentColor" stroke-width="3"/></svg>',
    art: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="10" width="32" height="26" fill="none" stroke="currentColor" stroke-width="3"/><path d="M12 32l9-10 7 7 4-4 6 7z" fill="currentColor"/></svg>',
    halloween: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6c-9 0-15 7-15 16v20l5-4 5 4 5-4 5 4 5-4 5 4V22c0-9-6-16-15-16z" fill="currentColor"/><circle cx="19" cy="22" r="3" fill="var(--tile-bg, #fff)"/><circle cx="29" cy="22" r="3" fill="var(--tile-bg, #fff)"/></svg>',
    hotel: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 40V18l16-10 16 10v22z" fill="currentColor"/></svg>' };
  const longDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  /* ---------- the place sheet: the line, the check-first note, the facts, then the links and sources ---------- */
  function placeHTML(p, back) {
    const cat = (WSP.map.CATS[p.category] || {}).label || '';
    return `${back ? `<button class="btn btn--sm sheet-back" type="button" data-back>${esc('Back to ' + back)}</button>` : ''}
      <span class="eyebrow"><span class="dot" style="display:inline-block;width:9px;height:9px;background:var(--wsp-cat-${esc(p.category)});margin-right:8px;vertical-align:middle"></span>${esc([cat, p.area].filter(Boolean).join(' · '))}</span>
      ${p.image ? `<figure class="media sheet-media"><img src="${esc(p.image.src)}" alt="" loading="lazy" onerror="this.closest('figure').remove()"></figure>` : ''}
      <h3 id="sheet-title" class="heading-sm">${esc(p.name)}</h3>
      ${p.blurb ? `<p class="prose"><b class="strong">${esc(p.blurb)}</b></p>` : ''}
      ${p.check ? `<p class="check-first"><b>Check first</b> ${esc(p.check)}</p>` : ''}
      ${arr(p.rows).length || p.address ? `<dl class="hrs--wide place-dl">${arr(p.rows).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}${p.address ? `<dt>Address</dt><dd>${esc(p.address)}</dd>` : ''}</dl>` : ''}
      <div class="links">${p.address || (p.lat && p.lng) ? pill(mapsFor(p), 'Maps', I.pin, 'maps') : ''}${pill(p.website, /ticketmaster|tickets/.test(p.website || '') ? 'Tickets' : 'Site', /ticket/.test(p.website || '') ? I.ticket : I.link)}${onMap(p)}</div>
      ${srcList(p.sources)}${p.image && p.image.credit ? `<p class="caption photo-credit">Photo: ${p.image.credit_url ? `<a href="${esc(p.image.credit_url)}" target="_blank" rel="noopener">${esc(p.image.credit)}</a>` : esc(p.image.credit)}</p>` : ''}`;
  }
  let backStack = null;
  WSP.sheet.openLocation = (loc) => openPlace(loc.id);
  function openPlace(id, back) { const p = P[id]; if (!p) return; WSP.sheet.openHTML(placeHTML(p, back && back.title)); backStack = back || null; }
  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-place]'); if (s) { e.preventDefault(); openPlace(s.dataset.place, null); return; }
    if (e.target.closest('[data-back]') && backStack) { e.preventDefault(); const b = backStack; backStack = null; WSP.sheet.openHTML(b.html); }
  });

  /* a tile: the picture, the name, one line, Read more */
  const lineFor = (p) => { const w = arr(p.rows).find(r => r[0] === 'When'); const near = p.miles != null && p.miles <= 0.8 ? `about ${Math.max(5, Math.round(p.miles * 1.3 * 20 / 5) * 5)} min walk` : ''; return [w ? w[1] : '', p.area, near || (p.miles != null && !p.area ? `${p.miles} mi from the hotel` : '')].filter(Boolean).join(' · '); };
  const placeTile = (p) => tile({ img: p.image && p.image.src, cat: p.category, name: p.name, line: esc(lineFor(p)), open: `data-place="${esc(p.id)}"`, attrs: `data-id="${esc(p.id)}"${p.check ? ' data-check' : ''}` });
  function renderPlaces(cardId, ids, byDay) {
    const bd = body(cardId); if (!bd) return;
    const list = arr(ids).map(id => P[id]).filter(Boolean); if (!list.length) return pending(cardId, 'Nothing found for these dates');
    const days = byDay ? DAYS.filter(([k]) => list.some(p => p.group === k)) : [];
    if (days.length < 2) { bd.innerHTML = tiles(list.map(placeTile)); return; }
    tabs(bd, cardId, days.map(([k, l]) => [k, l, tiles(list.filter(p => p.group === k).map(placeTile))]));
  }
  const rules = (list) => `<ul class="rules">${arr(list).map(x => `<li class="rule"><span class="ic">${I.info}</span><span><b>${esc(x.label)}.</b> ${esc(x.text)}${src(x.source)}</span></li>`).join('')}</ul>`;

  function renderNola(d) {
    const N = d.nola; if (!N) return;
    const c = N.cards;
    renderPlaces('shows-panic', c['shows-panic']);
    const pb = body('shows-panic'); if (pb) pb.insertAdjacentHTML('beforeend', `<p class="caption">No Panic show was found for Sunday, Nov 1.</p>`);
    renderPlaces('shows-scene', c['shows-scene'], true);
    ['music-fri', 'music-sat', 'music-sun', 'music-free'].forEach(k => renderPlaces(k, c[k]));
    ['music-frenchmen', 'music-brass'].forEach(k => renderPlaces(k, c[k], true));
    ['music-near', 'eat-near', 'eat-bloody', 'drink-near', 'eat-morning', 'eat-lunch', 'eat-dinner', 'eat-late', 'drink-bars', 'eat-sweets', 'eat-events', 'see-halloween', 'see-saints', 'see-museums', 'shop-vintage', 'shop-antiques'].forEach(k => renderPlaces(k, c[k]));
    /* the walks: stops in order, the leg from the last stop above each, a stop opens its card */
    ['fri', 'sat'].forEach(k => { const wb = body('walk-' + k), W = N.walks && N.walks[k]; if (!wb || !W) return;
      wb.innerHTML = `<p class="walk-wx">${esc(W.weather)}</p><ol class="walk">${W.stops.map((s, i) => `<li>${s.leg ? `<p class="walk-leg">${esc(s.leg)}</p>` : ''}<span class="walk-n num">${i + 1}</span><div>${s.time ? `<p class="walk-t">${esc(s.time)}</p>` : ''}<h3>${s.place && P[s.place] ? `<button class="walk-go" type="button" data-place="${esc(s.place)}">${esc(s.name)}</button>` : esc(s.name)}</h3><p class="walk-a">${esc(String(s.address).replace(/,\s*New Orleans.*$/, ''))}</p><p>${esc(s.note)}${src(s.sources)}</p></div></li>`).join('')}</ol><p class="caption">${W.miles ? `About ${W.miles} miles on foot. ` : ''}Walking times are estimates. Tap a stop for its hours.</p><p class="links"><button class="link-pill" type="button" data-walk-map="${k}">${I.pin}See the walk on the map</button></p>`; });
    /* the bus pass */
    const bb = body('shows-bus'); const B = N.bus;
    if (bb && B) bb.innerHTML = `<ul class="tkt-list">${B.nights.map(n => `<li class="tkt"><div><h3>${esc(n.day)}</h3><p>Pregame with ${esc(n.pregame)}, then the bus</p></div><div class="tkt-p">${esc(n.time)}</div></li>`).join('')}</ul>
      <ul class="rules"><li class="rule"><span class="ic">${I.pin}</span><span><b>Where.</b> ${esc(B.where)}. ${esc(B.ride)}.</span></li>
      <li class="rule"><span class="ic">${I.info}</span><span><b>What it covers.</b> ${esc(B.includes)}${src(B.sources)}</span></li>
      <li class="rule"><span class="ic">${I.info}</span><span><b>Get there by 4.</b> ${esc(B.note)}</span></li></ul>`;
    const hb = body('around-hotel'); if (hb) hb.innerHTML = rules(N.hotel_facts) + rules(N.nearby.map(x => ({ label: x.name, text: x.text, source: x.source })));
    const gb = body('around-getting'); if (gb) gb.innerHTML = rules(N.transit);
    const sb = body('around-night'); if (sb) sb.innerHTML = rules(N.safety);
    const fb = body('weather'); if (fb && N.weather_note) fb.insertAdjacentHTML('beforeend', `<p class="caption">The forecast for the weekend: ${esc(N.weather_note.text)}${src(N.weather_note.source)}</p>`);
  }

  /* ---------- Boot ---------- */
  async function boot() {
    const wxP = WSP.weather.init();
    const names = ['nola', 'places'];
    const d = Object.fromEntries(await Promise.all(names.map(async n => [n, await load(n)])));
    arr(d.places && d.places.places).forEach(p => { P[p.id] = p; byId[p.id] = p; });
    const locs = arr(d.places && d.places.pins).map(p => Object.assign({}, P[p.id] || {}, p));
    WSP.locations = locs;
    try { renderNola(d); } catch (e) { console.warn('render', e); }
    WSP.map.init(locs, 'all');
    try { WSP.map.walks(d.nola && d.nola.walks); } catch (e) { console.warn('walks', e); }
    document.addEventListener('click', (e) => { const b = e.target.closest('[data-walk-map]'); if (!b) return; e.preventDefault(); WSP.map.showWalk(b.dataset.walkMap); });
    WSP.shell.init(d);
    await wxP;
  }
  boot();
})();

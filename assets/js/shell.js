/* shell.js — how the dashboard behaves: every card starts closed, a tap opens it, a star pins it near the
   top and opens it by default, the first open shows a note from Snacks, the map stays locked until she asks,
   and the welcome runs once. Runs after app.js has rendered. Remembered on her phone only (localStorage). */
window.WSP = window.WSP || {};
WSP.shell = (function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get(k, d) { try { const v = localStorage.getItem('wsp-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('wsp-' + k, JSON.stringify(v)); } catch (e) {} } };
  const I = () => WSP.icons.ui;
  let notes = {}, welcome = null;

  /* ---------- Collapse / expand ---------- */
  function wireCards() {
    $$('main section.w').forEach(sec => {
      const header = $(':scope > header', sec), t = $('.t', header); if (!header || !t) return;
      const id = sec.id;
      const btn = document.createElement('button'); btn.className = 'w-toggle'; btn.type = 'button'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', id + '-body');
      btn.innerHTML = `<span class="chev" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></span>`;
      t.parentNode.insertBefore(btn, t); btn.appendChild(t);
      const body = $(':scope > .body', sec); if (body) body.id = id + '-body';
      if (id !== 'updates') {
        const star = document.createElement('button'); star.className = 'w-star'; star.type = 'button'; star.setAttribute('aria-pressed', 'false'); star.setAttribute('aria-label', 'Pin this card near the top'); star.title = 'Pin near the top';
        star.innerHTML = I().star; header.appendChild(star);
        star.addEventListener('click', (e) => { e.stopPropagation(); toggleStar(id); });
      }
      btn.addEventListener('click', () => setOpen(sec, sec.hasAttribute('data-collapsed')));
      sec.setAttribute('data-collapsed', '');
    });
  }
  function setOpen(sec, open, opts = {}) {
    if (typeof sec === 'string') sec = document.getElementById(sec); if (!sec) return;
    const btn = $('.w-toggle', sec);
    if (open) {
      sec.removeAttribute('data-collapsed'); btn && btn.setAttribute('aria-expanded', 'true');
      firstOpenNote(sec);
      if (sec.id === 'map' && WSP.map && WSP.map.refresh) setTimeout(WSP.map.refresh, 50);
      if (sec.id === 'hotel' && WSP.map && WSP.map.refreshMini) setTimeout(WSP.map.refreshMini, 50);
    } else { sec.setAttribute('data-collapsed', ''); btn && btn.setAttribute('aria-expanded', 'false'); if (sec.id === 'map') lockMap(true); }
    if (opts.scroll) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- First-open notes ---------- */
  function firstOpenNote(sec) {
    const id = sec.id; const n = notes[id]; if (!n) return;
    const seen = store.get('seen', {}); if (seen[id]) return;
    const body = $(':scope > .body', sec); if (!body || $('.first-note', body)) return;
    const el = document.createElement('div'); el.className = 'first-note';
    el.innerHTML = `<div class="first-note-t"><span class="eyebrow">From Snacks</span></div><div class="prose">${(Array.isArray(n) ? n : [n]).map(p => `<p>${esc(p)}</p>`).join('')}</div><button class="btn btn--sm" type="button">Got it</button>`;
    body.insertBefore(el, body.firstChild);
    $('button', el).addEventListener('click', () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 250); seen[id] = Date.now(); store.set('seen', seen); });
  }

  /* ---------- Stars ---------- */
  function stars() { return store.get('stars', []); }
  function toggleStar(id) { let s = stars(); s = s.includes(id) ? s.filter(x => x !== id) : [...s, id]; store.set('stars', s); applyStars(true); }
  function applyStars(animate) {
    const s = stars(); const grid = $('main .grid'); const all = $$('main section.w'); const original = WSP.shell.order || (WSP.shell.order = all.map(x => x.id));
    const starred = original.filter(id => s.includes(id)), rest = original.filter(id => !s.includes(id) && id !== 'updates');
    ['updates', ...starred, ...rest].forEach(id => { const el = document.getElementById(id); if (el) grid.appendChild(el); });
    all.forEach(sec => { const on = s.includes(sec.id); const b = $('.w-star', sec); if (b) { b.setAttribute('aria-pressed', String(on)); b.title = on ? 'Unpin' : 'Pin near the top'; } sec.classList.toggle('is-starred', on); if (on && animate) setOpen(sec, true); });
  }

  /* ---------- Map lock ---------- */
  function lockMap(locked) {
    const wrap = $('#map-wrap'), btn = $('#map-lock'); if (!wrap || !btn) return;
    wrap.classList.toggle('locked', locked); btn.setAttribute('aria-pressed', String(locked));
    btn.innerHTML = locked
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><span>Tap to unlock the map</span>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg><span>Lock</span>`;
    if (WSP.map && WSP.map.setInteractive) WSP.map.setInteractive(!locked);
  }
  function wireMapLock() {
    const btn = $('#map-lock'); if (!btn) return;
    btn.addEventListener('click', () => lockMap(btn.getAttribute('aria-pressed') === 'true' ? false : true));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lockMap(true); });
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { es.forEach(en => { if (!en.isIntersecting) lockMap(true); }); }, { threshold: 0 }).observe($('#map-wrap'));
    lockMap(true);
  }

  /* ---------- From Snacks (updates) ---------- */
  function renderUpdates(u) {
    const b = $('[data-widget="updates"] .body'); if (!b) return;
    const items = (u && u.updates) || [];
    const fmt = (iso) => { const d = new Date(iso); return isNaN(d) ? esc(iso) : d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }); };
    const row = (x, i) => `<article class="update${i >= 3 ? ' folded-item' : ''}${x.important ? ' important' : ''}"><div class="update-when">${fmt(x.date)}${x.important ? ' · <b>important</b>' : ''}</div><h3>${esc(x.title)}</h3><div class="prose">${[].concat(x.body || []).map(p => `<p>${esc(p)}</p>`).join('')}</div>${x.link ? `<a class="link-pill" href="${esc(x.link)}">${I().link}${esc(x.link_label || 'Open')}</a>` : ''}</article>`;
    b.innerHTML = (items.length ? items.map(row).join('') : '<p class="muted">Nothing yet. I will leave notes here as the weekend goes.</p>') +
      (items.length > 3 ? `<button class="btn btn--sm" type="button" id="updates-more">Earlier notes (${items.length - 3})</button>` : '') +
      `<p class="caption"><a href="#top" id="welcome-again-2">Read the welcome again</a></p>`;
    const more = $('#updates-more'); if (more) more.addEventListener('click', () => { $$('.folded-item', b).forEach(x => x.classList.remove('folded-item')); more.remove(); });
    const seen = store.get('updates-seen', 0); const newest = items[0] && Date.parse(items[0].date) || 0;
    if (newest > seen) { const sec = $('#updates'); sec.classList.add('has-new'); }
    $('#updates .w-toggle') && $('#updates .w-toggle').addEventListener('click', () => { store.set('updates-seen', Date.now()); $('#updates').classList.remove('has-new'); }, { once: true });
  }

  /* ---------- Welcome ---------- */
  let step = 0;
  function showWelcome() {
    if (!welcome || !welcome.steps || !welcome.steps.length) return;
    const w = $('#welcome'); w.hidden = false; document.body.classList.add('welcome-open'); step = 0; renderStep();
  }
  function hideWelcome() { $('#welcome').hidden = true; document.body.classList.remove('welcome-open'); store.set('welcomed', Date.now()); }
  function renderStep() {
    const s = welcome.steps[step]; const body = $('#welcome-body');
    const paras = (arr) => [].concat(arr || []).map(p => `<p>${esc(p)}</p>`).join('');
    body.innerHTML = `${s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span>` : ''}<h2 id="welcome-h" class="display">${esc(s.title)}</h2><div class="prose">${paras(s.body)}</div>${s.image ? `<figure class="welcome-fig"><img src="${esc(s.image)}" alt="${esc(s.image_alt || '')}">${s.caption_html ? `<figcaption class="hush">${s.caption_html}</figcaption>` : ''}</figure>` : ''}${s.body_after ? `<div class="prose">${paras(s.body_after)}</div>` : ''}`;
    $('#welcome-dots').innerHTML = welcome.steps.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('');
    const next = $('#welcome-next'); next.textContent = step === welcome.steps.length - 1 ? (welcome.done_label || 'Let’s go') : 'Next';
    $('#welcome-skip').hidden = step === welcome.steps.length - 1;
    body.scrollTop = 0;
  }
  function wireWelcome() {
    $('#welcome-next').addEventListener('click', () => { if (step < welcome.steps.length - 1) { step++; renderStep(); } else hideWelcome(); });
    $('#welcome-skip').addEventListener('click', hideWelcome);
    $('#welcome-body').addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return; e.preventDefault();
      const id = a.getAttribute('href').slice(1); const sec = document.getElementById(id); hideWelcome();
      if (!sec) return; setOpen(sec, true);
      const target = a.dataset.scrollTo ? (sec.querySelector(a.dataset.scrollTo) || sec) : sec;
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    });
    document.addEventListener('click', (e) => { if (e.target.closest('#welcome-again, #welcome-again-2')) { e.preventDefault(); showWelcome(); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#welcome').hidden) hideWelcome(); });
  }

  /* ---------- Mega-menu and in-page links open their card ---------- */
  function wireDeepLinks() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      const id = a.getAttribute('href').slice(1); const sec = document.getElementById(id);
      if (sec && sec.classList.contains('w')) setOpen(sec, true);
    }, true);
    if (location.hash) { const sec = document.getElementById(location.hash.slice(1)); if (sec && sec.classList.contains('w')) setOpen(sec, true); }
  }

  async function init(data) {
    notes = (data.notes && data.notes.widgets) || {}; welcome = data.welcome || null;
    wireCards(); applyStars(false); wireMapLock(); wireWelcome(); wireDeepLinks();
    renderUpdates(data.updates);
    setOpen('updates', true);
    stars().forEach(id => setOpen(id, true));
    if (!store.get('welcomed', 0) && welcome) showWelcome();
  }
  return { init, setOpen, lockMap, showWelcome };
})();

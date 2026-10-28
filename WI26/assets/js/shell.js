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

  /* ---------- Chapters: one scene on screen at a time; the menu jumps between them ---------- */
  let current = null;
  const scenes = () => $$('main .scene[data-chapter]');
  const chapterList = () => { const seen = []; scenes().forEach(s => { if (s.dataset.title && !seen.find(c => c.id === s.dataset.chapter)) seen.push({ id: s.dataset.chapter, title: s.dataset.title }); }); return seen; };
  function chapterOf(el) { const s = el && el.closest && el.closest('.scene[data-chapter]'); return s ? s.dataset.chapter : null; }
  function go(id, opts = {}) {
    const list = chapterList(); if (!list.find(c => c.id === id)) id = list[0].id;
    if (starsOnly) setStarsOnly(false, { silent: true });
    scenes().forEach(s => { const on = s.dataset.chapter === id; s.classList.toggle('is-on', on); const b = $('[data-chapter-toggle]', s); if (b) b.setAttribute('aria-expanded', String(on)); });
    document.body.dataset.chapter = id; current = id; if (opts.scroll !== false) landingAt = Date.now();
    if (opts.scroll !== false) { const nav = $('.site-nav'); const sc = scenes().find(s => s.dataset.chapter === id); const top = (sc || $('main')).getBoundingClientRect().top + scrollY - (nav ? nav.offsetHeight : 0) + 4; scrollTo({ top: Math.max(0, top), behavior: opts.instant ? 'instant' : WSP.motion() }); }
    if (id === 'around' && WSP.map) { setTimeout(() => { WSP.map.refresh && WSP.map.refresh(); WSP.map.refreshMini && WSP.map.refreshMini(); }, 60); }
    $$('.to-top').forEach(t => { t.hidden = true; });
  }
  function closeAll() { scenes().forEach(s => { s.classList.remove('is-on'); const b = $('[data-chapter-toggle]', s); if (b) b.setAttribute('aria-expanded', 'false'); }); current = null; document.body.dataset.chapter = ''; }
  function wireChapters() {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-chapter-toggle]'); if (!b) return;
      const id = b.dataset.chapterToggle;
      if (id === current) { closeAll(); const sc = b.closest('.scene'); const nav = $('.site-nav'); scrollTo({ top: Math.max(0, sc.getBoundingClientRect().top + scrollY - (nav ? nav.offsetHeight : 0) + 4), behavior: WSP.motion() }); } else go(id);
    });
    addEventListener('hashchange', () => { const sec = document.getElementById(location.hash.slice(1)); const ch = chapterOf(sec); if (ch && ch !== current) go(ch, { scroll: false }); });
  }

  /* ---------- Collapse / expand ---------- */
  function wireCards() {
    $$('main section.w').forEach(sec => {
      if (sec.hasAttribute('data-nocollapse')) return;
      const header = $(':scope > header', sec), t = $('.t', header); if (!header || !t) return;
      const id = sec.id;
      const btn = document.createElement('button'); btn.className = 'w-toggle'; btn.type = 'button'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', id + '-body');
      btn.innerHTML = `<span class="chev" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></span>`;
      t.parentNode.insertBefore(btn, t); btn.appendChild(t);
      const body = $(':scope > .body', sec); if (body) body.id = id + '-body';
      if (id !== 'updates') {
        const star = document.createElement('button'); star.className = 'w-star'; star.type = 'button'; star.setAttribute('aria-pressed', 'false'); star.setAttribute('aria-label', 'Star this card'); star.title = 'Star this card';
        star.innerHTML = I().star; header.appendChild(star);
        star.addEventListener('click', (e) => { e.stopPropagation(); toggleStar(id); });
      }
      btn.addEventListener('click', () => { const opening = sec.hasAttribute('data-collapsed'); setOpen(sec, opening); if (!opening && !store.get('star-tip', 0) && sec.id !== 'updates') setTimeout(showCoach, 400); /* UX review: the tip waits until she has read and closed a card, so it never covers the answer */ });
      sec.setAttribute('data-collapsed', '');
    });
  }
  function setOpen(sec, open, opts = {}) {
    if (typeof sec === 'string') sec = document.getElementById(sec); if (!sec) return;
    const btn = $('.w-toggle', sec);
    if (open) {
      const ch = chapterOf(sec); if (ch && ch !== current) go(ch, { scroll: false, instant: true });
      // one card open at a time
      const pin = sec.getBoundingClientRect().top;
      $$('main section.w:not([data-collapsed])').forEach(o => { if (o !== sec && !o.hasAttribute('data-nocollapse')) setOpen(o, false); });
      // keep her place: the card she tapped stays where her thumb was
      if (!opts.scroll) requestAnimationFrame(() => { const moved = sec.getBoundingClientRect().top - pin; if (Math.abs(moved) > 2) scrollBy({ top: moved, behavior: 'instant' }); });
      sec.removeAttribute('data-collapsed'); btn && btn.setAttribute('aria-expanded', 'true');
      firstOpenNote(sec);
      clampTall(sec);
      if (sec.id === 'map' && WSP.map && WSP.map.refresh) setTimeout(WSP.map.refresh, 50);
      if (sec.id === 'hotel' && WSP.map && WSP.map.refreshMini) setTimeout(WSP.map.refreshMini, 50);
    } else { sec.setAttribute('data-collapsed', ''); btn && btn.setAttribute('aria-expanded', 'false'); if (sec.id === 'map') lockMap(true); const body = $(':scope > .body', sec); if (body) { body.classList.remove('is-clamped'); $$('.readmore, .closebar', body).forEach(x => x.remove()); } }
    if (opts.scroll) sec.scrollIntoView({ behavior: WSP.motion(), block: 'start' });
  }

  /* review 6 and 7: in a cut card, controls below the cut leave the Tab order until Read more; worked out again after any tab switch */
  function unclipTabs(body) { $$('[data-clip-tab]', body).forEach(x => { if (x.dataset.clipTab === '') x.removeAttribute('tabindex'); else x.setAttribute('tabindex', x.dataset.clipTab); delete x.dataset.clipTab; }); }
  function clipTabs(body) {
    unclipTabs(body); return;   /* review 9: replaced by opening the card when keyboard focus goes past the cut (below) */
    const limit = +body.dataset.clampLimit || 0, bt = body.getBoundingClientRect().top, rm = $('.readmore', body), band = rm ? rm.getBoundingClientRect().height : 0;
    $$('a[href], button, input, select, textarea, iframe, summary, [tabindex]:not([tabindex="-1"])', body).forEach(x => { if (rm && rm.contains(x)) return; if (x.getBoundingClientRect().bottom - bt > limit - band - 8) { x.dataset.clipTab = x.getAttribute('tabindex') ?? ''; x.tabIndex = -1; } });
  }
  /* review 9: a focused control never sits under the sticky nav or a card's sticky Close bar */
  let tabAt = 0; var landingAt = 0; document.addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key.startsWith('Arrow')) tabAt = Date.now(); }, true);
  document.addEventListener('focusin', (e) => {
    const el = e.target; if (!el.closest || !el.closest('main')) return;
    if (Date.now() - tabAt > 400 || (landingAt > tabAt && Date.now() - landingAt < 1500)) return;   /* not for the focus a chapter landing places; yes for her own next Tab */   /* review 10: only when she moved focus herself; a scripted landing keeps its own scroll */
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect(); if (!r.height) return;
      const nav = $('.site-nav'); const top = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0;
      const own = el.closest('section.w'); const cb = own && $$('.closebar', own).find(x => { const q = x.getBoundingClientRect(); return q.height && q.top < innerHeight && !x.contains(el); });   /* review 12: only her own card's bar */
      const bottom = cb ? cb.getBoundingClientRect().top : innerHeight;
      if (r.bottom > bottom - 8) scrollBy({ top: r.bottom - bottom + 20, behavior: 'instant' });
      else if (r.top < top + 8) scrollBy({ top: r.top - top - 20, behavior: 'instant' });
    });
  });
  /* review 9: when keyboard focus reaches a control below the cut of a card, the card opens in full, so focus is never hidden behind the Read more band */
  document.addEventListener('focusin', (e) => {
    const body = e.target.closest && e.target.closest('.body.is-clamped'); if (!body || e.target.closest('.readmore')) return;
    const rmEl = $('.readmore', body); if (!rmEl) return;
    if (e.target.getBoundingClientRect().bottom <= rmEl.getBoundingClientRect().top - 4) return;   /* above the band: in view */
    const go = $('.readmore .btn--primary', body); if (go) { body.dataset.keepFocus = '1'; go.click(); delete body.dataset.keepFocus; e.target.focus(); }
  });

  /* ---------- Tall cards: 1.8 screens, then Read more; then a sticky Close ---------- */
  const LIMIT = 1.8;
  function clampTall(sec) {
    const body = $(':scope > .body', sec); if (!body || sec.id === 'map') return;
    body.classList.remove('is-clamped'); $$('.readmore, .closebar', body).forEach(x => x.remove());
    $$('[data-clip-tab]', body).forEach(x => { if (x.dataset.clipTab === '') x.removeAttribute('tabindex'); else x.setAttribute('tabindex', x.dataset.clipTab); delete x.dataset.clipTab; });
    requestAnimationFrame(() => {
      const limit = Math.round(innerHeight * LIMIT);
      if (body.scrollHeight <= limit + 120) return;
      body.classList.add('is-clamped'); body.style.setProperty('--clamp', limit + 'px');
      const rm = document.createElement('div'); rm.className = 'readmore';
      rm.innerHTML = `<button class="btn btn--primary" type="button">Read more</button><button class="btn" type="button" data-close>Close</button>`;
      body.appendChild(rm);
      body.dataset.clampLimit = limit; clipTabs(body);
      rm.querySelector('[data-close]').addEventListener('click', () => setOpen(sec, false, { scroll: true }));
      rm.querySelector('.btn--primary').addEventListener('click', () => {
        const cut = rm.getBoundingClientRect().top - 4;
        const firstHidden = body.dataset.keepFocus ? null : $$('a[href], button, input, select, summary', body).find(x => !rm.contains(x) && x.offsetParent && x.getBoundingClientRect().bottom > cut);
        body.classList.remove('is-clamped'); rm.remove();
        $$('[data-clip-tab]', body).forEach(x => { if (x.dataset.clipTab === '') x.removeAttribute('tabindex'); else x.setAttribute('tabindex', x.dataset.clipTab); delete x.dataset.clipTab; });
        if (firstHidden) firstHidden.focus();   /* scrolls into view clear of the Close bar (scroll-padding) */   /* review 8: focus goes to the first thing Read more revealed */
        const cb = document.createElement('div'); cb.className = 'closebar';
        cb.innerHTML = `<button class="btn" type="button">Close ${esc(($('h2', sec) || {}).textContent || '')}</button>`;
        body.appendChild(cb);
        cb.querySelector('button').addEventListener('click', () => setOpen(sec, false, { scroll: true }));
      });
    });
  }

  /* ---------- His note opens the card (the note is the card's lede, always there, nothing to dismiss) ---------- */
  function firstOpenNote(sec) {
    const id = sec.id; const n = notes[id]; if (!n) return;
    const body = $(':scope > .body', sec); if (!body || $('.card-lede', body)) return;
    const el = document.createElement('div'); el.className = 'card-lede';
    el.innerHTML = (Array.isArray(n) ? n : [n]).map(p => `<p>${esc(p)}</p>`).join('');
    const print = $(':scope > .print', body);
    body.insertBefore(el, print ? print.nextSibling : body.firstChild);
  }

  /* ---------- Stars ---------- */
  function stars() { return store.get('stars', []); }
  function toggleStar(id) { let s = stars(); const on = !s.includes(id); s = on ? [...s, id] : s.filter(x => x !== id); store.set('stars', s); applyStars(); }
  let starsOnly = false;
  function applyStars() {
    const s = stars(); const all = $$('main section.w');
    all.forEach(sec => { const on = s.includes(sec.id); const b = $('.w-star', sec); if (b) { b.setAttribute('aria-pressed', String(on)); b.title = on ? 'Unstar' : 'Star this card'; } sec.classList.toggle('is-starred', on); });
    if (starsOnly) collectStarred();
  }
  /* The star up top: on, only the starred cards (gathered on one page); off, everything where it lives. */
  function collectStarred() {
    const s = stars(); const view = $('#scene-stars'); const note = $('#stars-note'); if (!view) return;
    const original = WSP.shell.order || (WSP.shell.order = $$('main section.w').map(x => x.id));
    original.forEach(id => { const el = document.getElementById(id); if (!el) return; if (!el.dataset.home) el.dataset.home = el.parentElement.id || ''; if (s.includes(id)) view.insertBefore(el, note); else if (el.parentElement === view) { const home = document.getElementById(el.dataset.home); if (home) home.appendChild(el); } });
    note.innerHTML = s.length
      ? `<p>Hi Baby, every card you star lands here, in one place. Tap the star up top again and everything goes back where it was.</p>`
      : `<p>Hi Baby, nothing starred yet. Tap the star on any card and it lands here.</p>`;
  }
  function setStarsOnly(on, opts = {}) {
    starsOnly = on; const btn = $('#star-filter'); if (btn) btn.setAttribute('aria-pressed', String(on));
    document.body.classList.toggle('stars-only', on);
    if (on) {
      prevChapter = current; collectStarred();
      scenes().forEach(sc => sc.classList.toggle('is-on', sc.dataset.chapter === 'stars')); current = 'stars'; document.body.dataset.chapter = 'stars';
      if (!opts.silent) scrollTo({ top: Math.max(0, $('main').getBoundingClientRect().top + scrollY - ($('.site-nav') || {}).offsetHeight || 0), behavior: WSP.motion() });
    } else {
      $$('#scene-stars section.w').forEach(el => { const home = document.getElementById(el.dataset.home); if (home) home.appendChild(el); });
      if (!opts.silent) go(prevChapter || 'home', { scroll: false });
    }
  }
  let prevChapter = null;
  function wireStarFilter() {
    const btn = $('#star-filter'); if (!btn) return; btn.innerHTML = I().star;
    btn.addEventListener('click', () => setStarsOnly(!starsOnly));
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
    /* Michael, 2026-10-24 19:21: his own note stays pinned above the automatic ones; the newest automatic note stays open under it */
    const all = (u && u.updates) || [];
    const items = all.filter(x => x.pin).concat(all.filter(x => !x.pin));
    const firstAuto = items.findIndex(x => !x.pin);
    const greet = (t) => String(t).replace(/^Hey Baby\b/, 'Hi Baby');
    const fmt = (iso) => { const d = new Date(iso); return isNaN(d) ? esc(iso) : d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }); };
    const seen0 = store.get('updates-seen', 0);
    const row = (x, i) => `<article class="update${!x.pin && i !== firstAuto ? ' folded-item' : ''}${x.important ? ' important' : ''}"><div class="update-when">${fmt(x.date)}${(Date.parse(x.date) || 0) > seen0 ? ' <span class="update-new">New</span>' : ''}</div>${x.title ? `<h3>${esc(x.title)}</h3>` : ''}<div class="prose">${[].concat(x.body || []).map(p => `<p>${esc(greet(p))}</p>`).join('')}</div>${x.sign ? `<p class="update-sign">${esc(x.sign)}</p>` : ''}${x.link ? `<a class="link-pill" href="${esc(x.link)}"${/^#scene-[\w-]+$/.test(x.link) ? ` data-hero-go="${esc(x.link.slice(7))}"` : ''}>${I().link}${esc(x.link_label || 'Open')}</a>` : ''}</article>`;
    b.innerHTML = (items.length ? items.map(row).join('') : '<p class="muted">Nothing yet. I will leave notes here as the weekend goes.</p>') +
      (items.filter((x, i) => !x.pin && i !== firstAuto).length ? `<button class="btn btn--sm letter-more" type="button" id="updates-more" aria-expanded="false">Earlier notes (${items.filter((x, i) => !x.pin && i !== firstAuto).length})</button>` : '') +
      `<p class="caption"><a href="#top" id="welcome-again-2">Read the welcome again</a></p>`;
    const more = $('#updates-more'); if (more) more.addEventListener('click', () => { $$('.folded-item', b).forEach(x => x.classList.remove('folded-item')); more.remove(); });
    const seen = store.get('updates-seen', 0); const newest = Math.max(0, ...items.map(x => Date.parse(x.date) || 0));
    // the letter is open, so being on the page is reading it: the New mark shows this visit, then clears
    if (newest > seen) store.set('updates-seen', Date.now());
  }

  /* ---------- Welcome ---------- */
  let step = 0;
  function showWelcome() {
    if (!welcome || !welcome.steps || !welcome.steps.length) return;
    const w = $('#welcome'); welcomeFrom = document.activeElement; w.hidden = false; document.body.classList.add('welcome-open'); step = 0; renderStep();
    behind(true); setTimeout(() => { const f = w.querySelector('button, a[href], [tabindex]:not([tabindex="-1"])'); if (f) f.focus({ preventScroll: true }); }, 30);
  }
  /* review 5: the welcome holds focus like the place sheet: the page behind it goes inert, and focus returns to the opener */
  let welcomeFrom = null;
  function behind(on) { ['.site-header', '.site-nav', 'main', 'footer'].forEach(q => { const x = $(q); if (x) x.inert = on; }); }
  function hideWelcome() { $('#welcome').hidden = true; document.body.classList.remove('welcome-open'); store.set('welcomed', Date.now()); behind(false);
    const back = welcomeFrom && document.contains(welcomeFrom) && welcomeFrom !== document.body && !welcomeFrom.closest('#mega, [inert]') ? welcomeFrom : (welcomeFrom && welcomeFrom.closest && welcomeFrom.closest('#mega') ? $('#menu-btn') : ($('.h2-btn') || $('#menu-btn')));   /* first visit: the top of the page */   /* from the drawer: back to Menu */ if (back && back.focus) back.focus({ preventScroll: true }); welcomeFrom = null; }
  function renderStep() {
    const s = welcome.steps[step]; const body = $('#welcome-body');
    const paras = (arr) => [].concat(arr || []).map(p => `<p>${esc(p)}</p>`).join('');
    const spotify = (sp) => sp && sp.id ? `<div class="spotify"><iframe src="https://open.spotify.com/embed/${esc(sp.type || sp.kind || 'album')}/${esc(sp.id)}?utm_source=generator&theme=0" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify player"></iframe></div>` : '';
    const block = (b) => {
      switch (b.type) {
        case 'lede': return `<p class="wb-lede">${esc(b.text)}</p>`;
        case 'big': return `<p class="wb-big">${esc(b.text)}</p>`;
        case 'strip': return `<p class="wb-strip"><span class="strip">${esc(b.text)}</span></p>`;
        case 'fact': return `<p class="wb-fact">${b.k ? `<span class="wb-k">${esc(b.k)}</span>` : ''}${esc(b.text)}</p>`;
        case 'sign': return `<p class="wb-sign">${esc(b.text)}${b.name ? `<span class="wb-name">${esc(b.name)}</span>` : ''}</p>`;
        case 'space': return `<div class="wb-space" aria-hidden="true"></div>`;
        case 'image': return `<figure class="welcome-fig print" style="--tilt:${Number(b.tilt || 0)}deg"><img src="${esc(b.src)}" alt="${esc(b.alt || '')}">${b.caption_html ? `<figcaption class="hush">${b.caption_html}</figcaption>` : ''}</figure>`;
        case 'spotify': return spotify({ type: b.kind || 'album', id: b.id });
        default: return `<p class="wb-p">${esc(b.text || '')}</p>`;
      }
    };
    const content = s.blocks ? `<div class="wb">${s.blocks.map(block).join('')}</div>`
      : `<div class="prose">${paras(s.body)}</div>${s.image ? `<figure class="welcome-fig"><img src="${esc(s.image)}" alt="${esc(s.image_alt || '')}">${s.caption_html ? `<figcaption class="hush">${s.caption_html}</figcaption>` : ''}</figure>` : ''}${s.body_after ? `<div class="prose">${paras(s.body_after)}</div>` : ''}${spotify(s.spotify)}`;
    body.innerHTML = `${s.image_top ? `<img class="print-top" src="${esc(s.image_top)}" alt="${esc(s.image_top_alt || '')}">` : ''}${s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span>` : ''}<h2 id="welcome-h" class="display">${esc(s.title)}</h2>${content}`;
    $('#welcome-dots').innerHTML = welcome.steps.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('');
    const next = $('#welcome-next'); next.textContent = step === welcome.steps.length - 1 ? (welcome.done_label || 'Let’s go') : 'Next';
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
      setTimeout(() => target.scrollIntoView({ behavior: WSP.motion(), block: 'start' }), 80);
    });
    document.addEventListener('click', (e) => { if (e.target.closest('#welcome-again, #welcome-again-2')) { e.preventDefault(); showWelcome(); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#welcome').hidden) hideWelcome(); });
  }

  /* ---------- The star, explained once ---------- */
  function showCoach() {
    if (store.get('star-tip', 0)) return;
    const star = $('.scene.is-on section.w:not([data-collapsed]) .w-star'); const coach = $('#coach'); if (!star || !coach) return;
    const sec = star.closest('section'); sec.scrollIntoView({ block: 'start', behavior: 'instant' });
    setTimeout(() => {
      const r = star.getBoundingClientRect(); coach.hidden = false; coach.classList.add('open');
      const note = $('#coach-note'); const nr = note.getBoundingClientRect();
      // arrow: from the note's top-right to just under the star, hand-drawn curve
      const x1 = Math.min(nr.right - 40, innerWidth - 60), y1 = nr.top + 8, x2 = r.left + r.width / 2, y2 = r.bottom + 6;
      const cx = x2 + 28, cy = (y1 + y2) / 2 + 20;
      const svg = $('#coach-arrow'); svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
      svg.innerHTML = `<path d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 5"/><path d="M${x2 - 11} ${y2 + 14} L${x2} ${y2} L${x2 + 12} ${y2 + 12}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
      star.classList.add('is-pointed');
    }, 350);
    const done = () => { coach.classList.remove('open'); setTimeout(() => { coach.hidden = true; }, 250); star.classList.remove('is-pointed'); store.set('star-tip', Date.now()); };
    $('#coach-ok').addEventListener('click', done, { once: true });
    coach.addEventListener('click', (e) => { if (e.target === coach) done(); });
    star.addEventListener('click', done, { once: true });
  }

  /* ---------- Floating Top button ---------- */
  function wireTop() {
    const t = $('#to-top'); if (!t) return;
    const update = () => { t.hidden = scrollY < innerHeight * 1.2; };
    addEventListener('scroll', update, { passive: true }); update();
    t.addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: WSP.motion() }); });
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
    wireCards(); applyStars(); wireChapters(); wireStarFilter(); wireMapLock(); wireWelcome();
    renderUpdates(data.updates);
    const start = location.hash && document.getElementById(location.hash.slice(1));
    // every category starts collapsed; a deep link still opens its own category and card
    if (start && chapterOf(start)) go(chapterOf(start), { scroll: false, instant: true }); else closeAll();
    wireDeepLinks();
    wireTop();
    if (welcome) showWelcome();
  }
  return { init, setOpen, lockMap, showWelcome, go, chapterOf, setStarsOnly, closeAll };
})();

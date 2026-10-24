/* layer.js — the this layer's own additions. Loaded last; touches nothing it doesn't own.
   1. The next thing, in the sticky bar: whichever comes next of the block opening, Wolph, doors,
      first pitch and showtime, from the same data files the cards use.
   2. One picture, one place: an in-card print is dropped when the same picture already runs
      as a spread, a spot or a chapter band. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 1. The next thing ---------- */
  // The weekend sits inside Central Daylight Time (UTC-5) until Nov 1, so the offset is fixed.
  function at(date, t) {
    var m = String(t || '').match(/(\d{1,2}):(\d{2})\s*([AP]M)/i); if (!m) return null;
    var h = (+m[1] % 12) + (/p/i.test(m[3]) ? 12 : 0);
    return new Date(date + 'T' + String(h).padStart(2, '0') + ':' + m[2] + ':00-05:00');
  }
  function short(t) { return String(t).replace(':00', '').replace(/\s*([AP])M/i, function (_, a) { return a.toLowerCase() === 'a' ? ' am' : ' pm'; }); }
  function load(n) { return fetch('data/' + n + '.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }

  Promise.all([load('concert'), load('worldseries'), load('closure')]).then(function (d) {
    var c = d[0], ws = d[1], cl = d[2], ev = [];
    ((c && c.shows) || []).forEach(function (s) {
      ev.push({ t: at(s.date, s.doors), k: 'Doors', v: s.doors, d: s.date });
      ev.push({ t: at(s.date, s.show), k: 'Panic', v: s.show, d: s.date });
    });
    ((ws && ws.games) || []).forEach(function (g) { if (g.game && g.date <= '2026-10-25') ev.push({ t: at(g.date, g.first_pitch_central), k: 'First pitch', v: g.first_pitch_central, d: g.date }); });
    (((cl && cl.event) || {}).hours_by_day || []).forEach(function (h) {
      ev.push({ t: at(h.date, h.open), k: 'Block opens', v: h.open, d: h.date });
      ev.push({ t: at(h.date, h.music), k: 'Wolph', v: String(h.music || '').replace(/\s*\(.*\)\s*$/, ''), d: h.date });
    });
    ev = ev.filter(function (e) { return e.t; }).sort(function (a, b) { return a.t - b.t; });
    var el = $('#next-up'); if (!el) return;
    function paint() {
      var now = new Date(), next = ev.find(function (e) { return e.t > now; });
      if (!next) { el.textContent = 'Oct 23–25 · the run'; return; }
      var today = now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
      var day = next.d === today ? '' : '<span class="nu-day">' + new Date(next.d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }) + ' · </span>';
      var mins = Math.round((next.t - now) / 60000), inN = '';
      if (next.d === today && mins < 180) inN = mins < 60 ? ' · in ' + mins + ' min' : ' · in ' + Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min';
      el.innerHTML = '<b class="nu-v">' + short(next.v) + '</b><span class="nu-k">' + day + next.k + '</span><span class="nu-in">' + inN + '</span>';
    }
    paint(); setInterval(paint, 30000);
  });

  /* ---------- 2. One picture, one place ---------- */
  function file(u) { return String(u || '').split('/').pop().split('?')[0]; }
  function dedupe() {
    var used = {};
    $$('.art-break img').forEach(function (i) { used[file(i.getAttribute('src'))] = 1; });
    $$('.space-img, .cat-thumb, .w-thumb').forEach(function (i) { used[file(i.getAttribute('src'))] = 1; });
    $$('section.w > .body > figure.print img').forEach(function (i) { if (used[file(i.getAttribute('src'))]) i.closest('figure').remove(); });
  }
  var tries = 0;
  (function wait() { if ($('section.w figure.print') || tries++ > 40) dedupe(); else setTimeout(wait, 150); })();

  /* ---------- 3. Over a card, the nav pieces get a ground in the chapter's color ---------- */
  var ticking = false;
  function navGround() {
    ticking = false;
    var nav = $('.site-nav'); if (!nav) return;
    var y = nav.getBoundingClientRect().top + 74, hits = [24, innerWidth / 2, innerWidth - 24].map(function (x) { return document.elementFromPoint(x, y); });
    var over = hits.some(function (el) { return el && el.closest && el.closest('section.w, .art-break, .coda .sp, .scene-nav'); });
    document.body.classList.toggle('nav-over-text', !!over);
    // the ground under the nav: the category's color, or the page's paper over a picture
    var hit = hits.find(function (el) { return el && el.closest && el.closest('.scene[data-chapter], .space, .ft'); });
    var host = hit && hit.closest('.scene[data-chapter], .space, .ft'), g = '';
    if (host && host.matches('.scene[data-chapter]')) g = getComputedStyle(host).getPropertyValue('--ground').trim();
    else if (host) g = getComputedStyle(document.documentElement).getPropertyValue('--wsp-paper-20').trim();
    if (g) document.documentElement.style.setProperty('--nav-ground', g);
    // the band above the header: the masthead print at the top, the chapter's color after it
    var head = $('.site-header'), past = !!head && head.getBoundingClientRect().bottom < 0;
    document.documentElement.classList.toggle('past-head', past);
    // Safari paints that band one color, sampled from the body (iOS 26) or theme-color (earlier)
    var tint = past ? (getComputedStyle(document.documentElement).getPropertyValue('--nav-ground').trim() || '#073a45') : '#073a45';
    if (tint !== lastTint) { lastTint = tint; document.body.style.backgroundColor = tint; var m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', tint); }
  }
  var lastTint = '';
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(navGround); } }, { passive: true });
  addEventListener('resize', navGround);
  navGround();
})();

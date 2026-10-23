/* art-breaks.js — "the water between the banks": quiet spreads and reaction spots between the cards, Friday to
   Monday, each with a slot for Snacks' own reimagined theme song and, where it fits, a line from his letter.
   Plus the Pictures switch in the menu. Loaded in <head> so the off state is set before first paint.
   Content: data/breaks.json. Pictures is on by default; the choice is kept on her phone. */
(function () {
  var KEY = 'wsp-art', root = document.documentElement;
  function read() { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } }
  function save(on) { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {} }
  var on = read(); root.classList.toggle('art-off', !on);

  var data = null, built = false;
  var STAR = '<svg class="ab-star" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 0l7 36 31-20-20 31 32 3-32 7 20 31-31-20-7 32-7-32-31 20 20-31-32-7 32-3-20-31 31 20z"/></svg>';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function img(x, cls) { return '<img class="' + cls + '" src="assets/img/peeps/' + esc(x.src) + '" alt="' + esc(x.alt) + '" loading="lazy" decoding="async" onerror="this.remove()">'; }

  /* his song: filled lines show; empty ones hold their place at roughly the right length */
  function lyric(b) {
    if (!b.lyric || !b.lyric.length) return '';
    var todo = b.lyric.some(function (l) { return !l.text; });
    return '<p class="sp-lyric"' + (todo ? ' data-todo' : '') + '>' + b.lyric.map(function (l) {
      return l.text ? '<span class="ly">' + esc(l.text) + '</span>'
        : '<span class="ly ly--todo" style="--len:' + Math.max(6, +l.len || 24) + '"><span class="ly-tag">Lyric ' + esc(l.n) + ' · ~' + esc(l.len) + ' letters</span></span>';
    }).join('') + '</p>';
  }
  function words(b) {
    var credit = b.credit && data.credit ? '<p class="sp-credit">' + esc(data.credit.text) + (data.credit.link ? ' <a href="' + esc(data.credit.link) + '" target="_blank" rel="noopener">' + esc(data.credit.link_label || 'Listen') + '</a>' : '') + '</p>' : '';
    return '<div class="sp-words">' + (b.when ? '<p class="sp-when">' + esc(b.when) + '</p>' : '') + lyric(b) +
      (b.note ? '<blockquote class="sp-note"><p>' + esc(b.note) + '</p>' + (b.sign ? '<span class="sp-sign">' + esc(b.sign) + '</span>' : '') + '</blockquote>' : '') + credit + '</div>';
  }

  function html(b, i) {
    var side = i % 2 ? 'r' : 'l', tone = ' tone--' + esc(b.tone || 'river');
    if (b.kind === 'spread') {
      var pic = '<div class="sp-pic">' + img(b, 'sp-img') + '</div>';
      return '<figure class="art-break sp sp--' + esc(b.layout || 'a') + tone + '" data-side="' + side + '">' + (b.layout === 'b' ? words(b) + pic : pic + words(b)) + '</figure>';
    }
    if (b.kind === 'single') return '<figure class="art-break sp sp--single' + tone + '" data-side="' + side + '"><div class="ab-stage">' + img(b, 'ab-one') + '</div>' + words(b) + '</figure>';
    return '<figure class="art-break spot' + tone + '" data-side="' + side + '"><div class="art-break--pair"><span class="ab-sheet"></span><span class="ab-band"></span>' + STAR +
      img(b.left, 'ab-left') + img(b.right, 'ab-right') + '</div>' + words(b) + '</figure>';
  }

  function build() {
    if (built || !data || !on) return; built = true;
    var coda = null;
    (data.breaks || []).forEach(function (b, i) {
      var t = document.createElement('div'); t.innerHTML = html(b, i); var el = t.firstChild; el.setAttribute('data-break-after', b.after);
      if (b.after === 'end') {
        if (!coda) { var scenes = document.querySelectorAll('main .scene[data-chapter]'); var last = scenes[scenes.length - 1]; if (!last) return;
          coda = document.createElement('section'); coda.className = 'coda'; coda.setAttribute('aria-label', 'Sunday to Monday'); last.parentNode.insertBefore(coda, last.nextSibling); }
        coda.appendChild(el); return;
      }
      var card = document.getElementById(b.after); if (!card || !card.parentNode) return;
      card.parentNode.insertBefore(el, card.nextSibling);
    });
  }

  function set(next) {
    on = next; save(on); root.classList.toggle('art-off', !on);
    var sw = document.getElementById('art-switch');
    if (sw) { sw.setAttribute('aria-checked', on ? 'true' : 'false'); sw.querySelector('.as-state').textContent = on ? 'On' : 'Off'; }
    if (on) build();
  }
  function addSwitch() {
    var menu = document.querySelector('#mega .mega-inner'); if (!menu || document.getElementById('art-switch')) return;
    var row = document.createElement('div'); row.className = 'mega-art';
    row.innerHTML = '<button type="button" class="art-switch" id="art-switch" role="switch" aria-checked="' + (on ? 'true' : 'false') + '">' +
      '<span class="as-label">Pictures</span><span class="as-track"><span class="as-knob"></span></span><span class="as-state">' + (on ? 'On' : 'Off') + '</span></button>';
    menu.appendChild(row); row.querySelector('button').addEventListener('click', function () { set(!on); });
  }

  /* PROTOTYPE ONLY (html[data-proto]): the footer as a closing piece with the hat print. Proposed as real markup. */
  function footer() {
    var f = document.querySelector('body > footer'); if (!f || f.classList.contains('ft')) return;
    var spans = f.querySelectorAll('.inner span'), made = spans[0] ? spans[0].textContent : '', note = spans[1] ? spans[1].textContent : '';
    var parts = made.split(' · ');
    f.className = 'ft';
    f.innerHTML = '<div class="ft-in"><figure class="ft-hat"><img src="assets/img/brand/hat-poster.webp" alt="puddnsnacks" width="512" height="640" loading="lazy"></figure>' +
      '<div class="ft-words"><p class="ft-made"><span class="strip">' + esc(parts[0] || made) + '</span></p>' + (parts[1] ? '<p class="ft-url">' + esc(parts[1]) + '</p>' : '') +
      '<p class="ft-note">' + esc(note) + '</p></div></div>';
  }

  function start() {
    addSwitch(); if (root.hasAttribute('data-proto')) footer();
    fetch('data/breaks.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { data = d; build(); }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

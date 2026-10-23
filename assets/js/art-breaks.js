/* art-breaks.js — Peeps art between the cards, plus the "Pictures" switch in the menu.
   Loaded in <head> so the off state is set before anything paints (no art downloads when off).
   Breaks come from data/breaks.json. Pictures is on by default; her choice is kept on her phone. */
(function () {
  var KEY = 'wsp-art';
  var root = document.documentElement;
  function read() { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } }
  function save(on) { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {} }
  var on = read();
  root.classList.toggle('art-off', !on);

  var data = null, built = false;
  var STAR = '<svg class="ab-star" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 0l7 36 31-20-20 31 32 3-32 7 20 31-31-20-7 32-7-32-31 20 20-31-32-7 32-3-20-31 31 20z"/></svg>';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function img(x, cls) { return '<img class="' + cls + '" src="assets/img/peeps/' + esc(x.src) + '" alt="' + esc(x.alt) + '" loading="lazy" decoding="async" onerror="this.remove()">'; }

  function html(b, i) {
    var side = i % 2 ? 'r' : 'l';
    if (b.kind === 'print') return '<figure class="art-break art-break--print" data-side="' + side + '" style="--ratio:' + esc(b.ratio || '16 / 9') + '">' + img(b, 'ab-print') + '</figure>';
    if (b.kind === 'single') return '<div class="art-break art-break--single ab-band--' + esc(b.band || 'teal') + '" data-side="' + side + '" role="img" aria-label="' + esc(b.alt) + '"><span class="ab-band"></span>' + img(b, 'ab-one') + '</div>';
    return '<div class="art-break art-break--pair ab-band--' + esc(b.band || 'teal') + '" data-side="' + side + '"><span class="ab-band"></span>' + STAR +
      img(b.left, 'ab-left') + img(b.right, 'ab-right') + '</div>';
  }

  function build() {
    if (built || !data || !on) return; built = true;
    (data.breaks || []).forEach(function (b, i) {
      var card = document.getElementById(b.after);
      if (!card || !card.parentNode) return;
      var t = document.createElement('div'); t.innerHTML = html(b, i);
      var el = t.firstChild; el.setAttribute('data-break-after', b.after);
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
    var menu = document.querySelector('#mega .mega-inner');
    if (!menu || document.getElementById('art-switch')) return;
    var row = document.createElement('div'); row.className = 'mega-art';
    row.innerHTML = '<button type="button" class="art-switch" id="art-switch" role="switch" aria-checked="' + (on ? 'true' : 'false') + '">' +
      '<span class="as-label">Pictures</span><span class="as-track"><span class="as-knob"></span></span><span class="as-state">' + (on ? 'On' : 'Off') + '</span></button>';
    menu.appendChild(row);
    row.querySelector('button').addEventListener('click', function () { set(!on); });
  }

  function start() {
    addSwitch();
    fetch('data/breaks.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { data = d; build(); }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

/* Inline SVG icons. All stroke icons inherit currentColor. */
window.WSP = window.WSP || {};
WSP.icons = (function () {
  const s = (path, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${path}</svg>`;
  const ui = {
    pin: s('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    camera: s('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
    link: s('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1-1"/>'),
    walk: s('<circle cx="13" cy="4" r="1.6"/><path d="M10 21l2-6 3 3v3M9 12l2-4 3 1 2 3M7 21l2-7"/>'),
    spotify: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.4a.6.6 0 0 1-.9.2c-2.4-1.5-5.4-1.8-9-1a.6.6 0 1 1-.3-1.2c3.9-.9 7.3-.5 10 1.2.3.2.4.6.2.8zm1.2-2.7a.8.8 0 0 1-1.1.3c-2.8-1.7-7-2.2-10.3-1.2a.8.8 0 1 1-.4-1.5c3.7-1.1 8.4-.6 11.6 1.4.4.2.5.7.2 1zm.1-2.8C14.6 9 9.1 8.8 5.9 9.8a.9.9 0 1 1-.5-1.8c3.7-1.1 9.8-.9 13.6 1.4a.9.9 0 0 1-1 1.5z"/></svg>',
    ticket: s('<path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3z"/><path d="M9 4v12" stroke-dasharray="2 2"/>'),
    clock: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    check: s('<path d="M5 12l5 5L20 7"/>'),
    x: s('<path d="M6 6l12 12M18 6L6 18"/>'),
    info: s('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    fav: '<svg viewBox="-2 -2 104 104" aria-hidden="true"><polygon class="fav-halo" points="50,0 59,29 85,15 71,41 100,50 71,59 85,85 59,71 50,100 41,71 15,85 29,59 0,50 29,41 15,15 41,29"/><polygon class="fav-box" points="50,0 59,29 85,15 71,41 100,50 71,59 85,85 59,71 50,100 41,71 15,85 29,59 0,50 29,41 15,15 41,29" transform="translate(50 50) scale(.9) translate(-50 -50)"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5l1.9 7.1 6.1-4-4 6.1 7.1 1.9-7.1 1.9 4 6.1-6.1-4L12 22.5l-1.9-7.1-6.1 4 4-6.1L.9 12.6 8 10.7l-4-6.1 6.1 4z"/></svg>',
    sun: s('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon: s('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
    cloud: s('<path d="M7 18a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 0 1 17.5 18z"/>'),
    cloudSun: s('<path d="M8 19a3.5 3.5 0 0 1-.4-7 4.8 4.8 0 0 1 9.2 1.3A2.9 2.9 0 0 1 17 19z"/><path d="M16 3v1.5M20.5 7.5H22M19.2 4.3l-1 1M14 5.4a3.6 3.6 0 0 1 5.8 3.5"/>'),
    cloudMoon: s('<path d="M8 19a3.5 3.5 0 0 1-.4-7 4.8 4.8 0 0 1 9.2 1.3A2.9 2.9 0 0 1 17 19z"/><path d="M20 9.5A4 4 0 1 1 14.8 4a3.3 3.3 0 0 0 5.2 5.5z"/>'),
    fog: s('<path d="M4 10h16M4 14h16M6 18h12M7 6h10"/>'),
    rain: s('<path d="M7 15a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 0 1 17.5 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>'),
    snow: s('<path d="M7 15a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 0 1 17.5 15z"/><path d="M8 19h.01M12 18h.01M16 19h.01M10 21h.01M14 21h.01"/>'),
    storm: s('<path d="M7 14a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 0 1 17.5 14z"/><path d="M13 13l-2.5 4h3L11 22"/>'),
    wind: s('<path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5M3 12h16a2.5 2.5 0 1 1-2.5 2.5M3 16h9a2 2 0 1 1-2 2"/>'),
  };
  /* WMO weather code → icon key. isNight swaps sun for moon. */
  function wmo(code, isNight) {
    if (code === 0) return isNight ? 'moon' : 'sun';
    if (code === 1 || code === 2) return isNight ? 'cloudMoon' : 'cloudSun';
    if (code === 3) return 'cloud';
    if (code === 45 || code === 48) return 'fog';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'cloud';
  }
  const wmoText = {0:'Clear',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Freezing fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Showers',81:'Showers',82:'Heavy showers',85:'Snow showers',86:'Snow showers',95:'Thunderstorm',96:'Thunderstorm, hail',99:'Thunderstorm, hail'};
  return { ui, wmo, wmoText };
})();

/* apps.rutoso.de – Seite einer einzelnen App.
   Liegt als index.html im App-Ordner (z. B. apps/Main/Norrsken/index.html) und liest
   icon.png, beschreibung.txt, neuigkeiten.txt, android.txt, bilder/ und die neueste APK aus genau diesem Ordner. */
(async function () {
  const OWNER = 'rutoso', REPO = 'rutoso.github.io', BRANCH = 'main', BASE = 'apps';
  const STORE = 'AppStore', STORE_NAME = 'RuToSo-AppStore';

  const $ = id => document.getElementById(id);
  const haupt = $('haupt'), verlauf = $('verlauf'), galerie = $('bilder');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url = p => '/' + p.split('/').map(encodeURIComponent).join('/');
  const text = async p => { if (!p) return ''; try { const r = await fetch(url(p), {cache: 'no-cache'}); return r.ok ? (await r.text()).replace(/^﻿/, '').trim() : ''; } catch { return ''; } };
  const vgl = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
  const mb = b => b > 0 ? (b / 1048576).toLocaleString('de-DE', {maximumFractionDigits: 1}) + ' MB' : '';

  // Welcher Ordner? Aus der Adresse, z. B. /apps/Main/Norrsken/ → apps/Main/Norrsken
  const ordner = decodeURIComponent(location.pathname).replace(/^\/+/, '').replace(/index\.html$/i, '').replace(/\/+$/, '');
  const istStore = ordner.toLowerCase() === `${BASE}/${STORE}`.toLowerCase();
  const name = istStore ? STORE_NAME : ordner.split('/').pop().replace(/^\s*\d{1,3}(?:\s+|\s*[-_.)]\s*)/, '').trim();
  document.title = `${name} – RuToSo-Apps`;
  $('titel').textContent = name;

  // Gerät
  const apple = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(navigator.userAgent);
  const pc = !apple && !android;
  let androidVersion = null;
  if (android) {
    try { if (navigator.userAgentData?.getHighEntropyValues) androidVersion = (await navigator.userAgentData.getHighEntropyValues(['platformVersion'])).platformVersion || null; } catch {}
    if (!androidVersion && !/Android 10; K\)/.test(navigator.userAgent)) androidVersion = navigator.userAgent.match(/Android (\d+(?:\.\d+)*)/)?.[1] || null;
  }
  const mobil = navigator.connection?.type === 'cellular';

  // Dateiliste (gleicher Zwischenspeicher wie die Startseite)
  let baum;
  try {
    const key = 'rutoso-baum';
    const c = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (c && Date.now() - c.t < 5 * 60e3) baum = c.d;
    else {
      const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`, {headers: {Accept: 'application/vnd.github+json'}});
      if (!r.ok) throw new Error();
      baum = (await r.json()).tree.filter(e => e.type === 'blob' && e.path.startsWith(BASE + '/')).map(e => ({p: e.path, s: e.size || 0}));
      try { sessionStorage.setItem(key, JSON.stringify({t: Date.now(), d: baum})); } catch {}
    }
  } catch { haupt.innerHTML = '<p class="hinweis">Die App ließ sich gerade nicht laden. Bitte in einigen Minuten neu laden.</p>'; return; }

  const hier = baum.filter(f => f.p.toLowerCase().startsWith(ordner.toLowerCase() + '/'));
  const direkt = hier.filter(f => !f.p.slice(ordner.length + 1).includes('/'));
  const datei = n => direkt.find(f => f.p.split('/').pop().toLowerCase() === n)?.p;
  const apk = direkt.map(f => ({...f, v: f.p.match(/[-_ ]v?(\d+(?:\.\d+)*)\.apk$/i)?.[1]?.split('.').map(Number)}))
    .filter(f => f.v).sort((a, b) => vgl(b.v, a.v))[0];
  const bilder = hier.filter(f => /\/bilder\/[^/]+\.(png|jpe?g|webp)$/i.test(f.p)).sort((a, b) => a.p.localeCompare(b.p, 'de'));

  const [besch, neu, min] = await Promise.all([text(datei('beschreibung.txt')), text(datei('neuigkeiten.txt')), text(datei('android.txt'))]);
  $('kurz').textContent = besch || 'Eine Android-App aus der RuToSo-Werkstatt.';

  if (!apk) { haupt.innerHTML = '<p class="hinweis">Diese App ist gerade nicht zum Herunterladen verfügbar.</p>'; }
  else {
    const link = esc(url(apk.p));
    const zuAlt = (androidVersion && /^\d+(\.\d+)*$/.test(min) && vgl(androidVersion.split('.').map(Number), min.split('.').map(Number)) < 0)
      ? `<p class="warnung">Braucht Android ${esc(min)} oder neuer. Dein Handy hat Android ${esc(androidVersion)}, die App läuft darauf vermutlich nicht.</p>` : '';
    const netz = mobil && apk.s > 5 * 1048576 ? `<p class="netz-hinweis">Du bist gerade im Mobilfunknetz. Die Datei hat ${mb(apk.s)}, am besten im WLAN laden.</p>` : '';
    const icon = datei('icon.png');
    haupt.innerHTML = `<img src="${icon ? esc(url(icon)) : '/assets/icon-192.png'}" alt="" onerror="this.onerror=null;this.src='/assets/icon-192.png'">
      <div><h2>${esc(name)}</h2><p>Version ${esc(apk.v.join('.'))}${apk.s ? ' · ' + mb(apk.s) : ''} · für Android</p></div>
      <div class="haupt-aktion">
        ${apple ? '<span class="laden aus" aria-disabled="true">Nur für Android</span>'
          : pc ? `<div class="qr-feld"><img class="qr" src="/assets/qr-apps.svg" alt="QR-Code zu apps.rutoso.de">
              <div><strong>Mit dem Handy scannen</strong><p>Die App ist für Android-Handys. Scanne den Code mit der Kamera, dann öffnet sich apps.rutoso.de auf deinem Handy.</p>
              <a class="pc-laden" href="${link}" download>Datei trotzdem hier am PC laden</a></div></div>`
          : `<a class="laden" href="${link}" download>${esc(name)} herunterladen</a><a href="/anleitung.html">So installierst du ${istStore ? 'ihn' : 'sie'}</a>`}
        ${apple ? '' : zuAlt + netz}
      </div>`;
    if (apple) haupt.insertAdjacentHTML('beforebegin', '<p class="kasten apple-hinweis">Meine Apps gibt es nur für Android. Auf iPhone und iPad lassen sie sich leider nicht installieren.</p>');
  }

  if (bilder.length) galerie.innerHTML = `<h2>Bilder</h2><div class="galerie">${bilder.map(b => `<img src="${esc(url(b.p))}" alt="" loading="lazy">`).join('')}</div>`;

  // Neuigkeiten: „## 1.2.0 – 01.11.2026“, darunter Punkte mit „Neu:“, „Behoben:“ …
  const eintraege = [];
  let akt = null;
  for (const roh of neu.split(/\r?\n/)) {
    const z = roh.trim();
    if (!z || (z.startsWith('#') && !z.startsWith('##'))) continue;
    if (z.startsWith('##')) { akt = {kopf: z.replace(/^##\s*/, ''), punkte: []}; eintraege.push(akt); }
    else if (akt) akt.punkte.push(z.replace(/^[-*•]\s*/, ''));
  }
  const stichwort = p => {
    const m = p.match(/^(Neu|Verbessert|Geändert|Behoben|Entfernt|Wichtig|Hinweis):\s*/i);
    return m ? `<b class="sw sw-${m[1].toLowerCase().replace('ä', 'ae')}">${esc(m[1])}</b> ${esc(p.slice(m[0].length))}` : esc(p);
  };
  verlauf.innerHTML = eintraege.length ? eintraege.map(e => {
    const [v, ...d] = e.kopf.split(/\s+[–-]\s+/);
    return `<article class="eintrag"><div><h3>Version ${esc(v.replace(/^v/i, ''))}</h3>${d.length ? `<p class="datum">${esc(d.join(' – '))}</p>` : ''}
      ${e.punkte.length ? `<ul>${e.punkte.map(p => `<li>${stichwort(p)}</li>`).join('')}</ul>` : ''}</div></article>`;
  }).join('') : '<p class="hinweis">Noch keine Neuigkeiten.</p>';
})();

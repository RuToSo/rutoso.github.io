/* apps.rutoso.de – liest die Ordner unter „apps“ direkt aus dem Repo.
   Gleicher Aufbau wie im AppStore: apps/Main = Startseite, apps/<Bereich> = Tab, apps/Seite 2 = zweite Seite,
   apps/AppStore = der AppStore selbst (wird oben groß angeboten). */
(async function () {
  const OWNER = 'rutoso', REPO = 'rutoso.github.io', BRANCH = 'main', BASE = 'apps';
  const STORE = 'AppStore', STORE_NAME = 'RuToSo-AppStore';
  const RESERVIERT = ['seite 2', 'rts', 'dev', STORE.toLowerCase()];

  const haupt = document.getElementById('haupt');
  const liste = document.getElementById('liste');
  const hilfe = document.getElementById('installhilfe');
  // iPhone und iPad (auch iPads, die sich als Mac ausgeben): Apps gibt es nur für Android
  const apple = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const nurAndroid = '<span class="laden aus" aria-disabled="true">Nur für Android</span>';
  const android = /Android/i.test(navigator.userAgent);
  const pc = !apple && !android;

  // Android-Version des Besuchers (Chrome nennt sie nur über userAgentData, im normalen Text steht immer „Android 10; K“)
  let androidVersion = null;
  if (android) {
    try { if (navigator.userAgentData?.getHighEntropyValues) androidVersion = (await navigator.userAgentData.getHighEntropyValues(['platformVersion'])).platformVersion || null; } catch {}
    if (!androidVersion && !/Android 10; K\)/.test(navigator.userAgent)) androidVersion = navigator.userAgent.match(/Android (\d+(?:\.\d+)*)/)?.[1] || null;
  }
  const zuAlt = min => {
    if (!androidVersion || !/^\d+(\.\d+)*$/.test(min)) return '';
    const n = s => s.split('.').map(Number);
    return vgl(n(androidVersion), n(min)) < 0 ? `<p class="warnung">Braucht Android ${esc(min)} oder neuer. Dein Handy hat Android ${esc(androidVersion)}, die App läuft darauf vermutlich nicht.</p>` : '';
  };

  // Im Mobilfunknetz bei großen Dateien kurz Bescheid geben (klappt nur in manchen Browsern, z. B. Chrome auf Android)
  const mobil = navigator.connection?.type === 'cellular';
  const netz = groesse => mobil && groesse > 5 * 1048576 ? `<p class="netz-hinweis">Du bist gerade im Mobilfunknetz. Die Datei hat ${mb(groesse)}, am besten im WLAN laden.</p>` : '';

  if (apple) haupt.insertAdjacentHTML('beforebegin', '<p class="kasten apple-hinweis">Meine Apps gibt es nur für Android. Auf iPhone und iPad lassen sie sich leider nicht installieren.</p>');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url = p => p.split('/').map(encodeURIComponent).join('/');
  const text = async p => { if (!p) return ''; try { const r = await fetch(url(p), {cache: 'no-cache'}); return r.ok ? (await r.text()).replace(/^\uFEFF/, '').trim() : ''; } catch { return ''; } };
  const bild = p => `<img src="${p ? esc(url(p)) : 'assets/icon-192.png'}" alt="" loading="lazy" onerror="this.onerror=null;this.src='assets/icon-192.png'">`;

  /* neuigkeiten.txt: # = Kommentar, ## = Version */
  const neu = t => {
    const zeilen = t.split(/\r?\n/).filter(z => !/^#(?!#)/.test(z.trim()));
    const html = zeilen.map(z => z.trim().startsWith('##') ? `<strong>${esc(z.replace(/^\s*##\s*/, ''))}</strong>` : esc(z)).join('\n').trim();
    return html ? `<details><summary>Neuigkeiten</summary><pre>${html}</pre></details>` : '';
  };

  // ---------- Dateiliste ----------
  async function baum() {
    const key = 'rutoso-baum';
    try { const c = JSON.parse(sessionStorage.getItem(key) || 'null'); if (c && Date.now() - c.t < 5 * 60e3) return c.d; } catch {}
    const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`, {headers: {Accept: 'application/vnd.github+json'}});
    if (!r.ok) throw new Error(r.status === 403 || r.status === 429 ? 'limit' : 'fehler');
    const d = (await r.json()).tree.filter(e => e.type === 'blob' && e.path.startsWith(BASE + '/')).map(e => ({p: e.path, s: e.size || 0}));
    try { sessionStorage.setItem(key, JSON.stringify({t: Date.now(), d})); } catch {}
    return d;
  }

  let dateien;
  try { dateien = await baum(); }
  catch (e) {
    haupt.innerHTML = `<p class="hinweis">${e.message === 'limit'
      ? 'Die App-Liste ist gerade nicht abrufbar, weil GitHub zu viele Anfragen von diesem Netz gezählt hat. Bitte in einigen Minuten neu laden.'
      : 'Die App-Liste ließ sich nicht laden. Bitte Seite neu laden.'}</p>`;
    return;
  }

  // Verzeichnisse aufbauen (Pfade relativ zu „apps“)
  const inOrdner = new Map(), unter = new Map();
  for (const f of dateien) {
    const teile = f.p.slice(BASE.length + 1).split('/');
    const name = teile.pop(), ordner = teile.join('/');
    if (!inOrdner.has(ordner)) inOrdner.set(ordner, []);
    inOrdner.get(ordner).push({name, pfad: f.p, groesse: f.s});
    for (let i = 0; i < teile.length; i++) {
      const eltern = teile.slice(0, i).join('/'), kind = teile.slice(0, i + 1).join('/');
      if (!unter.has(eltern)) unter.set(eltern, new Set());
      unter.get(eltern).add(kind);
    }
  }
  const kinder = o => [...(unter.get(o) || [])];
  const letzter = p => p.split('/').pop();
  const version = n => { const m = n.match(/^(.+?)[-_ ]v?(\d+(?:\.\d+)*)\.apk$/i); return m ? m[2].split('.').map(Number) : null; };
  const vgl = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
  const geordnet = (n, streng) => {
    const m = n.match(streng ? /^\s*(\d{1,3})(?:\s+|\s*[-_.)]\s*)(.+)$/ : /^\s*(\d{1,3})\s*[-_.)]?\s*(.+)$/);
    return m && m[2].trim() ? {label: m[2].trim(), rang: +m[1]} : {label: n.trim(), rang: 1000};
  };
  const mb = b => b > 0 ? (b / 1048576).toLocaleString('de-DE', {maximumFractionDigits: 1}) + ' MB' : '';

  function app(ordner, bereich, bereichRang, seite) {
    const fs = inOrdner.get(ordner) || [];
    const apks = fs.map(f => ({...f, v: /\.apk$/i.test(f.name) ? version(f.name) : null})).filter(f => f.v).sort((a, b) => vgl(b.v, a.v));
    if (!apks.length) return null;
    const datei = n => fs.find(f => f.name.toLowerCase() === n)?.pfad;
    const o = geordnet(letzter(ordner), true);
    return {name: o.label, rang: o.rang, bereich, bereichRang, seite, apk: apks[0], icon: datei('icon.png'), besch: datei('beschreibung.txt'), neu: datei('neuigkeiten.txt'), android: datei('android.txt'), seiteUrl: datei('index.html') ? url(BASE + '/' + ordner) + '/' : null};
  }

  function seite(wurzel, nr) {
    const out = [];
    for (const f of kinder(wurzel)) {
      const n = letzter(f), klein = n.trim().toLowerCase();
      if (RESERVIERT.includes(klein)) continue;
      const istMain = klein === 'main';
      const direkt = (inOrdner.get(f) || []).some(x => /\.apk$/i.test(x.name));
      if (direkt && !istMain) { const a = app(f, 'Start', -1, nr); if (a) out.push(a); continue; }
      const b = istMain ? {label: 'Start', rang: -1} : geordnet(n, false);
      for (const u of kinder(f)) { const a = app(u, b.label, b.rang, nr); if (a) out.push(a); }
    }
    return out;
  }

  // ---------- AppStore ----------
  const storeOrdner = kinder('').find(o => o.toLowerCase() === STORE.toLowerCase());
  const store = storeOrdner ? app(storeOrdner, 'Start', -1, 1) : null;
  if (store) {
    const [b, n, min] = await Promise.all([text(store.besch), text(store.neu), text(store.android)]);
    const datei = esc(url(store.apk.pfad));
    haupt.innerHTML = `${bild(store.icon)}
      <div><h2>${store.seiteUrl ? `<a href="${esc(store.seiteUrl)}">${esc(STORE_NAME)}</a>` : esc(STORE_NAME)}</h2><p>${esc(b)}</p></div>
      <div class="haupt-aktion">
        ${pc ? `<div class="qr-feld"><img class="qr" src="assets/qr-apps.svg" alt="QR-Code zu apps.rutoso.de">
          <div><strong>Mit dem Handy scannen</strong><p>Die Apps sind für Android-Handys. Scanne den Code mit der Kamera, dann öffnet sich diese Seite auf deinem Handy.</p>
          <a class="pc-laden" href="${datei}" download>Datei trotzdem hier am PC laden</a></div></div>`
          : apple ? nurAndroid : `<a class="laden" href="${datei}" download>AppStore herunterladen</a>`}
        <span class="version">Version ${esc(store.apk.v.join('.'))}${store.apk.groesse ? ' · ' + mb(store.apk.groesse) : ''}</span>
        ${apple || pc ? '' : '<a href="anleitung.html">So installierst du ihn</a>'}
        ${apple ? '' : zuAlt(min) + netz(store.apk.groesse)}
      </div>
      <div style="grid-column:1/-1">${neu(n)}</div>`;
  } else {
    haupt.innerHTML = '<p class="hinweis">Der AppStore wird gerade vorbereitet. Schau bald wieder vorbei.</p>';
  }

  // ---------- Einzelne Apps, gruppiert nach Seite und Bereich ----------
  const zweite = kinder('').find(o => o.trim().toLowerCase() === 'seite 2');
  const apps = [...seite('', 1), ...(zweite ? seite(zweite, 2) : [])];
  // gleicher Name auf derselben Seite: nur einmal (wie im AppStore)
  const gesehen = new Set();
  const eindeutig = apps.filter(a => { const k = a.seite + '|' + a.name.toLowerCase(); if (gesehen.has(k)) return false; gesehen.add(k); return true; });
  eindeutig.sort((a, b) => (a.seite - b.seite) || (a.bereichRang - b.bereichRang) || a.bereich.localeCompare(b.bereich, 'de') || (a.rang - b.rang) || a.name.localeCompare(b.name, 'de'));

  if (!eindeutig.length) { liste.innerHTML = '<p class="hinweis">Noch keine weiteren Apps veröffentlicht.</p>'; }
  else {
    const texte = await Promise.all(eindeutig.map(a => Promise.all([text(a.besch), text(a.neu), text(a.android)])));
    const gName = a => zweite ? `Seite ${a.seite}${a.bereich !== 'Start' ? ' – ' + a.bereich : ''}` : a.bereich;
    const mehrere = new Set(eindeutig.map(gName)).size > 1;
    let html = '', gruppe = '';
    eindeutig.forEach((a, i) => {
      const g = gName(a);
      if (mehrere && g !== gruppe) html += `<h3 class="gruppe">${esc(g)}</h3>`;
      gruppe = g;
      const [b, n, min] = texte[i];
      html += `<article class="zeile">${bild(a.icon)}
        <div class="zeile-text"><h3>${a.seiteUrl ? `<a href="${esc(a.seiteUrl)}">${esc(a.name)}</a>` : esc(a.name)} <span class="version">${esc(a.apk.v.join('.'))}</span></h3>${b ? `<p>${esc(b)}</p>` : ''}${apple ? '' : zuAlt(min) + netz(a.apk.groesse)}${neu(n)}</div>
        ${apple ? nurAndroid : `<a class="laden" href="${esc(url(a.apk.pfad))}" download aria-label="${esc(a.name)} herunterladen">Laden</a>`}
      </article>`;
    });
    liste.innerHTML = html;
  }

  // ---------- Nach dem Download: kurze Installationshilfe ----------
  if (hilfe) {
    hilfe.querySelector('.nur-android').hidden = !android;
    hilfe.querySelector('.nur-pc').hidden = android;
    document.addEventListener('click', e => {
      const a = e.target.closest('a.laden, a.pc-laden');
      if (!a) return;
      const name = a.closest('.zeile')?.querySelector('h3')?.firstChild?.textContent?.trim() || STORE_NAME;
      hilfe.querySelector('.app-name').textContent = name;
      setTimeout(() => { if (typeof hilfe.showModal === 'function') hilfe.showModal(); else hilfe.setAttribute('open', ''); }, 600);
    });
    hilfe.querySelector('.schliessen').addEventListener('click', () => hilfe.close ? hilfe.close() : hilfe.removeAttribute('open'));
  }
})();

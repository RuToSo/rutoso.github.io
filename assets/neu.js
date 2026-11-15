/* apps.rutoso.de/neu.html – sammelt alle neuigkeiten.txt aus dem Ordner „apps“
   und zeigt sie als gemeinsame Zeitleiste, neueste zuerst. */
(async function () {
  const OWNER = 'rutoso', REPO = 'rutoso.github.io', BRANCH = 'main', BASE = 'apps';
  const STORE = 'AppStore', STORE_NAME = 'RuToSo-AppStore';
  const liste = document.getElementById('zeitleiste'), filter = document.getElementById('filter');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url = p => p.split('/').map(encodeURIComponent).join('/');
  const ohneZahl = n => n.replace(/^\s*\d{1,3}(?:\s+|\s*[-_.)]\s*)/, '').trim();

  let baum;
  try {
    const key = 'rutoso-baum';
    const c = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (c && Date.now() - c.t < 5 * 60e3) baum = c.d;
    else {
      const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`);
      if (!r.ok) throw new Error();
      baum = (await r.json()).tree.filter(e => e.type === 'blob' && e.path.startsWith(BASE + '/')).map(e => ({p: e.path, s: e.size || 0}));
      try { sessionStorage.setItem(key, JSON.stringify({t: Date.now(), d: baum})); } catch {}
    }
  } catch { liste.innerHTML = '<p class="hinweis">Die Neuigkeiten ließen sich gerade nicht laden. Bitte später neu laden.</p>'; return; }

  // Jede neuigkeiten.txt gehört zu dem Ordner, in dem sie liegt
  const dateien = baum.filter(f => /\/neuigkeiten\.txt$/i.test(f.p));
  const icons = new Set(baum.filter(f => /\/icon\.png$/i.test(f.p)).map(f => f.p.replace(/\/icon\.png$/i, '')));
  const apps = await Promise.all(dateien.map(async f => {
    const ordner = f.p.replace(/\/neuigkeiten\.txt$/i, '');
    const name = ordner === `${BASE}/${STORE}` ? STORE_NAME : ohneZahl(ordner.split('/').pop());
    let text = '';
    try { const r = await fetch(url(f.p), {cache: 'no-cache'}); if (r.ok) text = await r.text(); } catch {}
    return {name, icon: icons.has(ordner) ? ordner + '/icon.png' : null, text};
  }));

  // „## 1.2.0 – 01.11.2026“ + Punkte darunter
  const eintraege = [];
  for (const a of apps) {
    let akt = null;
    for (const roh of a.text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
      const z = roh.trim();
      if (!z || (z.startsWith('#') && !z.startsWith('##'))) continue;
      if (z.startsWith('##')) {
        const kopf = z.replace(/^##\s*/, '');
        const v = (kopf.match(/\d+(?:\.\d+)*/) || [''])[0];
        const d = kopf.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        akt = {app: a, version: v, datum: d ? new Date(+d[3], +d[2] - 1, +d[1]) : null, punkte: []};
        eintraege.push(akt);
      } else if (akt) akt.punkte.push(z.replace(/^[-*•]\s*/, ''));
    }
  }
  eintraege.sort((x, y) => (y.datum?.getTime() ?? -1) - (x.datum?.getTime() ?? -1));

  const stichwort = p => {
    const m = p.match(/^(Neu|Verbessert|Geändert|Behoben|Entfernt|Wichtig|Hinweis):\s*/i);
    return m ? `<b class="sw sw-${m[1].toLowerCase().replace('ä','ae')}">${esc(m[1])}</b> ${esc(p.slice(m[0].length))}` : esc(p);
  };
  const datumText = d => d ? d.toLocaleDateString('de-DE', {day: '2-digit', month: 'long', year: 'numeric'}) : 'ohne Datum';

  function zeigen(nur) {
    const sicht = nur ? eintraege.filter(e => e.app.name === nur) : eintraege;
    if (!sicht.length) { liste.innerHTML = '<p class="hinweis">Noch keine Neuigkeiten.</p>'; return; }
    liste.innerHTML = sicht.map(e => `
      <article class="eintrag">
        <img src="${e.app.icon ? esc(url(e.app.icon)) : 'assets/icon-192.png'}" alt="" loading="lazy" onerror="this.onerror=null;this.src='assets/icon-192.png'">
        <div>
          <h2>${esc(e.app.name)} <span class="version">${esc(e.version)}</span></h2>
          <p class="datum">${datumText(e.datum)}</p>
          ${e.punkte.length ? `<ul>${e.punkte.map(p => `<li>${stichwort(p)}</li>`).join('')}</ul>` : ''}
        </div>
      </article>`).join('');
  }

  const namen = [...new Set(eintraege.map(e => e.app.name))].sort((a, b) => a.localeCompare(b, 'de'));
  filter.innerHTML = '<option value="">Alle Apps</option>' + namen.map(n => `<option>${esc(n)}</option>`).join('');
  filter.addEventListener('change', () => zeigen(filter.value));
  zeigen('');
})();

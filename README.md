# apps.rutoso.de

Öffentliche Seite und Update-Quelle des **RuToSo-AppStores**.
Es gibt keine Liste zum Pflegen: Webseite und AppStore lesen direkt die Ordner unter `apps/`.

## Aufbau

```
apps/
├── AppStore/                 ← der AppStore selbst (oben auf der Seite groß, aktualisiert sich hieraus)
│   ├── RuToSo-AppStore-2.0.0.apk
│   ├── icon.png
│   ├── beschreibung.txt
│   ├── neuigkeiten.txt
│   └── package.txt           (de.rutoso.appstore2 – nicht ändern)
├── Main/                     ← Startseite
│   └── DocuVault/
│       ├── DocuVault-1.2.0.apk
│       ├── icon.png              (optional)
│       ├── package.txt           (optional, empfohlen)
│       ├── beschreibung.txt      (optional)
│       ├── neuigkeiten.txt       (optional)
│       ├── mindestversion.txt    (optional, Pflicht-Update)
│       ├── android.txt           (optional, z. B. 8.0 – ältere Android-Versionen bekommen einen Hinweis)
│       └── bilder/               (optional)
├── 1 Zuhause/                ← Bereich (Tab), Zahl vorn = Reihenfolge
│   └── 1 Hemstyr/
└── Seite 2/                  ← zweite Seite, darin derselbe Aufbau
    └── Main/
```

- Dateiname immer `Name-1.2.3.apk`. Die neueste Version gewinnt, ältere werden nie installiert.
- Ein Ordner `RTS` wird hier ignoriert. RTS gibt es nur im privaten Repo.
- Ein Bereich mit demselben Namen im privaten Repo wird in der App mit diesem zusammengelegt.

## Neue Version veröffentlichen

APK mit Versionsnummer in den App-Ordner legen und `neuigkeiten.txt` ergänzen. Fertig.
Ältere APKs nach ein paar Versionen löschen (siehe ANLEITUNG, „Repo klein halten“).

Jede App braucht einen festen Signaturschlüssel, sonst scheitern spätere Updates.

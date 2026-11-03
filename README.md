# hAIFHEMHA

Mobile-first Web-App als **alternative Oberfläche für FHEM** im Look & Feel von Home Assistant. Läuft als eigener Docker-Container und spricht über denselben Weg mit FHEM wie die mitgelieferte FHEMWEB-WebUI (`/fhem?cmd=…&XHR=1&fwcsrf=…`).

> Status: **v0.1 (Prototyp)**. Inspiriert vom [Home-Assistant-Frontend](https://github.com/home-assistant/frontend) (eigene Implementierung, kein Code übernommen).

## Features (v0.1)

- Mobile-first UI: Drawer-Navigation, Karten-Grid, PWA-Manifest
- Übersicht, Räume (aus Attribut `room`), Geräteliste mit Suche
- Karten: Schalter (Tap = toggle), Dimmer-Slider (`set … pct`), Thermostat +/− , Sensorwerte
- Gerätedialog: `set` (aus `PossibleSets`), Readings, Attribute (`attr`), `list`, `delete`
- Konsole: beliebige FHEM-Befehle (`list`, `save`, `rereadcfg`, `define`, …)
- Live-Updates über FHEMWEB-Longpoll (`inform`) → SSE
- CSRF-Token-Handling, optional Basic Auth zu FHEM, optionaler App-Passwortschutz
- Themes: **HA Light**, **HA Dark**, **Midnight** (Platzhalter; zwei weitere Wunsch-Themes folgen)

## Start

```bash
docker compose up -d --build
```

Umgebungsvariablen:

| Variable | Bedeutung | Default |
|---|---|---|
| `FHEM_URL` | Basis-URL von FHEMWEB (ohne `/fhem`) | `http://localhost:8083` |
| `FHEM_WEB_PATH` | FHEMWEB-Pfad (`webname`) | `/fhem` |
| `FHEM_USER` / `FHEM_PASS` | Basic Auth zu FHEM (optional) | leer |
| `APP_PASSWORD` | Passwortschutz der App (Basic Auth, beliebiger User) | leer |
| `PORT` | Port im Container | `8080` |

Portainer: `docker-compose.yml` als Stack einfügen, Variablen anpassen.

## Sicherheit

- Die Konsole führt **beliebige FHEM-Befehle** aus (wie die WebUI). Container nur im LAN betreiben oder `APP_PASSWORD` und einen Reverse Proxy mit TLS davor setzen.
- Keine Zugangsdaten im Repo; alles per Umgebungsvariablen.

## Eigene Themes

In `public/themes.css` einen Block `[data-theme=meinname]{ --primary:…; --bg:…; … }` ergänzen und in `THEMES` (`public/app.js`) eintragen.

## Roadmap

- Zwei weitere Themes
- Raum-/Gruppen-Ansichten nach `group`/`sortby`, Icons aus `icon`-Attribut
- Plots (SVG_/FileLog), Fensterrollos-Karte, Farbwahl (HUE/RGB)
- Dateieditor (cfg), `define`-Dialog, Event-Monitor
- Login-Sessions, Healthcheck-Details, GHCR-Build per GitHub Actions

## Lizenz

MIT – siehe [LICENSE](LICENSE).

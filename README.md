# hAIFHEMHA

Mobile-first Web-App als **alternative Oberfläche für FHEM** im Look & Feel von Home Assistant. Läuft als eigener Docker-Container und spricht über denselben Weg mit FHEM wie die mitgelieferte FHEMWEB-WebUI (`/fhem?cmd=…&XHR=1&fwcsrf=…`).

> Status: **v0.2 (Prototyp)**. Inspiriert vom [Home-Assistant-Frontend](https://github.com/home-assistant/frontend) (eigene Implementierung, kein Code übernommen).

## Features

- Mobile-first UI: Drawer-Navigation, Karten-Grid, PWA-Manifest
- Übersicht, Räume (Attribut `room`), Geräteliste mit Suche
- Karten: Schalter (Tap = toggle), Dimmer (`pct`), Thermostat +/−, Rollos (`up`/`stop`/`down`), Farbwahl (`rgb`), Sensorwerte
- Gerätedialog: `set` (aus `PossibleSets`), Readings, `attr`, `list`, `delete`
- Konsole: beliebige FHEM-Befehle
- **Plots**: SVG-Geräte via `SVG_showLog`
- **Event-Monitor** (Live, letzte 300 Events)
- **Neues Gerät**: `define`-Dialog + `save`
- Live-Updates über FHEMWEB-Longpoll (`inform`) → SSE
- Optional Basic Auth zu FHEM und App-Passwortschutz
- Themes: **HA Light**, **HA Dark**, **Noctis** (dunkelblau, angelehnt an [aFFekopp/noctis](https://github.com/aFFekopp/noctis); Farben angenähert). Ein weiteres Theme folgt.

## Start

```bash
docker compose up -d --build
```

| Variable | Bedeutung | Default |
|---|---|---|
| `FHEM_URL` | Basis-URL von FHEMWEB (ohne `/fhem`) | `http://localhost:8083` |
| `FHEM_WEB_PATH` | FHEMWEB-Pfad (`webname`) | `/fhem` |
| `FHEM_USER` / `FHEM_PASS` | Basic Auth zu FHEM (optional) | leer |
| `APP_PASSWORD` | Passwortschutz der App (Basic Auth, beliebiger User) | leer |
| `PORT` | Port im Container | `8080` |

Das Image wird per GitHub Actions nach `ghcr.io/jbkunama1/haifhemha:latest` gebaut (amd64, arm64, armv7).

## Sicherheit

- Die Konsole führt **beliebige FHEM-Befehle** aus (wie die WebUI). Nur im LAN betreiben oder `APP_PASSWORD` + TLS-Reverse-Proxy nutzen.
- Keine Zugangsdaten im Repo.

## Eigene Themes

`[data-theme=name]{…}` in einer CSS-Datei ergänzen und in `THEMES` (`public/app.js` bzw. `ext.js`) eintragen.

## Roadmap

- [x] Noctis-Theme, Plots, Event-Monitor, define-Dialog, Rollo-/Farbkarten, GHCR-Workflow
- [ ] Drittes Theme (Link folgt)
- [ ] cfg-/Dateieditor
- [ ] Plot-Navigation (Zeitraum), Icons aus `icon`-Attribut, `group`/`sortby`
- [ ] Login-Sessions

## Lizenz

MIT – siehe [LICENSE](LICENSE).

# AndreDrive

Eine deutschsprachige Cloud- und Videobibliothek mit React, Express, SQLite und FFmpeg. Enthält eine ausdrücklich gekennzeichnete Vorschau und getrennte private Konten mit echter Dateiablage.

## Starten

Voraussetzungen: Node.js 24+ (mit `node:sqlite`), npm und FFmpeg mit libx264/AAC. Kein externer Dienst oder API-Schlüssel erforderlich.

```sh
npm ci
npm run dev
```

Der Server lauscht auf Port 3000. Für den Produktionsmodus:

```sh
npm run build
npm start
```

## Funktionen

- Registrierung/Login, gesalzene scrypt-Passwörter, HttpOnly-Sitzungscookies, Kontotrennung.
- Mehrfach-Uploads mit echtem Fortschritt und gemessener Übertragungsrate. Speicherung als Stream auf Disk, ohne konfigurierte Dateigrößen- oder Speicherquote. Maximal 100 Dateien pro Upload.
- Verschachtelte Ordner, Suche, Sortierung, Raster/Liste, Favoriten und Filme/Serien mit Staffel-/Episodenmetadaten.
- HTML5-Player und private HTTP-Range-Downloads. Das Original wird nicht verändert. Browser benötigen ein unterstütztes Codecformat; MKV/HEVC usw. lassen sich gegebenenfalls nur extern wiedergeben oder über HLS ansehen.
- Automatische FFmpeg-Aufbereitung zu H.264/AAC-HLS-VOD (bis 720p), lokale Thumbnails und `#EXT-X-ENDLIST`. Originaldateien bleiben in voller Qualität. Ein Job gleichzeitig, zwei Encoder-Threads. Angefangene Jobs werden beim Neustart wieder aufgenommen. Fehlgeschlagene Aufbereitung wird angezeigt, Original bleibt verfügbar.
- Widerrufbare öffentliche Datei-/Ordnerfreigaben mit zufälligen persistenten Tokens. Ordnerfreigaben enthalten Unterordner und künftig hinzugefügte Dateien. Linkbesitzer dürfen ansehen und herunterladen.
- Mehrfachauswahl und ZIP-Download als Serverstream, ohne alle Dateien im Server- oder Browser-RAM zu sammeln.
- Einzel- und Bulk-M3U-VOD-Playlists mit Filmgruppen und Serientiteln wie `S02E03`. M3U enthält Original-Videolinks, M3U8 enthält Verweise auf echte HLS-Manifeste. Die Sammlung selbst ist eine Extended-M3U-VOD-Liste, kein einzelnes zusammenhängendes HLS-Mastermanifest. VLC/IPTV-Unterstützung unterscheidet sich je Player. Exportierte Sammlungen sind feste Auswahlen; Ordnerfreigaben sind dynamisch.
- Jeder Dateifreigabe sind ein Original-Direktlink und ein HLS-M3U8-Link zugeordnet. Kein automatisches Ablaufdatum; Widerruf sperrt alle abgeleiteten Links dieser Freigabe.

## Dauerhafte Links und Speicher

**Kein Service kann physisch unbegrenzten Speicher oder 8.000+ Mbit/s allein durch Anwendungscode bereitstellen.** Die App erhebt keine Speicherquote. Kapazität, Bandbreite, Verbindung, Reverse Proxy und Hardware begrenzen die reale Nutzung. Aktuell wird ein lokales Dateisystem verwendet, kein bereits provisionierter Cloud-/S3-Speicher. Elastischer Object Storage/CDN, verteilte Transcoding-Worker, resumierbare Multipart-Uploads, Lasttests und ein passendes Hosting sind zusätzliche Produktionsarbeiten.

Links haben bewusst kein Zeitlimit. Sie funktionieren, solange Domain, Hosting, Daten und Freigabe bestehen. Bereits heruntergeladene Dateien kann ein Widerruf nicht zurückholen. Domainwechsel oder Verlust der Datenbank brechen Links. Das gilt auch für Playlistdateien, die URLs enthalten.

### Konfiguration

| Variable | Standard | Bedeutung |
| --- | --- | --- |
| `PORT` | `3000` | HTTP-Port |
| `DATA_DIR` | `./data` | Persistenter Speicher für SQLite, Originaldateien, Thumbnails und HLS |
| `PUBLIC_BASE_URL` | aktueller Request-Ursprung | Stabile HTTPS-Domain für exportierte Playlists, z. B. `https://drive.example.com` (ohne abschließenden Slash) |
| `TRUST_PROXY` | `0` | Nur hinter einem vertrauenswürdigen Reverse Proxy auf `1` setzen; aktiviert Secure-Cookies bei weitergereichtem HTTPS |
| `NODE_ENV` | Entwicklung | `production` verwendet den gebauten `dist`-Ordner |

Für öffentliche Bereitstellung HTTPS nutzen, Daten persistent mounten und sichern (inklusive SQLite-WAL oder via SQLite-Backup). `PUBLIC_BASE_URL` fest setzen. Der Reverse Proxy muss Uploads ohne kleines Body-Limit zulassen und lange Streaming-Verbindungen unterstützen. FFmpeg sollte bei produktiven, unkontrollierten Uploads in isolierten Workern mit Ressourcenlimits laufen. Es gibt noch keine E-Mail-Verifikation, Passwortwiederherstellung oder Administratoroberfläche. Es wird kein Produktionshosting automatisch angelegt.

### Prüfungen

```sh
npm run build
npm test
# Mit laufendem Entwicklungsserver und installiertem Chromium:
node tests/browser.mjs
```

Die Integrationstests verwenden einen isolierten temporären Datenordner und ein echtes FFmpeg-Testvideo: Registrierung, private Uploads, Trennung zweier Konten, Byte-Range, Originaldownload, rekursive Freigabe, stabile Playlist-Links, Serienmetadaten, echte HLS-Segmente, ZIP und Widerruf/Logout.

Die Browserprüfung verwendet `/usr/bin/chromium` und prüft Suche, Ansichten, Player, Registrierung, Ordner, Upload, öffentliche Freigabe und mobile Navigation. Sie legt ein Testkonto mit einer Textdatei im laufenden Workspace an. Screenshots landen unter `/tmp/andredrive-desktop.png` und `/tmp/andredrive-mobile.png`.

## Design

Helle Drive-Oberfläche mit Waldgrün, klarer Navigation und einer filmischen Bildsprache. Die Live-Recherche bei Frame.io und externe Unsplash-Bildabrufe waren in der Entwicklungsumgebung netzwerkseitig gesperrt. Verwendete lokale Landschaften sind generierte Designbilder, keine echten Filmcover. Die Player-Vorschau ist ein lokal aus dem generierten Landschaftsmotiv erstellter Beispielclip, keine Wiedergabe der dargestellten Beispielfilme. Bilder und Schriften werden lokal ausgeliefert.

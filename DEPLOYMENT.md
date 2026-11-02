# Registrierung auf Vercel reparieren

Die Anwendung besteht aus einem React-Frontend **und** einem Express-Server. Ein reines Vite-Deployment liefert nur HTML/JS aus. Es startet `server/index.js` nicht. Deshalb schlagen `/api/auth/register` und `/api/auth/login` fehl. Auf statischen Hosts kann selbst `/api/me` fälschlich die HTML-Startseite zurückgeben.

Der Server verwendet SQLite, Originaldateien und eine FFmpeg-Warteschlange. Er muss dauerhaft mit einem persistenten Datenträger laufen. Die Datenbank in Vercel Functions unter `/tmp` anzulegen würde Konten und Dateien verlieren und ist keine Reparatur.

## Einfachster Weg: vollständige App auf Render

[Render-Bereitstellung aus diesem Repository öffnen](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fnerooo190%2FAndreDrive-Unlimited-Cloud-Storage-)

1. Auf Render **New → Blueprint** wählen und dieses GitHub-Repository verbinden. `render.yaml` liegt im Repository. Render erstellt den Docker-Service mit FFmpeg und einem persistenten Datenträger. Der vorgeschlagene Starter-Service und der Datenträger sind kostenpflichtig; vor dem Anlegen die aktuellen Preise prüfen. 10 GB ist ein Startwert, kein unbegrenzter Speicher.
2. `PUBLIC_BASE_URL` auf die endgültige HTTPS-Adresse setzen, z. B. `https://andredrive.onrender.com`. Falls die zugewiesene Adresse erst nach dem Anlegen feststeht, die Variable anschließend setzen und erneut deployen. `DATA_DIR` muss auf dem persistenten Datenträger bleiben.
3. Die Render-Adresse öffnen. `/api/health` muss JSON mit `"ok":true` liefern. Die komplette Oberfläche wird dort ebenfalls ausgeliefert. Registrierung, Login und Upload sind auf dieser Adresse verwendbar. Keine zusätzliche Vercel-Installation nötig.
4. Nach einer Testregistrierung abmelden, anmelden, Datei hochladen und nach einem Service-Neustart erneut prüfen. Konten und Dateien müssen erhalten bleiben. Bestehende lokale Daten werden nicht automatisch zu Render übertragen.

Es wurde durch diese Codeänderung noch kein Render-Dienst bestellt oder bereitgestellt.

## Optional: bisherige Vercel-Adresse behalten

1. Zuerst den oben beschriebenen Backend-Service bereitstellen.
2. In Vercel unter **Project → Settings → Environment Variables** `BACKEND_URL` für Production (und ggf. Preview) setzen, beispielsweise `https://andredrive.onrender.com`. Nur den HTTPS-Ursprung verwenden: kein `/api`, kein Pfad und keine Zugangsdaten. Nicht die Vercel-Adresse selbst eintragen, sonst entsteht eine Schleife.
3. Auf dem Backend `PUBLIC_BASE_URL` auf die öffentliche Vercel-Adresse setzen, ohne abschließenden Slash. Das erlaubt diesen Ursprung für mutierende API-Anfragen und sorgt für richtige Playlist-URLs. Es ist kein CORS-Wildcard erforderlich: Browser greifen über dieselbe Vercel-Adresse auf die API zu.
4. In Vercel das Repository neu deployen. Falls alte Projekt-Overrides vorhanden sind: den Build Command auf `node scripts/build-vercel.mjs`, Framework auf **Other** und den Output-Directory-Override entfernen bzw. die Repository-Konfiguration übernehmen lassen. `.vercel/output` wird über die Build Output API automatisch erkannt. Das Skript erzeugt die Vercel Build Output API v3 mit externen Weiterleitungen für `/api`, `/media`, `/thumb`, `/hls` und `/playlist` vor dem SPA-Fallback. Ein Build ohne `BACKEND_URL` bricht mit einer konkreten Konfigurationsmeldung ab, statt erneut eine funktionslose Registrierung bereitzustellen.
5. Über die Vercel-Adresse `/api/health` öffnen. Erwartet wird JSON, keine HTML-Seite. Danach Registrierung/Login testen. Der Proxy reicht Sitzungscookies zwischen Browser und Backend durch; das Backend vertraut ausschließlich dem konkret gesetzten `PUBLIC_BASE_URL` zusätzlich zu seinem eigenen Host.

Vercel-Proxy-Timeouts und Plattformlimits gelten weiterhin. Für sehr große/lang laufende Video-Uploads die vollständige Render-Adresse oder eine eigene Domain direkt am Server verwenden. Dieser Fix verspricht keine 8.000 Mbit/s und provisioniert keinen unbegrenzten Object Storage.

## Eigener Server statt Render

```sh
docker build -t andredrive .
docker run -d --name andredrive --restart unless-stopped \
  -p 3000:3000 -v andredrive-data:/var/lib/andredrive \
  -e PUBLIC_BASE_URL=https://drive.example.com \
  -e TRUST_PROXY=1 andredrive
```

HTTPS über einen vertrauenswürdigen Reverse Proxy bereitstellen. `TRUST_PROXY=1` nur verwenden, wenn der Node-Port nicht ungeschützt aus dem Internet erreichbar ist. Persistentes Volume inklusive Datenbank regelmäßig sichern. Für die optionale Vercel-Weiterleitung die HTTPS-Adresse dieses Servers als `BACKEND_URL` verwenden.

## Verifikation der Änderung

`npm test` prüft unter anderem API-Fallbacks und Registrierung mit dem explizit erlaubten Frontend-Ursprung. `BACKEND_URL=https://backend.example npm run build:vercel` prüft den Proxy-Build ohne einen externen Dienst aufzurufen. `node tests/registration-browser.mjs` stellt die statische HTML-Antwort beim mobilen Registrierungsformular nach (laufender Entwicklungsserver auf Port 3000 und Chromium erforderlich). `tests/container.mjs` prüft einen dedizierten lokalen Produktions-Testcontainer einschließlich Video-Upload, HLS und Konten/Dateien/Freigaben nach einem Neustart; Testinstanzen separat von echten Daten betreiben.

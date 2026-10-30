# Task Checklist: Ranking Platform Operatie

## Status Overzicht

| Fase | Onderdeel | Status | Eigenaar |
| :--- | :--- | :--- | :--- |
| **Fase 1** | QDE Standalone Docker & Media Setup | Ready for Tonight | Antigravity |
| **Fase 2** | DNS & Nginx Proxy Configuratie | Ready for Tonight | Antigravity |
| **Fase 3** | Standaard Ranking (`main`) Engine Upgrade | Ready for Tonight | Antigravity |
| **Fase 4** | Merry Christmas Editie (`christmas`) | Ready for Tonight | Antigravity |
| **Fase 5** | End-to-End Verificatie & Handoff | Ready for Tonight | Antigravity |

---

## Fase 1: QDE Standalone Docker & Media Setup

- [ ] 1.1 Directory `/var/www/ranking-media/` aanmaken op QDE (`45.148.62.92`)
- [ ] 1.2 Photo App bestanden (`phone/media.html`) van HostSlim synchroniseren naar QDE
- [ ] 1.3 Bestaande `/domains/pinkmilk.eu/public_html/RankingNW/` media synchroniseren naar QDE
- [ ] 1.4 `Dockerfile` en Docker Compose configuratie toevoegen aan `RankingNW`
- [ ] 1.5 Lokale upload-handler inrichten in `src/app/api/ftp-upload/route.ts` (direct wegschrijven op QDE)
- [ ] 1.6 Docker container bouwen en draaien op QDE poort 3000
- [ ] 1.7 Dagelijkse SQLite snapshot cronjob inrichten voor PocketBase op QDE

---

## Fase 2: DNS & Nginx Proxy Configuratie op QDE

- [ ] 2.1 Nginx reverse proxy vhost aanmaken op QDE voor poort 3000 met WebSocket/SSE support
- [ ] 2.2 Nginx statische route inrichten voor `/phone/` en `/RankingNW/`
- [ ] 2.3 Certbot SSL-certificaten genereren voor de show-domeinen op QDE
- [ ] 2.4 DirectAdmin DNS A-records wijzigen naar `45.148.62.92` (`ranking`, `halloween`)
- [ ] 2.5 Nieuwe A-records toevoegen voor Kerst: `christmas.pinkmilk.eu` en `kerst.pinkmilk.eu`
- [ ] 2.6 DNS propagatie en HTTPS responscodes verifiëren

---

## Fase 3: Standaard Ranking (`main`) Engine Upgrade

- [ ] 3.1 Git checkout branch `main` en backup-tag aanmaken (`pre-engine-upgrade`)
- [ ] 3.2 Concurrency voting post-write verification overbrengen naar `src/app/api/top3-vote` en `top10-vote`
- [ ] 3.3 Server-side route `/api/zitten-vote` toevoegen aan `main`
- [ ] 3.4 Flic 2 Remote endpoint `/api/remote` en sneltoetsen `'1'` en `'2'` overbrengen
- [ ] 3.5 Presenter no-scroll viewport constraints overnemen (MacBook scherm 100% fit)
- [ ] 3.6 Display audio policy (permanent muted display, audio via presenter) overbrengen
- [ ] 3.7 WebKit/Safari play-overlay fix overbrengen
- [ ] 3.8 Verifiëren dat alle **standaard karakters, kaarten, trailers en vragen** 100% origineel zijn gebleven
- [ ] 3.9 Lokaal `npm run build` uitvoeren en testen op `main`
- [ ] 3.10 `main` pushen naar GitHub en deployment verifiëren op Vercel/QDE

---

## Fase 4: Merry Christmas Ranking Editie (`christmas`)

- [ ] 4.1 Nieuwe branch aanmaken: `christmas` (vertrekkend vanaf de gemoderniseerde engine)
- [ ] 4.2 Kerst assets uit `Merry/` integreren in `public/pics/ChristmasTrailer/` en `public/pics/`
- [ ] 4.3 8 unieke Kerst-karakterkaarten configureren voor De Finale (`src/modules/fases/De Finale/20-01/endgameData.ts`)
- [ ] 4.4 Kerst-uitkomsten JSON aanmaken (`public/endgame/outcomes-christmas.json`)
- [ ] 4.5 Top 3 en Top 10 kerstdilemma's en vragen opstellen in `fases.json`
- [ ] 4.6 Feestelijke styling / sneeuwdeeltjes effect toevoegen aan beamer display
- [ ] 4.7 Branch `christmas` pushen naar GitHub
- [ ] 4.8 Domeinen `christmas.pinkmilk.eu` en `kerst.pinkmilk.eu` koppelen en testen

---

## Fase 5: End-to-End Verificatie & Handoff Sign-off

- [ ] 5.1 Test Standaard Show (`ranking.pinkmilk.eu`): Display, Presenter, Mobiele Speler, Flic Remote
- [ ] 5.2 Test Halloween Show (`halloween.pinkmilk.eu`): 100% functioneel met Halloween thema
- [ ] 5.3 Test Christmas Show (`christmas.pinkmilk.eu`): 100% functioneel met Kerst thema
- [ ] 5.4 Test foto-upload via Photo App: directe opslag op QDE binnen 1 seconde
- [ ] 5.5 Test failover: Documenteren hoe Vercel in 60 seconden geactiveerd kan worden bij calamiteit
- [ ] 5.6 Handoff definitief afronden en logboek bijwerken

# Handoff: Ranking Show Volledig op QDE Draaien

> **Doel:** De volledige Ranking Show infrastructuur (Frontend, Database, Media, Photo App) onderbrengen op de eigen VPS bij **QDE** (`45.148.62.92`).  
> **Resultaat:** 100% onafhankelijk van HostSlim (geen blackouts, geen trage FTP meer) en Vercel behouden als instant failover/backup.  
> **Uitvoeringsmoment:** Vannacht.

---

## 1. Waarom deze migratie noodzakelijk is

Gisteren tijdens de Halloween show bleek dat HostSlim (`103.214.6.202`) tussen **16:18 en 17:38 CET** een totale storing had (0 requests verwerkt in 80 minuten). Omdat de Photo App (`/phone/media.html`), foto-uploads via FTP en dynamische stem-afbeeldingen op HostSlim stonden, haperde de connectiviteit.

**De nieuwe architectuur op QDE:**
* **Frontend (Next.js):** Draait lokaal in Docker op QDE poort `3000`.
* **Database (PocketBase):** Draait al op QDE op `127.0.0.1:8090` (`pb.pinkmilk.eu`).
* **Interne latency:** 0,5 ms (Next.js praat intern direct met PocketBase via localhost i.p.v. over het publieke internet).
* **Media & Photo App:** Direct op de NVMe-schijf van QDE geserveerd via Nginx.
* **Uploads:** Direct lokaal weggeschreven op de server; geen trage en storingsgevoelige FTP-connecties meer nodig.
* **Failover:** Vercel blijft synchroon gekoppeld aan GitHub. Mocht QDE ooit fysiek onderhoud hebben, switch je in 1 minuut DNS terug naar Vercel.

---

## 2. Server Specificaties & Huidige Status (QDE)

* **IP:** `45.148.62.92` (Hizakura B.V. / QDE Datacenter Amsterdam)
* **Toegang:** SSH `root@45.148.62.92` (SSH-key geconfigureerd op MacBook)
* **OS:** Ubuntu Linux (Uptime > 13 dagen, Load average 0.19)
* **Opslag:** 39 GB NVMe SSD (18 GB vrij)
* **Geheugen:** 4 GB RAM (bijna 3 GB beschikbaar)
* **Aanwezige Software:**
  * Docker `29.7.2` (actief)
  * Nginx `1.18.0` (actief)
  * PocketBase (`pocketbase.service` op poort 8090)

---

## 3. Stappenplan voor Vannacht (Uitvoering)

### Stap 1: Media & Photo App synchroniseren naar QDE
1. Maak op QDE de directory aan: `/var/www/ranking-media/`
2. Download via FTP van HostSlim (`103.214.6.202`):
   * `/domains/pinkmilk.eu/public_html/phone/` $\rightarrow$ `/var/www/ranking-media/phone/`
   * `/domains/pinkmilk.eu/public_html/RankingNW/` $\rightarrow$ `/var/www/ranking-media/RankingNW/`
   * `/domains/pinkmilk.eu/public_html/ME/` $\rightarrow$ `/var/www/ranking-media/ME/`
3. Configureer Nginx om `/var/www/ranking-media/` te serveren onder bijv. `media.pinkmilk.eu` of direct als statische alias binnen het show-domein.

### Stap 2: Next.js Applicatie Containeriseren & Draaien op QDE
1. Voeg een productiegerichte `Dockerfile` toe aan `RankingNW` (Next.js standalone build).
2. Bouw het Docker image op QDE of stuur een pre-build image door:
   ```bash
   docker build -t rankingnw:latest .
   docker run -d --name ranking-show \
     --restart always \
     -p 127.0.0.1:3000:3000 \
     -e NEXT_PUBLIC_POCKETBASE_URL=https://pb.pinkmilk.eu \
     -e PB_ADMIN_EMAIL=klaas@republick.nl \
     -e PB_ADMIN_PASSWORD=... \
     rankingnw:latest
   ```
3. Test de container intern: `curl http://127.0.0.1:3000/api/session-state`.

### Stap 3: Nginx Virtual Host configureren op QDE
1. Maak `/etc/nginx/sites-available/ranking.conf`:
   * Proxy `https://ranking.pinkmilk.eu` en `https://halloween.pinkmilk.eu` naar `http://127.0.0.1:3000`.
   * Proxy `/phone/` en `/RankingNW/` direct statisch vanaf `/var/www/ranking-media/`.
   * WebSockets en SSE doorgifte inschakelen (`Upgrade`, `Connection "upgrade"`).
2. Activeer vhost: `ln -s /etc/nginx/sites-available/ranking.conf /etc/nginx/sites-enabled/`
3. SSL certificaten genereren via Certbot (`certbot --nginx -d halloween.pinkmilk.eu -d ranking.pinkmilk.eu`).

### Stap 4: DirectAdmin DNS Aanpassen
1. In HostSlim DirectAdmin DNS (`CMD_API_DNS_CONTROL`):
   * Verander A-record van `halloween` van `76.76.21.21` naar `45.148.62.92`.
   * Verander A-record van `ranking` van `216.198.79.1` naar `45.148.62.92`.
2. Controleer met `dig @8.8.8.8 halloween.pinkmilk.eu` of de records naar QDE wijzen.

### Stap 5: Lokale Uploads in Next.js Routeren (Geen FTP meer)
1. Pas `src/app/api/ftp-upload/route.ts` aan zodat hij bij detectie van de lokale QDE omgeving het bestand direct opslaat in `/var/www/ranking-media/RankingNW/` i.p.v. een trage netwerk-FTP upload te doen.
2. Foto's uploaden is hierdoor direct voltooid (in milliseconden).

### Stap 6: Automatische Database Backup Inrichten
1. Maak cronjob op QDE (`/etc/cron.daily/backup-pocketbase.sh`):
   ```bash
   #!/bin/bash
   BACKUP_DIR="/var/backups/pocketbase"
   mkdir -p $BACKUP_DIR
   sqlite3 /var/www/pocketbase/pb_data/data.db ".backup $BACKUP_DIR/data-$(date +%Y%m%d).db"
   find $BACKUP_DIR -type f -mtime +14 -delete
   ```
2. Maak uitvoerbaar: `chmod +x /etc/cron.daily/backup-pocketbase.sh`.

---

## 4. Verificatiechecklist na Uitvoering

| Test | Verwacht Resultaat |
| :--- | :--- |
| `curl -I https://halloween.pinkmilk.eu/presenter` | HTTP/2 200 (Server: Nginx / QDE) |
| `curl -I https://halloween.pinkmilk.eu/display` | HTTP/2 200 |
| `curl -I https://halloween.pinkmilk.eu/player` | HTTP/2 200 |
| Photo App link op mobiel | Laadt instant zonder HostSlim aan te roepen |
| Foto uploaden via Photo App | Binnen 1 seconde zichtbaar en opgeslagen |
| Flic Remote navigatie (`/api/remote`) | Directe slide wisseling zonder vertraging |

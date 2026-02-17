---
description: How to upload files to the pinkmilk.eu server via FTP
---

# Pinkmilk FTP Upload

Upload media files (images, videos) to the pinkmilk.eu server for use in the Ranking app.

## Server Details

| Setting | Value |
|---------|-------|
| **FTP Host** | `103.214.6.202` |
| **Username** | `dukowaeu` |
| **Password** | `tTO4rf9h*ZD8!9` |
| **Port** | `21` |
| **Remote Directory** | `/domains/pinkmilk.eu/public_html/RankingNW` |
| **Public URL** | `https://www.pinkmilk.eu/RankingNW/{filename}` |

## API Endpoint

The app has a built-in upload endpoint at `/api/ftp-upload`.

### Upload a file via the API

```bash
curl -X POST http://localhost:3000/api/ftp-upload \
  -F "file=@/path/to/video.mp4" \
  -F "filename=MyVideo.mp4"
```

### Response

```json
{
  "success": true,
  "filename": "MyVideo.mp4",
  "url": "https://www.pinkmilk.eu/RankingNW/MyVideo.mp4",
  "size": 1234567
}
```

## Manual FTP Upload (via curl)

// turbo
```bash
curl -T /path/to/file.mp4 \
  ftp://103.214.6.202/domains/pinkmilk.eu/public_html/RankingNW/file.mp4 \
  --user "dukowaeu:tTO4rf9h*ZD8!9"
```

## Manual FTP Upload (via Node.js script)

```javascript
const { Client } = require('basic-ftp');

async function upload(localPath, remoteFilename) {
  const client = new Client();
  await client.access({
    host: '103.214.6.202',
    user: 'dukowaeu',
    password: 'tTO4rf9h*ZD8!9',
    port: 21,
    secure: false,
  });
  await client.ensureDir('/domains/pinkmilk.eu/public_html/RankingNW');
  await client.uploadFrom(localPath, remoteFilename);
  client.close();
  console.log(`Uploaded: https://www.pinkmilk.eu/RankingNW/${remoteFilename}`);
}

upload('./my-video.mp4', 'my-video.mp4');
```

## Environment Variables (optional)

These can be set in `.env.local` to override defaults:

```
FTP_HOST=103.214.6.202
FTP_USER=dukowaeu
FTP_PASS=tTO4rf9h*ZD8!9
FTP_PORT=21
FTP_REMOTE_DIR=/domains/pinkmilk.eu/public_html/RankingNW
FTP_PUBLIC_URL=https://www.pinkmilk.eu/RankingNW
```

## Notes

- Files are publicly accessible immediately after upload at `https://www.pinkmilk.eu/RankingNW/{filename}`
- The server runs Apache2 — supports `.mp4`, `.m4v`, `.jpg`, `.png`, `.webp`, etc.
- No authentication is needed to read files, only to upload
- The presenter dashboard uses this FTP endpoint for the Browse → Upload flow

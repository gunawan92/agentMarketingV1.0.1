# Security

## Secret management

- Jangan commit `.env`, API key, atau respons yang mengandung data sensitif.
- Gunakan secret manager pada production dan rotasi key bila terpapar.

## Konfigurasi production

- Set `NODE_ENV=production` agar detail internal error tidak dikirim ke client.
- Isi `CORS_ORIGIN` dengan origin frontend yang eksplisit; jangan membiarkannya kosong di production.
- Gunakan HTTPS melalui reverse proxy.
- Batasi akses API dengan autentikasi dan rate limiting sebelum dipublikasikan.

## Prompt dan data

- Treat `campaignBrief` sebagai input tidak tepercaya.
- Jangan masukkan credential, PII sensitif, atau instruksi internal ke prompt.
- Review perubahan file di `src/skills/` seperti perubahan kode karena prompt mengendalikan perilaku agent.

## Incident response

Jika key terpapar: cabut/rotasi key provider, perbarui secret deployment, redeploy service, dan periksa log akses.

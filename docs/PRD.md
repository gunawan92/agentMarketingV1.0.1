# Product Requirements Document

## Product

Marketing AI Agent Ecosystem adalah API backend untuk mengubah campaign brief menjadi strategi dan copy marketing yang terstruktur.

## Tujuan

- Mempercepat pembuatan campaign draft yang konsisten.
- Memisahkan keahlian agent ke system prompt Markdown yang mudah diubah.
- Mengembalikan data JSON yang siap dipakai frontend atau workflow lain.

## Alur pengguna

1. Client mengirim `campaignBrief` dan konteks opsional ke API.
2. Strategy Agent menyusun target audience, positioning, message, channel, dan CTA.
3. Copywriter Agent menerima brief dan output strategi untuk membuat headline, social copy, dan email.
4. Client menerima kedua output dalam satu respons.

## Ruang lingkup versi 1

- Satu endpoint generate campaign.
- Dua agent berantai: strategy dan copywriter.
- Provider OpenAI atau API yang OpenAI-compatible.
- Tanpa akun pengguna, database, riwayat campaign, atau streaming response.

## Kriteria penerimaan

- Request tanpa `campaignBrief` mendapat HTTP 400.
- Respons sukses berisi objek `strategy` dan `copy`.
- Setiap panggilan LLM meminta JSON object dan responsnya divalidasi.
- Kegagalan LLM dan timeout menghasilkan respons error JSON.

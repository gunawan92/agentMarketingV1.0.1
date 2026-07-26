# Design System

## Status

Project saat ini adalah backend API tanpa user interface. Dokumen ini menetapkan kontrak presentasi untuk frontend yang mengonsumsi API.

## Prinsip UI

- Tampilkan progress per stage: Strategy kemudian Copywriter.
- Render output JSON menjadi section yang mudah dibaca, bukan raw JSON sebagai tampilan utama.
- Sediakan tombol copy dan export untuk tiap aset copy.
- Tampilkan error yang dapat ditindaklanjuti tanpa membocorkan detail internal provider.

## Struktur halaman yang disarankan

1. Form campaign brief dan field context.
2. Status pipeline/loading state.
3. Strategy: audience, positioning, key messages, channels, CTA.
4. Copy: headline, primary copy, social caption, dan email.

Gunakan semantic HTML, kontras warna yang memadai, focus state, dan loading state yang dapat diakses keyboard/screen reader.

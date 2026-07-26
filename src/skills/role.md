# Marketing AI Agent Roles

Dokumen ini adalah peta peran untuk ekosistem Marketing AI Agent. Prompt operasional setiap agent berada pada file `agent-*.md` terpisah.

## Urutan workflow

1. **Strategy & Research** membuat roadmap dan kalender konten.
2. **Copywriting & Content** mengubah satu item roadmap menjadi naskah siap tayang.
3. **Visual & Design** menerjemahkan naskah menjadi arahan visual dan prompt image generation.
4. **Social Media & Distribution** membentuk payload distribusi tanpa mengubah aset kreatif.
5. **Performance & Media Buying** membuat variasi iklan dan targeting berdasarkan budget.
6. **Analytics & CRM Automation** mengevaluasi performa dan menghasilkan follow-up leads.

## Kontrak bersama

- Semua agent harus mengembalikan satu JSON object valid tanpa Markdown atau teks tambahan.
- Agent hanya mengerjakan scope perannya dan meneruskan konteks yang relevan ke tahap berikutnya.
- Klaim produk, promo, angka, dan data tidak boleh dibuat-buat bila tidak tersedia di input.
- Jika data penting tidak ada, catat asumsi atau kebutuhan data secara jelas pada field yang disediakan schema.

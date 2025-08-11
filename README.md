# Reading Tracker

Aplikasi web untuk melacak aktivitas membaca buku. Integrasi Google Books, autentikasi JWT, dan API backend (Express + MySQL). Tampilan dark-theme dengan sentuhan medieval-vampire.

Fitur utama
- Login/registrasi (email & password), JWT, proteksi rute
- Tambah buku dari Google Books, CRUD koleksi
- Kategori (banyak-ke-banyak) dan rekomendasi berdasarkan kategori teratas
- Progress halaman cepat (+10/−10) dan detail buku lengkap (rating, review, shelf, tags, series)
- Sesi membaca (start/stop), ringkasan durasi, streak
- Highlights/quotes per buku (add/list/delete)
- Statistik dan timeline, KPI cards + sparkline
- Tema: dark/light/high-contrast, pengaturan ukuran font, reduce motion
- Ekspor/Impor data (JSON)

Persiapan
1. Clone repo ini dan install dependensi
   - Node.js 18+
   - MySQL 8+
2. Salin .env.example menjadi .env lalu isi variabel (DB, JWT_SECRET)
3. Buat database, jalankan server API, dan jalankan frontend

Instalasi
```bash
npm install
```

Konfigurasi env
```
PORT=5173
VITE_API_URL=http://localhost:5174/api
API_PORT=5174
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=reading_tracker
JWT_SECRET=supersecret
```

Menjalankan proyek (dua proses)
Terminal 1 (API):
```bash
node src/api/server.js
```
Terminal 2 (Frontend):
```bash
npm run dev
```
Akses di http://localhost:5173

Struktur direktori (ringkas)
```
src/
  api/
    server.js        # API Express + MySQL
  components/
    Navbar.js        # Navigasi utama
    BookCard.js      # Kartu buku + quick actions
    AddBookModal.js  # Tambah buku via Google Books
    SettingsModal.js # Tema, font, reduce motion
    Toast.js         # Notifikasi
  pages/
    Dashboard.js     # KPI, chart, list buku, filter
    BookDetail.js    # Detail buku, sesi, highlights
    Login.js         # Auth
  utils/
    http.js          # Axios instance + token
    auth.js          # util JWT
    router.js        # Router hash sederhana
    googleBooks.js   # Integrasi Google Books
  styles/
    index.css        # Tailwind + tema
```

Endpoint ringkas
- Auth: POST /api/auth/register, /api/auth/login, GET /api/auth/me
- Buku: GET/POST/PUT/DELETE /api/books, GET /api/books/:id
- Kategori: GET/POST/DELETE /api/categories, PUT /api/books/:id/categories, GET /api/categories/top
- Sesi: POST /api/books/:id/sessions/start, POST /api/books/:id/sessions/stop, GET /api/books/:id/sessions, GET /api/sessions/summary
- Highlights: GET/POST /api/books/:id/highlights, DELETE /api/highlights/:hid
- Ekspor/Impor: GET /api/export, POST /api/import

Catatan
- Jika chart terlihat “berat”, aktifkan Reduce motion di Pengaturan.
- Tailwind lint mungkin memperingatkan @apply di editor; abaikan saat dev (build tetap jalan).

Lisensi
MIT

# MES PLC Splitter — Tahap 1

Aplikasi web untuk menggantikan input Excel *Operator Daily Output*. Berjalan di satu PC kantor,
diakses dari browser PC lain lewat jaringan lokal (tanpa internet).

## Isi tahap 1
- Login per peran: Admin, Engineer, SPV, Leader, Asisten Leader (Fase 1 / Fase 2 / FA1).
- Input output per shift (Pagi/Malam) per station, per operator per produk, tampilan seperti sheet Excel.
  Enter pindah ke sel bawah, paste blok angka dari Excel bisa langsung.
- Alur: Draft → Submit (Asisten Leader) → Verifikasi Leader (setujui = terkunci, tolak = kembali ke draft).
- Kunci otomatis: jam selesai shift + 2 jam
  (Pagi 17:00 → 19:00, overtime 20:00 → 22:00; Malam 05:00 → 07:00, overtime 08:00 → 10:00 keesokan hari).
- Data terkunci hanya bisa diubah lewat request koreksi (Leader/Engineer) yang disetujui SPV.
- Audit log semua submit, verifikasi, kunci otomatis, koreksi, dan perubahan master data.
- Master data operator, station (urutan proses), dan user.

Belum termasuk (tahap 2–4): report harian/yield/trend, performa karyawan, export, migrasi data lama.

## Instalasi di PC server (sekali saja)
1. Instal Python 3.10+ dari python.org (centang *Add Python to PATH*).
2. Buka Command Prompt di folder ini, lalu:
   `pip install -r requirements.txt`
3. Database sudah terisi master data September 2026 (`data/mes.db`).
   Untuk mengisi ulang dari file Excel lain: hapus `data/mes.db`, lalu
   `python seed_from_excel.py "202609_SEPTEMBER_-_OPERATOR_DAILY_OUTPUT.xlsx"`
4. Jalankan `run.bat`. Dari PC lain buka `http://<IP-PC-server>:5000`
   (cek IP dengan perintah `ipconfig`). Izinkan Python di Windows Firewall bila diminta.
5. Jadwalkan `backup.bat` di Task Scheduler (mis. setiap hari).

## Akun awal (password semua `1234`, segera ganti)
| Username | Peran |
|---|---|
| admin | Admin (kelola user) |
| engineer | Engineer (master data, request koreksi) |
| spv | SPV (verifikasi, setujui koreksi) |
| leader | Leader (verifikasi, request koreksi) |
| al_f1 / al_f2 / al_fa1 | Asisten Leader Fase 1 / Fase 2 / FA1 |

## Catatan teknis
- Database: SQLite, satu file `data/mes.db`. Backup = salin file ini.
- Ganti `MES_SECRET` (environment variable) dengan kunci acak agar sesi login aman.
- Port bisa diubah dengan environment variable `MES_PORT`.

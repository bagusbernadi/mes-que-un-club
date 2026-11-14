# MES PLC Splitter — Operator Daily Output

Pengganti workbook Excel *Operator Daily Output* untuk produksi PLC Splitter.

## Isi repo
| Folder | Isi |
|---|---|
| `demo/index.html` | Demo lengkap (HTML mandiri, data contoh September 2026). Buka langsung di browser. |
| `demo/source/` | Sumber demo: `head.html` (CSS + shell + Chart.js), `app.js` (logika), `demo_master2.json` (master station/operator + data harian). |
| `flask-app/` | Aplikasi web Tahap 1 (Flask + SQLite) untuk PC kantor. Lihat `flask-app/README.md`. |

## Build ulang demo
```bash
python3 -c "h=open('demo/source/head.html').read();j=open('demo/source/demo_master2.json').read();a=open('demo/source/app.js').read();open('demo/index.html','w').write(h+'<script>const M='+j+';\n'+a+'</script></body></html>')"
```

## Fitur demo
- Input output per station per shift (Asisten Leader), verifikasi Leader, auto-lock 2 jam setelah shift, koreksi via approval SPV, audit log.
- Report harian (Default = tampilan Excel, New = versi ringkas).
- Yield output (Fase 1 / Fase 2 / FA1, filter station yield < 100%), Grafik trend (target per tahap).
- OK Yield Report mingguan (Jumat–Kamis): Coupling (OK Coupling + NG UV Exposure) dan IL Test, per tipe 1*2 / 1*4 / 1*8.
- Rework Product: OK, NG, yield station yang menghasilkan NG.
- Performa karyawan dan Rekap karyawan.

Catatan: `flask-app` belum mengikuti desain demo terbaru.

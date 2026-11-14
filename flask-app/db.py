"""Database SQLite MES PLC Splitter — skema & helper."""
import os, sqlite3
from datetime import datetime, timedelta, date

BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("MES_DB", os.path.join(BASE, "data", "mes.db"))

SCHEMA = """
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, nama TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','engineer','spv','leader','asisten_leader')),
  grup TEXT CHECK(grup IN ('F1','F2','FA1') OR grup IS NULL),
  password_hash TEXT NOT NULL, aktif INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS stations(
  id INTEGER PRIMARY KEY, nama TEXT UNIQUE NOT NULL,
  grup TEXT NOT NULL CHECK(grup IN ('F1','F2','FA1')),
  sub_fase TEXT NOT NULL, urutan INTEGER NOT NULL, aktif INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS products(
  kode TEXT PRIMARY KEY, urutan INTEGER NOT NULL,
  grup TEXT NOT NULL CHECK(grup IN ('FASE','FA1')));
CREATE TABLE IF NOT EXISTS operators(
  id TEXT PRIMARY KEY, nama TEXT UNIQUE NOT NULL, line TEXT, jabatan TEXT,
  station_id INTEGER REFERENCES stations(id), tgl_masuk TEXT,
  target_per_hari INTEGER, status TEXT NOT NULL DEFAULT 'Aktif');
CREATE TABLE IF NOT EXISTS submissions(
  id INTEGER PRIMARY KEY, tanggal TEXT NOT NULL, shift TEXT NOT NULL CHECK(shift IN ('Pagi','Malam')),
  grup TEXT NOT NULL, overtime INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('draft','submitted','rejected','locked')),
  auto_locked INTEGER NOT NULL DEFAULT 0, catatan TEXT,
  input_by INTEGER REFERENCES users(id), submitted_at TEXT,
  verified_by INTEGER REFERENCES users(id), locked_at TEXT,
  UNIQUE(tanggal, shift, grup));
CREATE TABLE IF NOT EXISTS production_log(
  id INTEGER PRIMARY KEY, tanggal TEXT NOT NULL, shift TEXT NOT NULL,
  station_id INTEGER NOT NULL REFERENCES stations(id),
  operator_id TEXT NOT NULL REFERENCES operators(id),
  produk TEXT NOT NULL REFERENCES products(kode),
  qty_ok INTEGER NOT NULL DEFAULT 0, qty_ng INTEGER NOT NULL DEFAULT 0,
  updated_by INTEGER REFERENCES users(id), updated_at TEXT,
  UNIQUE(tanggal, shift, station_id, operator_id, produk));
CREATE INDEX IF NOT EXISTS ix_log_tgl ON production_log(tanggal, shift);
CREATE INDEX IF NOT EXISTS ix_log_op ON production_log(operator_id, tanggal);
CREATE TABLE IF NOT EXISTS koreksi_requests(
  id INTEGER PRIMARY KEY, submission_id INTEGER NOT NULL REFERENCES submissions(id),
  station_id INTEGER NOT NULL REFERENCES stations(id), alasan TEXT NOT NULL,
  perubahan TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
  CHECK(status IN ('pending','approved','rejected')),
  diminta_oleh INTEGER REFERENCES users(id), diminta_at TEXT,
  diputus_oleh INTEGER REFERENCES users(id), diputus_at TEXT, catatan_spv TEXT);
CREATE TABLE IF NOT EXISTS audit_log(
  id INTEGER PRIMARY KEY, waktu TEXT NOT NULL, user_id INTEGER REFERENCES users(id),
  aksi TEXT NOT NULL, detail TEXT NOT NULL);
"""

# Jam selesai shift (normal, overtime). Shift malam selesai keesokan harinya.
SHIFT_END = {"Pagi": (17, 20), "Malam": (5, 8)}
LOCK_AFTER_HOURS = 2
GRUP_LABEL = {"F1": "Fase 1", "F2": "Fase 2", "FA1": "FA1"}


def connect():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    return con


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with connect() as con:
        con.executescript(SCHEMA)


def now():
    """Waktu sekarang. MES_NOW (YYYY-MM-DD HH:MM) hanya untuk pengujian."""
    fake = os.environ.get("MES_NOW")
    return datetime.strptime(fake, "%Y-%m-%d %H:%M") if fake else datetime.now()


def lock_deadline(tanggal, shift, overtime):
    d = date.fromisoformat(tanggal) if isinstance(tanggal, str) else tanggal
    end_hour = SHIFT_END[shift][1 if overtime else 0]
    end = datetime(d.year, d.month, d.day, end_hour)
    if shift == "Malam":
        end += timedelta(days=1)
    return end + timedelta(hours=LOCK_AFTER_HOURS)


def apply_auto_lock(con):
    """Kunci otomatis submission yang lewat batas (dijalankan di setiap request)."""
    t = now()
    rows = con.execute("SELECT * FROM submissions WHERE status!='locked'").fetchall()
    n = 0
    for s in rows:
        if t >= lock_deadline(s["tanggal"], s["shift"], s["overtime"]):
            con.execute("UPDATE submissions SET status='locked', auto_locked=1, locked_at=? WHERE id=?",
                        (t.strftime("%Y-%m-%d %H:%M"), s["id"]))
            con.execute("INSERT INTO audit_log(waktu,user_id,aksi,detail) VALUES(?,?,?,?)",
                        (t.strftime("%Y-%m-%d %H:%M"), None, "auto_lock",
                         f"{s['tanggal']} {s['shift']} {s['grup']} terkunci otomatis (belum diverifikasi)"))
            n += 1
    return n


def audit(con, user_id, aksi, detail):
    con.execute("INSERT INTO audit_log(waktu,user_id,aksi,detail) VALUES(?,?,?,?)",
                (now().strftime("%Y-%m-%d %H:%M:%S"), user_id, aksi, detail))

"""MES PLC Splitter — Tahap 1: login per peran, master data, input per shift,
verifikasi Leader, kunci otomatis, koreksi dengan persetujuan SPV, audit log."""
import json, os, functools
from datetime import date, timedelta
from flask import Flask, render_template, request, redirect, url_for, session, flash, abort, g
from werkzeug.security import check_password_hash, generate_password_hash
import db

app = Flask(__name__)
app.secret_key = os.environ.get("MES_SECRET", "ganti-dengan-kunci-rahasia-kantor")
ROLE_LABEL = {"admin":"Admin","engineer":"Engineer","spv":"SPV","leader":"Leader","asisten_leader":"Asisten Leader"}
STATUS_LABEL = {None:"Belum input","draft":"Draft","submitted":"Menunggu verifikasi",
                "rejected":"Ditolak","locked":"Terkunci"}
MAX_QTY = 100000


# ---------- request lifecycle ----------
@app.before_request
def before():
    g.con = db.connect()
    db.apply_auto_lock(g.con); g.con.commit()
    g.user = None
    if "uid" in session:
        g.user = g.con.execute("SELECT * FROM users WHERE id=? AND aktif=1", (session["uid"],)).fetchone()


@app.teardown_request
def teardown(exc):
    con = g.pop("con", None)
    if con:
        if exc is None: con.commit()
        con.close()


@app.context_processor
def inject():
    return dict(user=g.get("user"), ROLE_LABEL=ROLE_LABEL, STATUS_LABEL=STATUS_LABEL,
                GRUP_LABEL=db.GRUP_LABEL, pending_koreksi=_pending_koreksi())


def _pending_koreksi():
    if not g.get("user") or g.user["role"] not in ("spv", "admin"): return 0
    return g.con.execute("SELECT COUNT(*) FROM koreksi_requests WHERE status='pending'").fetchone()[0]


def login_required(*roles):
    def deco(f):
        @functools.wraps(f)
        def wrap(*a, **k):
            if not g.user: return redirect(url_for("login", next=request.path))
            if roles and g.user["role"] not in roles: abort(403)
            return f(*a, **k)
        return wrap
    return deco


# ---------- helpers ----------
def allowed_grups(user):
    if user["role"] == "asisten_leader": return [user["grup"]]
    return ["F1", "F2", "FA1"]


def get_submission(tanggal, shift, grup):
    return g.con.execute("SELECT * FROM submissions WHERE tanggal=? AND shift=? AND grup=?",
                         (tanggal, shift, grup)).fetchone()


def is_editable(sub, tanggal, shift, overtime=0):
    """(boleh_edit, alasan)."""
    if date.fromisoformat(tanggal) > db.now().date():
        return False, "Tanggal belum berjalan."
    if sub and sub["status"] in ("submitted", "locked"):
        return False, f"Status shift: {STATUS_LABEL[sub['status']]}."
    ot = sub["overtime"] if sub else overtime
    if db.now() >= db.lock_deadline(tanggal, shift, ot):
        return False, "Sudah lewat batas kunci. Perubahan hanya lewat request koreksi."
    return True, ""


def products_for(station):
    grp = "FA1" if station["grup"] == "FA1" else "FASE"
    return [r["kode"] for r in g.con.execute("SELECT kode FROM products WHERE grup=? ORDER BY urutan", (grp,))]


def grid_data(tanggal, shift, station):
    """Operator yang tampil + nilai log yang sudah ada."""
    logs = g.con.execute("""SELECT operator_id,produk,qty_ok,qty_ng FROM production_log
                            WHERE tanggal=? AND shift=? AND station_id=?""",
                         (tanggal, shift, station["id"])).fetchall()
    vals = {(r["operator_id"], r["produk"]): r for r in logs}
    ids = {r["operator_id"] for r in logs}
    ops = g.con.execute("""SELECT * FROM operators WHERE station_id=? AND status NOT LIKE 'Resign%'
                           ORDER BY nama""", (station["id"],)).fetchall()
    ops = list(ops) + [o for o in g.con.execute(
        f"SELECT * FROM operators WHERE id IN ({','.join('?'*len(ids))}) ORDER BY nama", tuple(ids)).fetchall()
        if o["id"] not in {x["id"] for x in ops}] if ids else list(ops)
    return ops, vals


def parse_grid(form, products):
    """Baca input ok|OPID|PRODUK dan ng|OPID|PRODUK -> {(op,prod):(ok,ng)}; error list."""
    out, errors = {}, []
    valid_ops = {r["id"] for r in g.con.execute("SELECT id FROM operators")}
    keys = {tuple(k.split("|", 2)[1:]) for k in form if k.startswith(("ok|", "ng|"))}
    for op, prod in keys:
        if op not in valid_ops or prod not in products:
            errors.append(f"Data tidak dikenal: {op} {prod}"); continue
        nums = []
        for kind in ("ok", "ng"):
            raw = form.get(f"{kind}|{op}|{prod}", "").strip().replace(",", "").replace(".", "")
            if raw == "": nums.append(None); continue
            if not raw.isdigit() or int(raw) > MAX_QTY:
                errors.append(f"{op} {prod} {kind.upper()}: '{raw}' bukan angka 0–{MAX_QTY}"); nums.append(None); continue
            nums.append(int(raw))
        if nums[0] is not None or nums[1] is not None:
            out[(op, prod)] = (nums[0] or 0, nums[1] or 0)
    return out, errors


def stamp(): return db.now().strftime("%Y-%m-%d %H:%M")


# ---------- auth ----------
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        u = g.con.execute("SELECT * FROM users WHERE username=? AND aktif=1",
                          (request.form["username"].strip(),)).fetchone()
        if u and check_password_hash(u["password_hash"], request.form["password"]):
            session.clear(); session["uid"] = u["id"]
            return redirect(request.args.get("next") or url_for("home"))
        flash("Username atau password salah.", "error")
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear(); return redirect(url_for("login"))


@app.route("/password", methods=["GET", "POST"])
@login_required()
def change_password():
    if request.method == "POST":
        if not check_password_hash(g.user["password_hash"], request.form["lama"]):
            flash("Password lama salah.", "error")
        elif len(request.form["baru"]) < 4:
            flash("Password baru minimal 4 karakter.", "error")
        else:
            g.con.execute("UPDATE users SET password_hash=? WHERE id=?",
                          (generate_password_hash(request.form["baru"]), g.user["id"]))
            flash("Password diganti.", "ok"); return redirect(url_for("home"))
    return render_template("password.html")


# ---------- beranda: papan status shift ----------
@app.route("/")
@login_required()
def home():
    today = db.now().date()
    days = [(today - timedelta(days=i)).isoformat() for i in range(7)]
    grups = allowed_grups(g.user)
    subs = {(s["tanggal"], s["shift"], s["grup"]): s for s in g.con.execute(
        "SELECT * FROM submissions WHERE tanggal>=?", (days[-1],))}
    totals = {(r["tanggal"], r["shift"], r["grup"]): r for r in g.con.execute(
        """SELECT l.tanggal,l.shift,s.grup,SUM(qty_ok) ok,SUM(qty_ng) ng FROM production_log l
           JOIN stations s ON s.id=l.station_id WHERE l.tanggal>=? GROUP BY 1,2,3""", (days[-1],))}
    deadlines = {(d, sh): db.lock_deadline(d, sh, 0).strftime("%d-%b %H:%M") for d in days for sh in ("Pagi", "Malam")}
    return render_template("home.html", days=days, grups=grups, subs=subs, totals=totals, deadlines=deadlines)


# ---------- input per shift ----------
@app.route("/input", methods=["GET", "POST"])
@login_required("asisten_leader", "leader", "admin")
def input_shift():
    grups = allowed_grups(g.user)
    tanggal = request.values.get("tanggal") or db.now().date().isoformat()
    shift = request.values.get("shift") or ("Pagi" if 8 <= db.now().hour < 20 else "Malam")
    stations = g.con.execute(f"SELECT * FROM stations WHERE aktif=1 AND grup IN ({','.join('?'*len(grups))}) ORDER BY urutan",
                             grups).fetchall()
    sid = int(request.values.get("station") or stations[0]["id"])
    station = next((s for s in stations if s["id"] == sid), None)
    if not station: abort(403)
    sub = get_submission(tanggal, shift, station["grup"])
    products = products_for(station)

    if request.method == "POST":
        overtime = 1 if request.form.get("overtime") else 0
        ok_edit, why = is_editable(sub, tanggal, shift, overtime)
        if not ok_edit:
            flash(why, "error"); return redirect(request.url)
        data, errors = parse_grid(request.form, products)
        if errors:
            for e in errors[:8]: flash(e, "error")
            return redirect(url_for("input_shift", tanggal=tanggal, shift=shift, station=sid))
        if not sub:
            g.con.execute("""INSERT INTO submissions(tanggal,shift,grup,overtime,status,input_by)
                             VALUES(?,?,?,?, 'draft', ?)""", (tanggal, shift, station["grup"], overtime, g.user["id"]))
        else:
            g.con.execute("UPDATE submissions SET overtime=?, status='draft' WHERE id=?", (overtime, sub["id"]))
        g.con.execute("DELETE FROM production_log WHERE tanggal=? AND shift=? AND station_id=?", (tanggal, shift, sid))
        g.con.executemany("""INSERT INTO production_log(tanggal,shift,station_id,operator_id,produk,qty_ok,qty_ng,updated_by,updated_at)
                             VALUES(?,?,?,?,?,?,?,?,?)""",
                          [(tanggal, shift, sid, op, pr, ok, ng, g.user["id"], stamp()) for (op, pr), (ok, ng) in data.items()])
        flash(f"Draft {station['nama']} tersimpan ({len(data)} baris).", "ok")
        if request.form.get("aksi") == "submit":
            return submit_shift(tanggal, shift, station["grup"])
        return redirect(url_for("input_shift", tanggal=tanggal, shift=shift, station=sid))

    ops, vals = grid_data(tanggal, shift, station)
    editable, why = is_editable(sub, tanggal, shift)
    filled = {r["station_id"] for r in g.con.execute(
        "SELECT DISTINCT station_id FROM production_log WHERE tanggal=? AND shift=?", (tanggal, shift))}
    all_ops = g.con.execute("SELECT id,nama FROM operators WHERE status NOT LIKE 'Resign%' ORDER BY nama").fetchall()
    ot = sub["overtime"] if sub else 0
    return render_template("input.html", tanggal=tanggal, shift=shift, stations=stations, station=station,
                           sub=sub, products=products, ops=ops, vals=vals, editable=editable, why=why,
                           filled=filled, all_ops=all_ops,
                           deadline=db.lock_deadline(tanggal, shift, ot).strftime("%d-%b-%Y %H:%M"), mode="input")


def submit_shift(tanggal, shift, grup):
    sub = get_submission(tanggal, shift, grup)
    if grup not in allowed_grups(g.user): abort(403)
    if not sub:
        flash("Belum ada data untuk di-submit.", "error")
    else:
        ok_edit, why = is_editable(sub, tanggal, shift)
        if not ok_edit: flash(why, "error")
        else:
            g.con.execute("UPDATE submissions SET status='submitted', submitted_at=?, catatan=NULL WHERE id=?",
                          (stamp(), sub["id"]))
            db.audit(g.con, g.user["id"], "submit", f"{tanggal} {shift} {grup}")
            flash(f"Shift {shift} {tanggal} {db.GRUP_LABEL[grup]} di-submit. Menunggu verifikasi Leader.", "ok")
    return redirect(url_for("home"))


@app.route("/submit", methods=["POST"])
@login_required("asisten_leader", "leader", "admin")
def submit():
    return submit_shift(request.form["tanggal"], request.form["shift"], request.form["grup"])


# ---------- verifikasi ----------
@app.route("/verifikasi")
@login_required("leader", "spv", "admin", "engineer")
def verifikasi():
    rows = g.con.execute("""SELECT s.*, u.nama AS penginput,
          (SELECT SUM(qty_ok) FROM production_log l JOIN stations st ON st.id=l.station_id
            WHERE l.tanggal=s.tanggal AND l.shift=s.shift AND st.grup=s.grup) ok,
          (SELECT SUM(qty_ng) FROM production_log l JOIN stations st ON st.id=l.station_id
            WHERE l.tanggal=s.tanggal AND l.shift=s.shift AND st.grup=s.grup) ng
        FROM submissions s LEFT JOIN users u ON u.id=s.input_by
        ORDER BY CASE s.status WHEN 'submitted' THEN 0 WHEN 'draft' THEN 1 WHEN 'rejected' THEN 2 ELSE 3 END,
                 s.tanggal DESC, s.shift LIMIT 120""").fetchall()
    dl = {r["id"]: db.lock_deadline(r["tanggal"], r["shift"], r["overtime"]).strftime("%d-%b %H:%M") for r in rows}
    return render_template("verifikasi.html", rows=rows, dl=dl)


@app.route("/shift/<int:sid>")
@login_required()
def shift_detail(sid):
    sub = g.con.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone() or abort(404)
    if sub["grup"] not in allowed_grups(g.user): abort(403)
    per_station = g.con.execute("""SELECT st.id, st.nama, st.sub_fase, COUNT(DISTINCT l.operator_id) n_op,
          SUM(l.qty_ok) ok, SUM(l.qty_ng) ng FROM stations st
          JOIN production_log l ON l.station_id=st.id AND l.tanggal=? AND l.shift=?
          WHERE st.grup=? GROUP BY st.id ORDER BY st.urutan""", (sub["tanggal"], sub["shift"], sub["grup"])).fetchall()
    koreksi = g.con.execute("""SELECT k.*, u.nama peminta, st.nama station FROM koreksi_requests k
          JOIN users u ON u.id=k.diminta_oleh JOIN stations st ON st.id=k.station_id
          WHERE submission_id=? ORDER BY k.id DESC""", (sid,)).fetchall()
    return render_template("shift_detail.html", sub=sub, per_station=per_station, koreksi=koreksi,
                           deadline=db.lock_deadline(sub["tanggal"], sub["shift"], sub["overtime"]).strftime("%d-%b-%Y %H:%M"))


@app.route("/shift/<int:sid>/station/<int:stid>")
@login_required()
def shift_station(sid, stid):
    sub = g.con.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone() or abort(404)
    if sub["grup"] not in allowed_grups(g.user): abort(403)
    station = g.con.execute("SELECT * FROM stations WHERE id=?", (stid,)).fetchone() or abort(404)
    ops, vals = grid_data(sub["tanggal"], sub["shift"], station)
    ops = [o for o in ops if any((o["id"], p) in vals for p in products_for(station))]
    return render_template("input.html", tanggal=sub["tanggal"], shift=sub["shift"], stations=[station], station=station,
                           sub=sub, products=products_for(station), ops=ops, vals=vals, editable=False,
                           why="Tampilan baca saja.", filled=set(), all_ops=[], deadline="", mode="view")


@app.route("/shift/<int:sid>/<aksi>", methods=["POST"])
@login_required("leader", "spv", "admin")
def shift_action(sid, aksi):
    sub = g.con.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone() or abort(404)
    if sub["status"] != "submitted":
        flash("Hanya shift berstatus 'Menunggu verifikasi' yang bisa diproses.", "error")
    elif aksi == "setujui":
        g.con.execute("UPDATE submissions SET status='locked', verified_by=?, locked_at=?, auto_locked=0 WHERE id=?",
                      (g.user["id"], stamp(), sid))
        db.audit(g.con, g.user["id"], "verifikasi", f"{sub['tanggal']} {sub['shift']} {sub['grup']} disetujui & dikunci")
        flash("Shift disetujui dan dikunci.", "ok")
    elif aksi == "tolak":
        catatan = request.form.get("catatan", "").strip()
        if not catatan:
            flash("Isi alasan penolakan.", "error"); return redirect(url_for("shift_detail", sid=sid))
        g.con.execute("UPDATE submissions SET status='rejected', catatan=? WHERE id=?", (catatan, sid))
        db.audit(g.con, g.user["id"], "tolak", f"{sub['tanggal']} {sub['shift']} {sub['grup']}: {catatan}")
        flash("Shift dikembalikan ke Asisten Leader.", "ok")
    else:
        abort(404)
    return redirect(url_for("verifikasi"))


# ---------- koreksi ----------
@app.route("/koreksi/baru", methods=["GET", "POST"])
@login_required("leader", "engineer", "admin")
def koreksi_baru():
    tanggal, shift = request.values["tanggal"], request.values["shift"]
    station = g.con.execute("SELECT * FROM stations WHERE id=?", (int(request.values["station"]),)).fetchone() or abort(404)
    sub = get_submission(tanggal, shift, station["grup"])
    if sub and sub["status"] != "locked":
        flash("Shift ini belum terkunci; perbaiki lewat input biasa atau tolak saat verifikasi.", "error")
        return redirect(url_for("shift_detail", sid=sub["id"]))
    products = products_for(station)
    ops, vals = grid_data(tanggal, shift, station)
    if request.method == "POST":
        alasan = request.form.get("alasan", "").strip()
        data, errors = parse_grid(request.form, products)
        if not alasan: errors.append("Alasan koreksi wajib diisi.")
        changes = []
        keys = set(data) | {k for k in vals}
        for op, pr in sorted(keys):
            old = vals.get((op, pr)); new = data.get((op, pr), (0, 0))
            o = (old["qty_ok"], old["qty_ng"]) if old else (0, 0)
            if o != new:
                changes.append(dict(op=op, prod=pr, old_ok=o[0], old_ng=o[1], new_ok=new[0], new_ng=new[1]))
        if not changes: errors.append("Tidak ada angka yang berubah.")
        if errors:
            for e in errors: flash(e, "error")
        else:
            if not sub:
                g.con.execute("""INSERT INTO submissions(tanggal,shift,grup,status,auto_locked,locked_at)
                                 VALUES(?,?,?,'locked',1,?)""", (tanggal, shift, station["grup"], stamp()))
                sub = get_submission(tanggal, shift, station["grup"])
            g.con.execute("""INSERT INTO koreksi_requests(submission_id,station_id,alasan,perubahan,diminta_oleh,diminta_at)
                             VALUES(?,?,?,?,?,?)""", (sub["id"], station["id"], alasan, json.dumps(changes), g.user["id"], stamp()))
            db.audit(g.con, g.user["id"], "request_koreksi", f"{tanggal} {shift} {station['nama']}: {len(changes)} perubahan")
            flash(f"Request koreksi ({len(changes)} perubahan) dikirim ke SPV.", "ok")
            return redirect(url_for("koreksi_list"))
    all_ops = g.con.execute("SELECT id,nama FROM operators WHERE status NOT LIKE 'Resign%' ORDER BY nama").fetchall()
    return render_template("input.html", tanggal=tanggal, shift=shift, stations=[station], station=station, sub=sub,
                           products=products, ops=ops, vals=vals, editable=True, why="", filled=set(),
                           all_ops=all_ops, deadline="", mode="koreksi")


@app.route("/koreksi")
@login_required("leader", "engineer", "spv", "admin")
def koreksi_list():
    rows = g.con.execute("""SELECT k.*, s.tanggal, s.shift, st.nama station, u.nama peminta, v.nama pemutus
        FROM koreksi_requests k JOIN submissions s ON s.id=k.submission_id JOIN stations st ON st.id=k.station_id
        JOIN users u ON u.id=k.diminta_oleh LEFT JOIN users v ON v.id=k.diputus_oleh
        ORDER BY CASE k.status WHEN 'pending' THEN 0 ELSE 1 END, k.id DESC LIMIT 100""").fetchall()
    names = {r["id"]: r["nama"] for r in g.con.execute("SELECT id,nama FROM operators")}
    return render_template("koreksi.html", rows=rows, parse=json.loads, names=names)


@app.route("/koreksi/<int:kid>/<aksi>", methods=["POST"])
@login_required("spv", "admin")
def koreksi_action(kid, aksi):
    k = g.con.execute("""SELECT k.*, s.tanggal, s.shift FROM koreksi_requests k
                         JOIN submissions s ON s.id=k.submission_id WHERE k.id=?""", (kid,)).fetchone() or abort(404)
    if k["status"] != "pending":
        flash("Request sudah diputuskan.", "error"); return redirect(url_for("koreksi_list"))
    catatan = request.form.get("catatan", "").strip()
    if aksi == "setujui":
        for c in json.loads(k["perubahan"]):
            key = (k["tanggal"], k["shift"], k["station_id"], c["op"], c["prod"])
            cur = g.con.execute("""SELECT qty_ok,qty_ng FROM production_log WHERE tanggal=? AND shift=? AND station_id=?
                                   AND operator_id=? AND produk=?""", key).fetchone()
            old = (cur["qty_ok"], cur["qty_ng"]) if cur else (0, 0)
            if c["new_ok"] == 0 and c["new_ng"] == 0:
                g.con.execute("""DELETE FROM production_log WHERE tanggal=? AND shift=? AND station_id=?
                                 AND operator_id=? AND produk=?""", key)
            else:
                g.con.execute("""INSERT INTO production_log(tanggal,shift,station_id,operator_id,produk,qty_ok,qty_ng,updated_by,updated_at)
                    VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(tanggal,shift,station_id,operator_id,produk)
                    DO UPDATE SET qty_ok=excluded.qty_ok, qty_ng=excluded.qty_ng,
                                  updated_by=excluded.updated_by, updated_at=excluded.updated_at""",
                              key + (c["new_ok"], c["new_ng"], g.user["id"], stamp()))
            db.audit(g.con, g.user["id"], "koreksi",
                     f"#{kid} {k['tanggal']} {k['shift']} st{k['station_id']} {c['op']} {c['prod']}: "
                     f"OK {old[0]}→{c['new_ok']}, NG {old[1]}→{c['new_ng']}")
        g.con.execute("UPDATE koreksi_requests SET status='approved', diputus_oleh=?, diputus_at=?, catatan_spv=? WHERE id=?",
                      (g.user["id"], stamp(), catatan, kid))
        flash("Koreksi disetujui dan diterapkan.", "ok")
    elif aksi == "tolak":
        g.con.execute("UPDATE koreksi_requests SET status='rejected', diputus_oleh=?, diputus_at=?, catatan_spv=? WHERE id=?",
                      (g.user["id"], stamp(), catatan, kid))
        db.audit(g.con, g.user["id"], "tolak_koreksi", f"#{kid}: {catatan}")
        flash("Request koreksi ditolak.", "ok")
    return redirect(url_for("koreksi_list"))


# ---------- master data ----------
@app.route("/master/operator")
@login_required("engineer", "admin", "spv", "leader")
def master_operator():
    rows = g.con.execute("""SELECT o.*, s.nama station, s.grup FROM operators o LEFT JOIN stations s ON s.id=o.station_id
                            ORDER BY o.nama""").fetchall()
    return render_template("master_operator.html", rows=rows, today=db.now().date())


@app.route("/master/operator/edit", methods=["GET", "POST"])
@login_required("engineer", "admin")
def master_operator_edit():
    oid = request.values.get("id")
    op = g.con.execute("SELECT * FROM operators WHERE id=?", (oid,)).fetchone() if oid else None
    stations = g.con.execute("SELECT * FROM stations ORDER BY urutan").fetchall()
    if request.method == "POST":
        f = request.form
        new_id, nama = f["id_baru"].strip(), f["nama"].strip()
        if not new_id or not nama:
            flash("ID dan nama wajib diisi.", "error")
        else:
            vals = (nama, f.get("line") or None, f.get("jabatan") or None, int(f["station_id"]) if f.get("station_id") else None,
                    f.get("tgl_masuk") or None, int(f["target"]) if f.get("target", "").isdigit() else None, f["status"])
            try:
                if op:
                    g.con.execute("""UPDATE operators SET nama=?,line=?,jabatan=?,station_id=?,tgl_masuk=?,target_per_hari=?,status=?
                                     WHERE id=?""", vals + (op["id"],))
                else:
                    g.con.execute("""INSERT INTO operators(nama,line,jabatan,station_id,tgl_masuk,target_per_hari,status,id)
                                     VALUES(?,?,?,?,?,?,?,?)""", vals + (new_id,))
                db.audit(g.con, g.user["id"], "master_operator", f"{new_id} {nama} disimpan")
                flash("Data operator tersimpan.", "ok")
                return redirect(url_for("master_operator"))
            except Exception as e:
                flash(f"Gagal menyimpan: ID atau nama sudah dipakai ({e.__class__.__name__}).", "error")
    return render_template("master_operator_edit.html", op=op, stations=stations)


@app.route("/master/station", methods=["GET", "POST"])
@login_required("engineer", "admin", "spv", "leader")
def master_station():
    if request.method == "POST":
        if g.user["role"] not in ("engineer", "admin"): abort(403)
        f = request.form
        if f.get("aksi") == "tambah" and f.get("nama", "").strip():
            mx = g.con.execute("SELECT COALESCE(MAX(urutan),0)+1 FROM stations").fetchone()[0]
            g.con.execute("INSERT INTO stations(nama,grup,sub_fase,urutan) VALUES(?,?,?,?)",
                          (f["nama"].strip(), f["grup"], f["sub_fase"].strip() or db.GRUP_LABEL[f["grup"]], mx))
        elif f.get("aksi") == "toggle":
            g.con.execute("UPDATE stations SET aktif=1-aktif WHERE id=?", (int(f["id"]),))
        elif f.get("aksi") == "urutan":
            for k, v in f.items():
                if k.startswith("u_") and v.strip().isdigit():
                    g.con.execute("UPDATE stations SET urutan=? WHERE id=?", (int(v), int(k[2:])))
        db.audit(g.con, g.user["id"], "master_station", f.get("aksi", ""))
        flash("Master station diperbarui.", "ok")
        return redirect(url_for("master_station"))
    rows = g.con.execute("""SELECT s.*, (SELECT COUNT(*) FROM operators o WHERE o.station_id=s.id) n_op
                            FROM stations s ORDER BY urutan""").fetchall()
    return render_template("master_station.html", rows=rows)


@app.route("/users", methods=["GET", "POST"])
@login_required("admin")
def users():
    if request.method == "POST":
        f = request.form
        try:
            if f["aksi"] == "tambah":
                grup = f.get("grup") if f["role"] == "asisten_leader" else None
                if f["role"] == "asisten_leader" and not grup: raise ValueError("Asisten Leader wajib punya grup")
                g.con.execute("INSERT INTO users(username,nama,role,grup,password_hash) VALUES(?,?,?,?,?)",
                              (f["username"].strip(), f["nama"].strip(), f["role"], grup, generate_password_hash(f["password"])))
            elif f["aksi"] == "reset":
                g.con.execute("UPDATE users SET password_hash=? WHERE id=?", (generate_password_hash(f["password"]), int(f["id"])))
            elif f["aksi"] == "toggle" and int(f["id"]) != g.user["id"]:
                g.con.execute("UPDATE users SET aktif=1-aktif WHERE id=?", (int(f["id"]),))
            db.audit(g.con, g.user["id"], "user", f"{f['aksi']} {f.get('username') or f.get('id')}")
            flash("User diperbarui.", "ok")
        except Exception as e:
            flash(f"Gagal: {e}", "error")
        return redirect(url_for("users"))
    return render_template("users.html", rows=g.con.execute("SELECT * FROM users ORDER BY role,username").fetchall())


@app.route("/audit")
@login_required("spv", "engineer", "admin")
def audit_view():
    rows = g.con.execute("""SELECT a.*, u.nama FROM audit_log a LEFT JOIN users u ON u.id=a.user_id
                            ORDER BY a.id DESC LIMIT 300""").fetchall()
    return render_template("audit.html", rows=rows)


@app.errorhandler(403)
def forbidden(e):
    return render_template("pesan.html", judul="Akses ditolak", pesan="Peran Anda tidak punya akses ke halaman ini."), 403


if __name__ == "__main__":
    db.init_db()
    port = int(os.environ.get("MES_PORT", 5000))
    print(f"MES berjalan. Buka http://<IP-PC-ini>:{port} dari PC lain di jaringan kantor.")
    try:
        from waitress import serve
        serve(app, host="0.0.0.0", port=port)
    except ImportError:
        app.run(host="0.0.0.0", port=port)

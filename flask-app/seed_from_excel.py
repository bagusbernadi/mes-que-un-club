"""Isi master data (station, produk, operator, user awal) dari file Excel OPERATOR DAILY OUTPUT.
Pemakaian:  python seed_from_excel.py "path/ke/file.xlsx"
Hanya master data yang diimpor; data output harian belum dimigrasi."""
import sys, openpyxl
from werkzeug.security import generate_password_hash
import db

STATIONS = [  # (nama, grup, sub_fase)
 ("表面处理 Surface Treatment","F1","Fase 1"),("耦合 Coupling","F1","Fase 1"),("二次曝光 UV Xposure ganda","F1","Fase 1"),
 ("核心测试 Core Test","F2","Encaps"),("封装 / 分纤 Encapsulasi / Penyeratan","F2","Encaps"),
 ("封装 / 铁壳 Encapsulasi / Plat Besi","F2","Encaps"),("封装 / 塑料壳 Encapsulasi / Plastik","F2","Encaps"),
 ("封装 / 橡胶帽 Encapsulasi / Support","F2","Encaps"),
 ("载线 Cable Cutting","F2","Connector"),("穿散件 Slide Part","F2","Connector"),("剥纤 Pengupas Serat","F2","Connector"),
 ("注胶 Injeksi Lem","F2","Connector"),("固化 Curing","F2","Connector"),("组装 Housing","F2","Connector"),
 ("研磨 Polishing","F2","Connector"),("端检 End Phase","F2","Connector"),("测试 Test","F2","Connector"),
 ("终检 Final End Phase","F2","Connector"),
 ("包装 / 银色标签 Packing / Data Entry","F2","Packing"),("包装 / 通道标签 Packing / Label Input","F2","Packing"),
 ("包装 / 银色标签 Packing / Label Silver","F2","Packing"),("包装 / 打印 Packing / Printing","F2","Packing"),
 ("包装 / 贴纸板 Packing / Ivory","F2","Packing"),("通红光 Laser Check","F2","Packing"),("包装 / 外纸箱 Packing / Outer","F2","Packing"),
 ("光纤准备 Persiapan serat optik","FA1","FA1"),("毛细管清洗 Pencucian Kapiler","FA1","FA1"),("组装 Assembly","FA1","FA1"),
 ("曝光 UV Xposure","FA1","FA1"),("研磨 Polishing FA1","FA1","FA1"),("测角度 Pengukuran sudut","FA1","FA1"),
 ("检验 Pemeriksaan visual","FA1","FA1"),("固化 Pengovenan","FA1","FA1"),
]
# nama station di sheet Excel -> nama master
ALIAS = {"PACKING/IVORY 包装/贴纸板":"包装 / 贴纸板 Packing / Ivory","光纤准备persiapan serat optik":"光纤准备 Persiapan serat optik",
 "组装asembly":"组装 Assembly","曝光 UV Xposure":"曝光 UV Xposure","研磨polishing":"研磨 Polishing FA1",
 "测角度pengukuran sudut":"测角度 Pengukuran sudut","检验 pemeriksaan visual":"检验 Pemeriksaan visual",
 "毛细管清洗pencucian kapiler":"毛细管清洗 Pencucian Kapiler","固化pengovenan":"固化 Pengovenan","曝光 Paparan":"曝光 UV Xposure",
 "检验 Pemeriksaan Visual":"检验 Pemeriksaan visual","组装 Assembly":"组装 Assembly","包装 / 贴纸板 Packing / Ivory":"包装 / 贴纸板 Packing / Ivory"}
SHEETS = ["Fase 1","Fase 2 - Encaps 封装","Fase 2 - Connector 连接器","Fase 2 - Packing包装","FA1"]
PRODUCTS = [("1*2",1,"FASE"),("1*2 SPL",2,"FASE"),("1*4",3,"FASE"),("1*4 SPL",4,"FASE"),("1*8",5,"FASE"),("FA1",6,"FA1")]
norm = lambda s: " ".join(str(s).replace("\n"," ").split())
clean_name = lambda s: str(s).split("\n")[0].replace("*","").strip()


def main(path):
    db.init_db()
    wb = openpyxl.load_workbook(path, data_only=True)
    with db.connect() as con:
        for i,(n,g,sf) in enumerate(STATIONS,1):
            con.execute("INSERT OR IGNORE INTO stations(nama,grup,sub_fase,urutan) VALUES(?,?,?,?)",(n,g,sf,i))
        con.executemany("INSERT OR IGNORE INTO products VALUES(?,?,?)",PRODUCTS)
        sid = {r["nama"]:r["id"] for r in con.execute("SELECT id,nama FROM stations")}
        resolve = lambda s: sid.get(ALIAS.get(norm(s), norm(s)))
        # station default = blok pertama tempat operator muncul di sheet Fase/FA1
        first = {}
        for sh in SHEETS:
            if sh not in wb.sheetnames: continue
            ws, cur = wb[sh], None
            for r in range(5, ws.max_row+1):
                a = ws.cell(r,1).value
                if a and resolve(a): cur = resolve(a)
                b = ws.cell(r,2).value
                if b and str(b).startswith("OPERATOR") and cur: first.setdefault(clean_name(b), cur)
        dbs = wb[[s for s in wb.sheetnames if "Database" in s][0]]
        n = 0
        for r in range(4, dbs.max_row+1):
            oid, nama = dbs.cell(r,2).value, dbs.cell(r,3).value
            if not oid or not nama: continue
            jab = norm(dbs.cell(r,5).value or "")
            st = first.get(nama) or resolve(jab)
            tgl = dbs.cell(r,6).value
            con.execute("""INSERT OR REPLACE INTO operators(id,nama,line,jabatan,station_id,tgl_masuk,target_per_hari,status)
                           VALUES(?,?,?,?,?,?,?,?)""",
                        (str(oid), nama, dbs.cell(r,4).value, jab, st,
                         tgl.date().isoformat() if hasattr(tgl,"date") else None,
                         dbs.cell(r,7).value, dbs.cell(r,8).value or "Aktif"))
            n += 1
        users = [("admin","Administrator","admin",None),("engineer","Process Engineer","engineer",None),
                 ("spv","Supervisor","spv",None),("leader","Leader","leader",None),
                 ("al_f1","Asisten Leader Fase 1","asisten_leader","F1"),
                 ("al_f2","Asisten Leader Fase 2","asisten_leader","F2"),
                 ("al_fa1","Asisten Leader FA1","asisten_leader","FA1")]
        for u,nm,role,g in users:
            con.execute("INSERT OR IGNORE INTO users(username,nama,role,grup,password_hash) VALUES(?,?,?,?,?)",
                        (u,nm,role,g,generate_password_hash("1234")))
    print(f"Station {len(STATIONS)}, produk {len(PRODUCTS)}, operator {n}, user awal {len(users)} (password: 1234)")


if __name__ == "__main__":
    main(sys.argv[1])

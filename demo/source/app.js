const USERS=[{u:'al_f1',nama:'Asisten Leader Fase 1',role:'asisten_leader',grup:'F1'},{u:'al_f2',nama:'Asisten Leader Fase 2',role:'asisten_leader',grup:'F2'},
{u:'al_fa1',nama:'Asisten Leader FA1',role:'asisten_leader',grup:'FA1'},{u:'leader',nama:'Leader',role:'leader'},{u:'spv',nama:'Supervisor',role:'spv'},
{u:'engineer',nama:'Process Engineer',role:'engineer'},{u:'admin',nama:'Administrator',role:'admin'}];
const GL={F1:'Fase 1',F2:'Fase 2',FA1:'FA1'},SL={none:'Belum input',draft:'Draft',submitted:'Menunggu verifikasi',rejected:'Ditolak',locked:'Terkunci'};
const P=['1*2','1*2 SPL','1*4','1*4 SPL','1*8','FA1'],PROD=P.slice(0,5);const prods=st=>st.grup==='FA1'?['FA1']:PROD;
const SHEETS=[{k:'F1',sub:'Fase 1',tab:'Fase 1',nm:'Fase 1 — 表面处理 / 耦合 / 二次曝光'},{k:'EN',sub:'Encaps',tab:'Fase 2 - Encaps 封装',nm:'Fase 2 — Enkapsulasi 封装'},
{k:'CN',sub:'Connector',tab:'Fase 2 - Connector 连接器',nm:'Fase 2 — Connector 连接器'},{k:'PK',sub:'Packing',tab:'Fase 2 - Packing 包装',nm:'Fase 2 — Packing 包装'},{k:'FA',sub:'FA1',tab:'FA1',nm:'FA1 — 光纤准备 / 组装 / 曝光 / 研磨 / 测角度 / 检验'}];
const MON=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'],MCN=['一','二','三','四','五','六','七','八','九','十','十一','十二'];
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],MS=['jan','feb','mar','apr','mei','jun','jul','agu','sept','okt','nov','des'];
const stById=Object.fromEntries(M.st.map(s=>[s.id,s])),opById=Object.fromEntries(M.op.map(o=>[o.id,o]));
const prodOps=M.op.filter(o=>o.st&&!o.rs);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>(n||0).toLocaleString('en-US'),yl=(o,n)=>(o+n)?(100*o/(o+n)).toFixed(1)+'%':'–';
const pad=n=>String(n).padStart(2,'0'),dstr=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()),tstr=d=>dstr(d)+' '+pad(d.getHours())+':'+pad(d.getMinutes());
const K=(...a)=>a.join('|');
let S,V={view:'status'},flash=[];

function seed(){const s={now:'2026-11-15T09:00',user:'al_f2',subs:[],logs:{},kor:[],audit:[],nid:1};
 const add=(tgl,sh,st,status,ot,at,nop)=>{if(!s.subs.find(x=>x.tgl===tgl&&x.sh===sh&&x.st===st))s.subs.push({id:s.nid++,tgl,sh,st,grup:stById[st].grup,ot:ot?1:0,status,auto:0,cat:'',nop:nop?1:0,sub_at:at||'',lock_at:status==='locked'?at:''})};
 const dg=new Set();M.sep.forEach(([md,st,op,pi,ok,ng])=>{const tgl='2026-'+md;s.logs[K(tgl,'Pagi',st,op,P[pi])]=[ok,ng];add(tgl,'Pagi',st,'locked',0,tgl+' 17:30');dg.add(tgl+'|'+stById[st].grup)});
 dg.forEach(x=>{const[t,g]=x.split('|');M.st.filter(st=>st.grup===g).forEach(st=>add(t,'Pagi',st.id,'locked',0,t+' 17:30',1))});
 const copy=(from,to,sh,grups,status,fillNop)=>{const sts=new Set();for(const[k,v]of Object.entries(s.logs)){const[t,,st,op,p]=k.split('|');if(t===from&&grups.includes(stById[st].grup)){s.logs[K(to,sh,st,op,p)]=[...v];sts.add(+st)}}
  sts.forEach(st=>add(to,sh,st,status,sh==='Malam'?1:0,status==='locked'?to+' 17:40':'2026-11-15 07:50'));
  if(fillNop)M.st.filter(st=>grups.includes(st.grup)&&!sts.has(st.id)).forEach(st=>add(to,sh,st.id,status,0,to+' 17:40',1))};
 copy('2026-09-29','2026-11-14','Pagi',['F1','F2'],'locked',true);copy('2026-09-30','2026-11-14','Malam',['F1','F2'],'submitted',false);
 s.audit.push({w:'2026-11-14 17:40',u:'Leader',a:'verifikasi',d:'2026-11-14 Pagi semua station Fase 1 & Fase 2 disetujui & dikunci'},{w:'2026-10-01 08:00',u:'Sistem',a:'import',d:'Data harian September 2026 diimpor dari Excel Operator Daily Output (sebagai shift Pagi)'});return s}
function load(){try{const x=localStorage.getItem('mesdemo3');if(x)return JSON.parse(x)}catch(e){}return seed()}
function save(){try{localStorage.setItem('mesdemo3',JSON.stringify(S))}catch(e){}}
const now=()=>new Date(S.now),me=()=>USERS.find(u=>u.u===S.user);
const can=(...r)=>me().role==='admin'||r.includes(me().role);
const grups=()=>me().role==='asisten_leader'?[me().grup]:['F1','F2','FA1'];
function deadline(tgl,sh,ot){const d=new Date(tgl+'T00:00');d.setHours((sh==='Pagi'?(ot?20:17):(ot?32:29))+2);return d}
const getSub=(t,s,st)=>S.subs.find(x=>x.tgl===t&&x.sh===s&&x.st===st);
const stOf=g=>M.st.filter(s=>s.grup===g);
function grpStat(t,sh,g){const sts=stOf(g);const c={locked:0,submitted:0,draft:0,missing:0,total:sts.length,list:[]};sts.forEach(st=>{const x=getSub(t,sh,st.id);c.list.push([st,x]);if(!x)c.missing++;else if(x.status==='locked')c.locked++;else if(x.status==='submitted')c.submitted++;else c.draft++});
 c.status=c.missing===c.total?'none':c.submitted?'submitted':c.locked===c.total?'locked':'draft';c.done=c.locked+c.submitted;return c}
const GSL={none:'Belum input',submitted:'Menunggu verifikasi',locked:'Semua terkunci',draft:'Sebagian masuk'};
const pillG=c=>`<span class="pill p-${c.status}">${GSL[c.status]}</span>`;
function audit(a,d){S.audit.unshift({w:tstr(now()),u:me().nama,a,d})}
function autoLock(){S.subs.forEach(x=>{if(x.status!=='locked'&&now()>=deadline(x.tgl,x.sh,x.ot)){x.status='locked';x.auto=1;x.lock_at=tstr(now());
 S.audit.unshift({w:tstr(now()),u:'Sistem',a:'auto_lock',d:`${x.tgl} ${x.sh} ${stById[x.st].nama} terkunci otomatis (belum diverifikasi)`})}})}
function editable(sub,tgl,sh,ot){if(tgl>dstr(now()))return[false,'Tanggal belum berjalan.'];
 if(sub&&(sub.status==='submitted'||sub.status==='locked'))return[false,'Shift ini berstatus '+SL[sub.status].toLowerCase()+'.'];
 if(now()>=deadline(tgl,sh,sub?sub.ot:ot))return[false,'Sudah lewat batas kunci. Perubahan hanya lewat request koreksi.'];return[true,'']}
function sums(t,s,g,stId){let o=0,n=0;for(const[k,v]of Object.entries(S.logs)){const[a,b,c]=k.split('|');if(a===t&&b===s&&(stId?+c===stId:stById[+c].grup===g)){o+=v[0];n+=v[1]}}return[o,n]}
const pillS=s=>`<span class="pill p-${s?s.status:'none'}">${SL[s?s.status:'none']}${s&&s.auto?' · otomatis':''}</span>`;
function go(v){V=v;render();document.getElementById('content').scrollTop=0}
function msg(c,t){flash.push([c,t])}

function menu(){const pend=S.kor.filter(k=>k.status==='pending').length,subm=S.subs.filter(s=>s.status==='submitted'&&grups().includes(s.grup)).length;
 const it=[['Operasional'],['status','Status shift']];if(can('asisten_leader','leader'))it.push(['input','Input output']);
 if(can('leader','spv','engineer')){it.push(['verif','Verifikasi',subm],['kor','Koreksi',can('spv')?pend:0])}
 it.push(['Report'],['report','Report harian (Default)'],['report2','Report harian (New)'],['yield','Yield output'],['trend','Grafik trend'],['oky','OK Yield Report'],['rwk','Rework Product']);if(can('leader','spv','engineer'))it.push(['perf','Performa karyawan'],['rekap','Rekap karyawan']);
 if(can('leader','spv','engineer')){it.push(['Data'],['op','Master operator'])}if(can('spv','engineer'))it.push(['audit','Audit log']);
 document.getElementById('menu').innerHTML=it.map(x=>x.length===1?`<div class=grp>${x[0]}</div>`:`<a data-go="${x[0]}" class="${V.view===x[0]?'on':''}">${x[1]}${x[2]?`<span class=cnt>${x[2]}</span>`:''}</a>`).join('')}

const CAL='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>';
const dateBox=(key,id,val)=>`<div class=datebox><input type=date id=${id} data-key="${key}" value="${val}"><button type=button class=calbtn data-cal="${key}" title="Buka kalender" aria-label="Buka kalender">${CAL}</button><div id=calpop class=calpop hidden></div></div>`;
/* ---------- status ---------- */
function vStatus(){const days=[...Array(7)].map((_,i)=>{const d=now();d.setDate(d.getDate()-i);return dstr(d)});const gs=grups();
 let h=`<div class=ph><div><h1>Status shift</h1><p>7 hari terakhir · batas kunci = selesai shift + 2 jam</p></div></div>
 <div class=hint><b>Coba alurnya:</b> (1) Asisten Leader Fase 2 isi & submit station satu per satu untuk shift Pagi 15-Nov (station tanpa produksi: tombol \"Tidak ada produksi\") · (2) Leader → Verifikasi → setujui per station atau sekaligus · (3) station terkunci → Request koreksi · (4) SPV → Koreksi → setujui · (5) tekan +1 jam: station Malam 14-Nov terkunci otomatis, station yang tidak diinput tampil merah · (6) buka Report harian untuk melihat data September dalam format Excel.</div>
 <div class=card><table class="mt board"><tr><th>Tanggal</th>${['Pagi','Malam'].map(sh=>gs.map(g=>`<th>${sh} · ${GL[g]}</th>`).join('')).join('')}</tr>`;
 days.forEach(d=>{h+=`<tr><td><b style="font-weight:500">${d}</b></td>`;['Pagi','Malam'].forEach(sh=>gs.forEach(g=>{const c=grpStat(d,sh,g);const[o,n]=sums(d,sh,g);const late=c.missing&&c.missing<c.total||c.missing&&now()>=deadline(d,sh,0);
  h+=`<td class=cell data-grp="${d}|${sh}|${g}" style="cursor:pointer">${pillG(c)}<span class=sub>${c.done}/${c.total} station masuk${c.submitted?` · ${c.submitted} menunggu`:''}</span>${late?`<span class=sub style="color:#b91c1c">${c.missing} station belum input</span>`:''}${o+n?`<span class=sub>OK ${fmt(o)} · Yield ${yl(o,n)}</span>`:''}</td>`}));h+='</tr>'});
 return h+`</table></div><p class=muted style="margin-top:10px">Pagi selesai 17:00 (overtime 20:00) · Malam selesai 05:00 (overtime 08:00) keesokan hari.</p>`}

/* ---------- input (modern) ---------- */
function gridOps(t,sh,st,extra,onlyFilled){const ids=new Set(onlyFilled?[]:prodOps.filter(o=>o.st===st.id).map(o=>o.id));
 for(const k of Object.keys(S.logs)){const[a,b,c,op]=k.split('|');if(a===t&&b===sh&&+c===st.id)ids.add(op)}(extra||[]).forEach(i=>ids.add(i));
 return[...ids].map(i=>opById[i]).filter(Boolean).sort((a,b)=>a.nama.localeCompare(b.nama))}
function inpTable(t,sh,st,ops,edit){const ps=prods(st);
 let h=`<div class=card style="overflow:auto"><table class=inp><thead><tr><th class=l>Operator</th>${ps.map(p=>`<th class="${p==='1*2 SPL'?'spl':''}">${p}<span class=s>OK · NG</span></th>`).join('')}<th>Total</th></tr></thead><tbody id=gb>`;
 ops.forEach(o=>{h+=`<tr data-op="${o.id}"><td class=op><b>${esc(o.nama)}</b><span>${o.id}</span></td>`;
  ps.forEach(p=>{const v=S.logs[K(t,sh,st.id,o.id,p)];const sp=p==='1*2 SPL'?' class=spl':'';h+=edit?`<td${sp}><span class=pair><input data-k="${o.id}|${p}|0" value="${v?v[0]:''}" placeholder="OK" inputmode=numeric><input class=ng data-k="${o.id}|${p}|1" value="${v?v[1]:''}" placeholder="NG" inputmode=numeric></span></td>`
   :`<td class="ro ${sp?'spl':''}">${v?fmt(v[0]):'<span class=muted>–</span>'}${v&&v[1]?`<i>${v[1]}</i>`:''}</td>`});h+=`<td class=tot></td></tr>`});
 if(!ops.length)h+=`<tr><td colspan=${ps.length+2} class=muted style="padding:20px">Belum ada operator. Tambahkan di bawah.</td></tr>`;
 return h+`</tbody><tfoot><tr><td class=op>Total</td>${ps.map((p,i)=>`<td id="ft${i}" class="${p==='1*2 SPL'?'spl':''}"></td>`).join('')}<td id=ftt></td></tr></tfoot></table></div>`}
function addOp(){return `<div class=toolbar style="margin-top:12px"><select id=addop style="min-width:260px"><option value="">Tambah operator lain…</option>${prodOps.map(o=>`<option value="${o.id}">${esc(o.nama)} · ${esc(stById[o.st].nama)}</option>`).join('')}</select><button class=btn data-act=addop>Tambah</button></div>`}
function vInput(){const gs=grups(),sts=M.st.filter(s=>gs.includes(s.grup));
 V.tgl=V.tgl||dstr(now());V.sh=V.sh||(now().getHours()>=8&&now().getHours()<20?'Pagi':'Malam');V.st=V.st&&sts.some(s=>s.id===V.st)?V.st:sts[0].id;
 const st=stById[V.st],sub=getSub(V.tgl,V.sh,st.id),[ed,why]=editable(sub,V.tgl,V.sh,0);
 const stS=id=>{const x=getSub(V.tgl,V.sh,id);return !x?'':x.status==='submitted'||x.status==='locked'?'done':'dr'};
 let h=`<div class=ph><div><h1>Input output per station</h1><p>${esc(me().nama)} · ${esc(st.nama)} · batas kunci station ini ${tstr(deadline(V.tgl,V.sh,sub?sub.ot:0))}</p></div>${sub&&sub.nop?'<span class="pill p-locked">Tidak ada produksi</span> ':''}${pillS(sub)}</div>
 <div class=toolbar>${dateBox("tgl","itgl",V.tgl)}<span class=seg>${['Pagi','Malam'].map(s=>`<button data-sh="${s}" class="${s===V.sh?'on':''}">${s}</button>`).join('')}</span></div>
 <div class=stgroups>${gs.map(g=>{const subs=[...new Set(sts.filter(s=>s.grup===g).map(s=>s.sub_fase))];const all=sts.filter(s=>s.grup===g),dn=all.filter(s=>stS(s.id)==='done').length;
  V.open=V.open||{};if(V.open[g]===undefined)V.open[g]=(st.grup===g);const op=V.open[g];
  return `<div class="stg g-${g} ${st.grup===g?'cur':''} ${op?'open':''}"><button type=button class=stgh data-tog="${g}" aria-expanded="${op}"><svg class=chev width=16 height=16 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=2.2><path d="M6 9l6 6 6-6"/></svg>${GL[g]}
  <span class=prog><i style="width:${all.length?100*dn/all.length:0}%"></i></span><span class=cnt2>${dn}/${all.length} sudah submit</span>${all.length-dn?`<span class=left>${all.length-dn} belum</span>`:'<span class=okall>✓ lengkap</span>'}</button>`+
  (op?subs.map(sf=>`<div class=stsub>${subs.length>1?`<span class=sfl>${sf}</span>`:''}<div class=chips>${sts.filter(s=>s.grup===g&&s.sub_fase===sf).map(s=>{const k=stS(s.id);return `<span data-st="${s.id}" class="chip ${s.id===V.st?'on':''} ${k}">${k==='done'?'<b class=ck>✓</b>':k==='dr'?'<b class=dt>●</b>':''}${esc(s.nama)}</span>`}).join('')}</div></div>`).join(''):'')+'</div>'}).join('')}</div>
 <div class=legend2><span><b class=ck>✓</b> Sudah submit</span><span><b class=dt>●</b> Draft / ditolak</span><span><i class=sq></i> Belum diinput</span></div>`;
 if(sub&&sub.status==='rejected'&&sub.cat)h+=`<div class=flash style="background:#fef2f2;color:#991b1b"><b>Ditolak Leader:</b> ${esc(sub.cat)}</div>`;
 if(!ed)h+=`<div class=hint>${why} ${can('leader','engineer')&&now()>=deadline(V.tgl,V.sh,sub?sub.ot:0)||(sub&&sub.status==='locked'&&can('leader','engineer'))?`<button class="btn sm" data-act=tokor>Buat request koreksi</button>`:''}</div>`;
 h+=inpTable(V.tgl,V.sh,st,gridOps(V.tgl,V.sh,st,V.extra),ed);
 if(ed)h+=addOp()+`<div class=actions><div class=sum>OK <b id=sok>0</b> NG <b id=sng>0</b> Yield <b id=syl>–</b></div><span style="flex:1"></span>
 <label class=toggle><input type=checkbox id=ot ${sub&&sub.ot?'checked':''}>Overtime station ini</label><button class=btn data-act=draft>Simpan draft</button><button class="btn dng" data-act=nop>Tidak ada produksi</button><button class="btn pri" data-act=submit>Submit station</button></div>
 <p class=muted>Setiap station di-submit sendiri, termasuk status overtime-nya. Station yang tidak berproduksi pada shift ini ditandai "Tidak ada produksi" agar tidak terhitung lupa input. Enter = turun ke operator berikutnya.</p>`;
 return h}
function readGrid(){const out={},err=[];document.querySelectorAll('#gb input').forEach(i=>{i.classList.remove('err');const[op,p,x]=i.dataset.k.split('|');const raw=i.value.trim().replace(/[,.\s]/g,'');
 if(raw==='')return;if(!/^\d+$/.test(raw)||+raw>100000){i.classList.add('err');err.push(`${opById[op].nama} ${p} ${x==='0'?'OK':'NG'}: "${i.value}" bukan angka`);return}(out[op+'|'+p]=out[op+'|'+p]||[0,0])[+x]=+raw});return[out,err]}
function saveInput(submit,nop){const st=stById[V.st];let sub=getSub(V.tgl,V.sh,st.id);const ot=document.getElementById('ot').checked?1:0;
 if(!editable(sub,V.tgl,V.sh,ot)[0]){msg('error','Tidak bisa disimpan: lewat batas kunci atau status berubah.');return render()}
 let data={};if(!nop){const[d,err]=readGrid();if(err.length){err.slice(0,5).forEach(e=>msg('error',e));return renderKeep()}data=d;
  if(submit&&!Object.keys(data).length){msg('error','Belum ada angka yang diisi. Jika station ini tidak berproduksi, pakai tombol "Tidak ada produksi".');return renderKeep()}}
 if(!sub){sub={id:S.nid++,tgl:V.tgl,sh:V.sh,st:st.id,grup:st.grup,ot,status:'draft',auto:0,cat:'',nop:0};S.subs.push(sub)}else{sub.ot=ot;sub.status='draft'}
 sub.nop=nop?1:0;const pre=K(V.tgl,V.sh,st.id)+'|';Object.keys(S.logs).filter(k=>k.startsWith(pre)).forEach(k=>delete S.logs[k]);for(const[k,v]of Object.entries(data))S.logs[pre+k]=v;V.extra=[];
 if(submit){sub.status='submitted';sub.sub_at=tstr(now());sub.cat='';audit('submit',`${V.tgl} ${V.sh} ${st.nama}${nop?' (tidak ada produksi)':''}${ot?' · overtime':''}`);
  msg('ok',`${st.nama} ${nop?'ditandai tidak ada produksi':'di-submit'} dan menunggu verifikasi Leader.`);
  const nxt=stOf(st.grup).filter(x=>grups().includes(x.grup)).find(x=>!getSub(V.tgl,V.sh,x.id));if(nxt){V.st=nxt.id;V.open=V.open||{};V.open[nxt.grup]=true;msg('ok',`Lanjut ke station berikutnya yang belum diinput: ${nxt.nama}.`)}else msg('ok',`Semua station ${GL[st.grup]} shift ini sudah masuk.`)}
 else msg('ok',`Draft ${st.nama} tersimpan (${Object.keys(data).length} baris).`);render()}

/* ---------- verifikasi / shift / koreksi ---------- */
function vVerif(){const keys=new Map();S.subs.forEach(x=>keys.set(x.tgl+'|'+x.sh+'|'+x.grup,1));const gs=grups();
 const rows=[...keys.keys()].map(k=>{const[t,sh,g]=k.split('|');return{t,sh,g,c:grpStat(t,sh,g)}}).filter(r=>gs.includes(r.g))
  .sort((a,b)=>(b.c.submitted>0)-(a.c.submitted>0)||b.t.localeCompare(a.t)||a.sh.localeCompare(b.sh)).slice(0,80);
 return `<div class=ph><div><h1>Verifikasi</h1><p>Verifikasi dilakukan per station · shift yang punya station menunggu verifikasi tampil paling atas</p></div></div><div class=card><table class=mt><tr><th>Tanggal</th><th>Shift</th><th>Fase</th><th>Status</th><th style="text-align:right">Station masuk</th><th style="text-align:right">Menunggu</th><th style="text-align:right">Belum input</th><th style="text-align:right">OK</th><th style="text-align:right">Yield</th></tr>`+
 rows.map(r=>{const[a,b]=sums(r.t,r.sh,r.g);return`<tr class=click data-grp="${r.t}|${r.sh}|${r.g}"><td>${r.t}</td><td>${r.sh}</td><td>${GL[r.g]}</td><td>${pillG(r.c)}</td><td class=n>${r.c.done}/${r.c.total}</td><td class=n>${r.c.submitted||''}</td><td class=n style="color:#b91c1c">${r.c.missing||''}</td><td class=n>${fmt(a)}</td><td class=n>${yl(a,b)}</td></tr>`}).join('')+'</table></div>'}
function vGroup(){const t=V.gt,sh=V.gs,g=V.gg;const c=grpStat(t,sh,g);let T=[0,0],ops=new Set(),rows='';const ver=can('leader','spv'),kor=can('leader','engineer');
 c.list.forEach(([st,x])=>{const ks=Object.keys(S.logs).filter(k=>k.startsWith(K(t,sh,st.id)+'|'));const[o,n]=sums(t,sh,null,st.id);T[0]+=o;T[1]+=n;const no=new Set(ks.map(k=>k.split('|')[3]));no.forEach(y=>ops.add(y));
  const stat=!x?`<span class="pill p-rejected">Belum input</span>`:(x.nop?'<span class="pill p-none">Tidak produksi</span> ':'')+pillS(x);
  let act=ks.length?`<button class="btn sm" data-view="${st.id}">Detail</button> `:'';
  if(x&&x.status==='submitted'&&ver)act+=`<button class="btn sm pri" data-okst="${st.id}">Setujui</button> <button class="btn sm dng" data-nost="${st.id}">Tolak</button>`;
  if((x&&x.status==='locked'||!x&&now()>=deadline(t,sh,1))&&kor)act+=`<button class="btn sm" data-kor="${st.id}">Request koreksi</button>`;
  rows+=`<tr style="${!x?'background:#fef2f2':''}"><td class=muted>${st.sub_fase}</td><td>${esc(st.nama)}</td><td>${stat}</td><td>${x&&x.ot?'Ya':''}</td><td class=muted>${x&&x.sub_at||''}</td><td class=n>${no.size||''}</td><td class=n>${o+n?fmt(o):''}</td><td class=n>${o+n?fmt(n):''}</td><td class=n>${o+n?yl(o,n):''}</td><td style="text-align:right;white-space:nowrap">${act}</td></tr>`});
 return `<div class=ph><div><h1>${t} · Shift ${sh} · ${GL[g]}</h1><p>${c.done}/${c.total} station masuk · ${c.submitted} menunggu verifikasi · ${c.missing} belum input</p></div>${pillG(c)}</div>
 <div class=kpis><div class=kpi><div>Total OK</div><b>${fmt(T[0])}</b></div><div class=kpi><div>Total NG</div><b>${fmt(T[1])}</b></div><div class=kpi><div>Yield</div><b>${yl(T[0],T[1])}</b></div><div class=kpi><div>Operator</div><b>${ops.size}</b></div></div>
 ${c.submitted&&ver?`<div class=toolbar><button class="btn pri" data-act=approveall>Setujui semua yang menunggu (${c.submitted})</button><input type=text id=rej placeholder="Alasan penolakan (wajib untuk tombol Tolak)" style="width:340px"></div>`:''}
 <div class=card><table class=mt><tr><th>Sub fase</th><th>Station</th><th>Status</th><th>OT</th><th>Submit</th><th style="text-align:right">Operator</th><th style="text-align:right">OK</th><th style="text-align:right">NG</th><th style="text-align:right">Yield</th><th></th></tr>${rows}</table></div>
 <p class=muted>Baris merah = station belum diinput untuk shift ini. Setelah batas kunci, station tersebut hanya bisa diisi lewat Request koreksi.</p>`}
function vStation(){const st=stById[V.st];return `<div class=ph><div><h1>${esc(st.nama)}</h1><p>${V.gt} · Shift ${V.gs} · angka merah = NG</p></div><button class=btn data-grp="${V.gt}|${V.gs}|${V.gg}">Kembali</button></div>`+inpTable(V.gt,V.gs,st,gridOps(V.gt,V.gs,st,[],true),false)}
function vKorForm(){const st=stById[V.st];return `<div class=ph><div><h1>Request koreksi</h1><p>${esc(st.nama)} · ${V.tgl} · Shift ${V.sh}</p></div></div><div class=hint>Ubah angka yang salah lalu isi alasan. Perubahan berlaku setelah disetujui SPV dan tercatat di audit log.</div>`+
 inpTable(V.tgl,V.sh,st,gridOps(V.tgl,V.sh,st,V.extra),true)+addOp()+`<div class=actions><input type=text id=alasan placeholder="Alasan koreksi (wajib)" style="flex:1;max-width:420px"><button class="btn pri" data-act=sendkor>Kirim ke SPV</button></div>`}
function sendKor(){const st=stById[V.st];const[data,err]=readGrid();const al=document.getElementById('alasan').value.trim();if(!al)err.push('Alasan koreksi wajib diisi.');
 const pre=K(V.tgl,V.sh,st.id)+'|';const keys=new Set([...Object.keys(data),...Object.keys(S.logs).filter(k=>k.startsWith(pre)).map(k=>k.slice(pre.length))]);const ch=[];
 keys.forEach(k=>{const o=S.logs[pre+k]||[0,0],n=data[k]||[0,0];if(o[0]!==n[0]||o[1]!==n[1]){const[op,p]=k.split('|');ch.push({op,p,o,n})}});
 if(!err.length&&!ch.length)err.push('Tidak ada angka yang berubah.');if(err.length){err.forEach(e=>msg('error',e));return renderKeep()}
 if(!getSub(V.tgl,V.sh,st.id))S.subs.push({id:S.nid++,tgl:V.tgl,sh:V.sh,st:st.id,grup:st.grup,ot:0,status:'locked',auto:1,cat:'',nop:0});
 S.kor.unshift({id:S.nid++,tgl:V.tgl,sh:V.sh,st:st.id,al,ch,status:'pending',by:me().nama,at:tstr(now())});audit('request_koreksi',`${V.tgl} ${V.sh} ${st.nama}: ${ch.length} perubahan`);
 msg('ok',`Request koreksi (${ch.length} perubahan) dikirim ke SPV.`);go({view:'kor'})}
function vKor(){const KS={pending:['submitted','Menunggu SPV'],approved:['locked','Disetujui'],rejected:['rejected','Ditolak']};
 return `<div class=ph><div><h1>Koreksi data terkunci</h1><p>Dibuat dari halaman shift terkunci · hanya SPV/Admin yang menyetujui</p></div></div>`+(S.kor.length?S.kor.map(k=>`<div class=card style="padding:16px 18px;margin-bottom:12px">
 <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b style="font-weight:600">#${k.id} · ${esc(stById[k.st].nama)}</b><div class=muted>${k.tgl} · ${k.sh} · diminta ${esc(k.by)} ${k.at}${k.dec?' · diputus '+esc(k.dec):''}</div></div><span class="pill p-${KS[k.status][0]}">${KS[k.status][1]}</span></div>
 <p style="margin:10px 0">Alasan: ${esc(k.al)}</p><table class=mt><tr><th>Operator</th><th>Produk</th><th style="text-align:right">OK</th><th style="text-align:right">NG</th></tr>`+
 k.ch.map(c=>`<tr><td>${esc(opById[c.op].nama)}</td><td>${c.p}</td><td class=n>${c.o[0]} → <b>${c.n[0]}</b></td><td class=n>${c.o[1]} → <b>${c.n[1]}</b></td></tr>`).join('')+'</table>'+
 (k.status==='pending'?(can('spv')?`<div style="display:flex;gap:8px;margin-top:12px"><button class="btn pri" data-kok="${k.id}">Setujui &amp; terapkan</button><button class="btn dng" data-kno="${k.id}">Tolak</button></div>`:'<p class=muted>Menunggu keputusan SPV.</p>'):'')+'</div>').join(''):'<p class=muted>Belum ada request koreksi.</p>')}

/* ---------- Excel-style monthly report ---------- */
function months(){const m=new Set(Object.keys(S.logs).map(k=>k.slice(0,7)));m.add(dstr(now()).slice(0,7));return[...m].sort().reverse()}
function vReport(opt){opt=opt||{};const hideMK=!!opt.simple;const ms=months();V.m=V.m||(ms.includes('2026-09')?'2026-09':ms[0]);const allowed=SHEETS.filter(sh=>me().role!=='asisten_leader'||(me().grup==='FA1'?sh.k==='FA':me().grup==='F1'?sh.k==='F1':['EN','CN','PK'].includes(sh.k)));
 const sh=allowed.find(x=>x.k===V.sk)||allowed[0];V.sk=sh.k;const[y,mo]=V.m.split('-').map(Number);const nd=new Date(y,mo,0).getDate();const end=new Date(y,mo-1,nd);
 const agg={};for(const[k,v]of Object.entries(S.logs)){if(!k.startsWith(V.m))continue;const[t,,st,op,p]=k.split('|');if(stById[st].sub_fase!==sh.sub)continue;const d=+t.slice(8);
  ((((agg[st]=agg[st]||{})[op]=agg[st][op]||{})[p]=agg[st][op][p]||{})[d]=agg[st][op][p][d]||[0,0]);const c=agg[st][op][p][d];c[0]+=v[0];c[1]+=v[1]}
 const days=[...Array(nd)].map((_,i)=>{const dt=new Date(y,mo-1,i+1);return{d:i+1,we:dt.getDay()===0||dt.getDay()===6,lb:pad(i+1)+'-'+MS[mo-1]+'<br>'+DOW[dt.getDay()]}});
 const ncol=(hideMK?6:8)+nd*2+2;const masa=o=>o.tgl?Math.floor((Math.min(end,now())-new Date(o.tgl))/864e5):'';
 let h=`<div class=ph><div><h1>Report harian operator</h1><p>Format sama dengan file Excel Operator Daily Output · gabungan shift Pagi + Malam</p></div><div class=toolbar style="margin:0"><select id=rmon>${ms.map(m=>`<option value="${m}" ${m===V.m?'selected':''}>${MON[+m.slice(5)-1]} ${m.slice(0,4)}</option>`).join('')}</select></div></div>
 <div class=xlt>${MON[mo-1]} ${y} — OPERATOR DAILY OUTPUT &nbsp;/&nbsp; ${sh.nm} &nbsp;/&nbsp; ${MCN[mo-1]}月 操作员每日产量</div>
 <div class=xll>&nbsp; Legend / 说明: &nbsp;🟩 1*2 SPL = Highlight Hijau &nbsp;│&nbsp; OK = Produksi OK &nbsp;│&nbsp; NG = Reject &nbsp;│&nbsp; Abu-abu = Weekend &nbsp;│&nbsp; Daily Avrg = Total OK ÷ Hari Kerja</div>
 <div class=xlwrap><table class=xl><thead><tr class=h1><th rowspan=2>Station<br>工站</th><th rowspan=2>Name<br>姓名</th><th rowspan=2>ID<br>工号</th>${hideMK?'':'<th rowspan=2>Masa Kerja<br>工作时间</th><th rowspan=2>Start Date<br>开工日期</th>'}<th rowspan=2>Target<br>目标数</th><th rowspan=2>Daily Avrg<br>平均</th><th rowspan=2>Type<br>分类</th>
 ${days.map(x=>`<th colspan=2 class="day ${x.we?'we':''}">${x.lb}</th>`).join('')}<th class=sumh>Monthly<br>OK Total</th><th class=days>Days<br>Worked</th></tr>
 <tr class=h2>${days.map(()=>'<th class=ok>OK</th><th class=ng>NG</th>').join('')}<th class=sumh>∑OK</th><th class=days>Days</th></tr></thead><tbody>`;
 M.st.filter(s=>s.sub_fase===sh.sub).forEach(st=>{const ids=new Set([...prodOps.filter(o=>o.st===st.id).map(o=>o.id),...Object.keys(agg[st.id]||{})]);
  const ops=[...ids].map(i=>opById[i]).sort((a,b)=>a.nama.localeCompare(b.nama));if(!ops.length)return;const ps=prods(st);const dt=days.map(()=>[0,0]);let tgSum=0;
  ops.forEach((o,oi)=>{tgSum+=o.tg||0;ps.forEach((p,pi)=>{const rec=((agg[st.id]||{})[o.id]||{})[p]||{};let so=0,dw=0;
   h+=`<tr class="${pi===0?'bk':''} ${p==='1*2 SPL'?'spl':''}">`;
   if(oi===0&&pi===0)h+=`<td class=stn rowspan=${ops.length*ps.length}>${esc(st.nama)}</td>`;
   if(pi===0)h+=`<td class=nm rowspan=${ps.length}>${esc(o.nama)}</td><td rowspan=${ps.length}>${o.id}</td>${hideMK?'':`<td rowspan=${ps.length}>${masa(o)}</td><td rowspan=${ps.length}>${o.tgl?o.tgl.split('-').reverse().join('/'):''}</td>`}<td class=tg rowspan=${ps.length}>${o.tg||''}</td>`;
   let cells='';days.forEach((x,i)=>{const c=rec[x.d];if(c){so+=c[0];if(c[0]>0)dw++;dt[i][0]+=c[0];dt[i][1]+=c[1]}cells+=`<td class="v ${x.we?'we':''}">${c&&c[0]?c[0]:''}</td><td class="vn ${x.we?'we':''}">${c&&c[1]?c[1]:''}</td>`});
   h+=`<td class=avg>${dw?Math.round(so/dw*10)/10:''}</td><td class=ty>${p}</td>${cells}<td class=s>${so}</td><td class=d>${dw}</td></tr>`})});
  const pl=tgSum;const lab=(c,t)=>`<tr class=${c}><td colspan=${hideMK?6:8} class=lbl>&nbsp;&nbsp; ${t}</td>`;
  h+=lab('t1','Total daily OK and NG Product &nbsp;/&nbsp; 每日OK &amp; NG合计')+dt.map(x=>`<td>${x[0]||''}</td><td>${x[1]||''}</td>`).join('')+`<td>${fmt(dt.reduce((a,x)=>a+x[0],0))}</td><td></td></tr>`;
  h+=lab('t2','Actual Daily Production Capacity &nbsp;/&nbsp; 每日实际产能')+dt.map(x=>`<td colspan=2>${x[0]+x[1]||''}</td>`).join('')+'<td></td><td></td></tr>';
  h+=lab('t3','Daily Planned Production Capacity &nbsp;/&nbsp; 每日计划产能')+days.map(()=>`<td colspan=2>${pl||''}</td>`).join('')+'<td></td><td></td></tr>';
  h+=lab('t4','Actual and Planned Differences &nbsp;/&nbsp; 实际与计划差异')+dt.map(x=>{const a=x[0]+x[1];return`<td colspan=2 style="${a&&a-pl<0?'color:#C00000':''}">${a?a-pl:''}</td>`}).join('')+'<td></td><td></td></tr><tr class=gap><td colspan='+ncol+'></td></tr>'});
 return h+`</tbody></table></div><div class=tabs>${allowed.map(x=>`<a data-sk="${x.k}" class="${x.k===sh.k?'on':''}">${x.tab}</a>`).join('')}</div>
 <p class=muted>Daily Planned Capacity = jumlah target operator di station · Days Worked = jumlah hari dengan OK &gt; 0 pada baris tersebut · data September diimpor dari Excel sebagai shift Pagi.</p>`}

function vReport2(){const ms=months();V.m=V.m||(ms.includes('2026-09')?'2026-09':ms[0]);const gs=grups();const sts=M.st.filter(s=>gs.includes(s.grup));
 const has=new Set(Object.keys(S.logs).filter(k=>k.startsWith(V.m)).map(k=>+k.split('|')[2]));
 if(!sts.some(s=>s.id===V.rst))V.rst=(sts.find(s=>has.has(s.id))||sts[0]).id;const selSt=stById[V.rst];V.ropen=V.ropen||{};if(V.ropen[selSt.grup]===undefined)V.ropen[selSt.grup]=true;
 const sh=SHEETS.find(x=>x.sub===selSt.sub_fase);const[y,mo]=V.m.split('-').map(Number);const nd=new Date(y,mo,0).getDate();if(V.hide0===undefined)V.hide0=true;
 const agg={};for(const[k,v]of Object.entries(S.logs)){if(!k.startsWith(V.m))continue;const[t,,st,op,p]=k.split('|');if(+st!==selSt.id)continue;const d=+t.slice(8);
  const c=((((agg[st]=agg[st]||{})[op]=agg[st][op]||{})[p]=agg[st][op][p]||{})[d]=agg[st][op][p][d]||[0,0]);c[0]+=v[0];c[1]+=v[1]}
 const days=[...Array(nd)].map((_,i)=>{const dt=new Date(y,mo-1,i+1);return{d:i+1,we:dt.getDay()===0||dt.getDay()===6,dw:['Min','Sen','Sel','Rab','Kam','Jum','Sab'][dt.getDay()]}});
 const cell=(c,we)=>`<td class="${we?'we':''}">${c&&(c[0]||c[1])?`<span class=okc>${fmt(c[0]||0)}</span>${c[1]?`<span class=ngc>${c[1]}</span>`:''}`:''}</td>`;
 const NC=4+nd+2;
 let h=`<div class=ph><div><h1>Report harian operator</h1><p>${MON[mo-1]} ${y} · ${GL[selSt.grup]} · ${selSt.sub_fase} · <b style="color:#1F3864">${esc(selSt.nama)}</b> · gabungan shift Pagi + Malam</p></div><div class=toolbar style="margin:0">
 <label class=toggle><input type=checkbox id=hide0 ${V.hide0?'checked':''}>Sembunyikan baris produk kosong</label>
 <select id=rmon>${ms.map(m=>`<option value="${m}" ${m===V.m?'selected':''}>${MON[+m.slice(5)-1]} ${m.slice(0,4)}</option>`).join('')}</select></div></div>
 <div class=stgroups>${gs.map(g=>{const all=sts.filter(s=>s.grup===g),subs=[...new Set(all.map(s=>s.sub_fase))],op=V.ropen[g],nd=all.filter(s=>has.has(s.id)).length;
  return `<div class="stg g-${g} ${selSt.grup===g?'cur':''} ${op?'open':''}"><button type=button class=stgh data-rtog="${g}" aria-expanded="${!!op}"><svg class=chev width=16 height=16 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=2.2><path d="M6 9l6 6 6-6"/></svg>${GL[g]}<span class=cnt2>${nd}/${all.length} station ada data bulan ini</span>${selSt.grup===g?`<span class=okall style="background:#e0e7ff;color:#1F3864">${esc(selSt.nama)}</span>`:''}</button>`+
  (op?subs.map(sf=>`<div class=stsub>${subs.length>1?`<span class=sfl>${sf}</span>`:''}<div class=chips>${all.filter(s=>s.sub_fase===sf).map(s=>`<span data-rst="${s.id}" class="chip ${s.id===selSt.id?'on':''} ${has.has(s.id)?'':'nodata'}">${esc(s.nama)}</span>`).join('')}</div></div>`).join(''):'')+'</div>'}).join('')}</div>
 <div class=sxlegend><span><span class=okc>120</span> OK</span><span><span class=ngc>3</span> NG</span><span class=wk>Akhir pekan</span><span>Produk: ${PROD.map(p=>`<span class="pb p${PROD.indexOf(p)}">${p}</span>`).join(' ')}</span><span><b class=lg-tg>Target</b> pcs/hari</span><span><b class=lg-av>Avg</b> = OK ÷ hari kerja</span><span><b class=lg-sum>∑OK</b> / <b style="color:#B91C1C">∑NG</b> total bulan</span></div>
 <div class=sxwrap><table class=sx><thead><tr><th class=c1>Operator</th><th class=c2>Tipe</th><th>Target</th><th>Avg</th>${days.map(x=>`<th class="${x.we?'we':''}">${x.d}<small>${x.dw}</small></th>`).join('')}<th class=tsum>∑OK</th><th class="tsum ng">∑NG</th></tr></thead><tbody>`;
 [selSt].forEach(st=>{const ids=new Set([...prodOps.filter(o=>o.st===st.id).map(o=>o.id),...Object.keys(agg[st.id]||{})]);
  const ops=[...ids].map(i=>opById[i]).sort((a,b)=>a.nama.localeCompare(b.nama));if(!ops.length)return;const ps=prods(st);const dt=days.map(()=>[0,0]);let tg=0,sOK=0;
  ops.forEach(o=>tg+=o.tg||0);
  h+=`<tr class="stn g-${st.grup}"><td colspan=${NC}><div class=sk><span>${esc(st.nama)}</span><small>${ops.length} operator · rencana kapasitas ${fmt(tg)} pcs/hari</small></div></td></tr>`;
  ops.forEach((o,oi)=>{const rec=(agg[st.id]||{})[o.id]||{};const zb=oi%2?' zb':'';let pr=ps.filter(p=>!V.hide0||Object.keys(rec[p]||{}).length);const empty=!pr.length;if(empty)pr=[null];
   pr.forEach((p,pi)=>{let so=0,dw=0,sn=0;const r=p?rec[p]||{}:{};let cells='';days.forEach((x,i)=>{const c=r[x.d];if(c){so+=c[0];sn+=c[1];if(c[0]>0)dw++;dt[i][0]+=c[0];dt[i][1]+=c[1]}cells+=cell(c,x.we)});sOK+=so;
    h+=`<tr class="${pi===0?'op1':''}${zb}">${pi===0?`<td class=c1 rowspan=${pr.length}><b>${esc(o.nama)}</b><small>${o.id}</small></td>`:''}<td class=c2>${p?`<span class="pb p${P.indexOf(p)}">${p}</span>`:'<span class=muted>tidak ada output</span>'}</td>
    ${pi===0?`<td rowspan=${pr.length} class=tg>${o.tg||'–'}</td>`:''}<td class=avg>${dw?Math.round(so/dw*10)/10:''}</td>${cells}<td class=tsum><b>${so?fmt(so):''}</b></td><td class="tsum ng">${sn?fmt(sn):''}</td></tr>`})});
  const lab=(c,t)=>`<tr class="${c}"><td class=c1 colspan=2>${t}</td><td></td><td></td>`;
  h+=lab('t1','Total OK · NG')+dt.map((x,i)=>cell(x[0]||x[1]?x:null,days[i].we)).join('')+`<td class=tsum><b>${fmt(sOK)}</b></td><td class="tsum ng">${fmt(dt.reduce((a,x)=>a+x[1],0))}</td></tr>`;
  h+=lab('t2','Aktual (OK + NG)')+dt.map((x,i)=>`<td class="${days[i].we?'we':''}">${x[0]+x[1]?fmt(x[0]+x[1]):''}</td>`).join('')+'<td class=tsum></td><td class=tsum></td></tr>';
  h+=lab('t3',`Selisih vs rencana (${fmt(tg)})`)+dt.map((x,i)=>{const a=x[0]+x[1],d=a-tg;return`<td class="${days[i].we?'we':''} ${a&&d<0?'neg':a?'pos':''}">${a?(d>0?'+':'')+fmt(d):''}</td>`}).join('')+'<td class=tsum></td><td class=tsum></td></tr>'});
 return h+`</tbody></table></div><p class=muted>Menampilkan satu station terpilih. Isi: OK dan NG per tanggal, target, rata-rata (OK ÷ hari kerja), ∑OK, ∑NG, total harian, kapasitas aktual, rencana, dan selisih. Rencana kapasitas ditulis sekali di judul station karena nilainya sama setiap hari.</p>`}
/* ---------- analisis: helper ---------- */
const SUBS=['Fase 1','Encaps','Connector','Packing','FA1'];const SERIES=['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4'];
function monday(d){const x=new Date(d);const k=(x.getDay()+6)%7;x.setDate(x.getDate()-k);return x}
function rangeOf(p,anchor){const a=new Date(anchor+'T00:00');if(p==='H')return[anchor,anchor];if(p==='M'){const m=monday(a),e=new Date(m);e.setDate(e.getDate()+6);return[dstr(m),dstr(e)]}
 return[dstr(new Date(a.getFullYear(),a.getMonth(),1)),dstr(new Date(a.getFullYear(),a.getMonth()+1,0))]}
function rows(from,to,gs){const out=[];for(const[k,v]of Object.entries(S.logs)){const[t,sh,st,op,p]=k.split('|');if(t<from||t>to)continue;const s=stById[+st];if(gs&&!gs.includes(s.grup))continue;out.push({t,sh,st:s,op,p,ok:v[0],ng:v[1]})}return out}
const agg=(rs,keyf)=>{const m=new Map();rs.forEach(r=>{const k=keyf(r);const a=m.get(k)||{ok:0,ng:0,ops:new Set(),days:new Set()};a.ok+=r.ok;a.ng+=r.ng;a.ops.add(r.op);if(r.ok>0)a.days.add(r.t);m.set(k,a)});return m};
const yv=(a)=>a&&(a.ok+a.ng)?a.ok/(a.ok+a.ng):null;const pct=v=>v==null?'–':(100*v).toFixed(2)+'%';
const lastDataDate=()=>Object.keys(S.logs).map(k=>k.slice(0,10)).filter(t=>t<=dstr(now())).sort().pop()||dstr(now());
function xlHead(title,sub){return `<div class=xlt>${title}</div><div class=xll>&nbsp; ${sub}</div>`}
let charts=[];function killCharts(){charts.forEach(c=>c.destroy());charts=[]}
const dotLabels={id:'dotLabels',afterDatasetsDraw(ch){const c=ch.ctx,drawn=[];c.save();c.font='600 10px Inter,Arial,sans-serif';c.textAlign='center';c.textBaseline='bottom';c.lineJoin='round';
 const nvis=ch.data.datasets.filter((d,k)=>ch.isDatasetVisible(k)).length;ch.data.datasets.forEach((ds,di)=>{const meta=ch.getDatasetMeta(di);if(meta.type!=='line'||!ch.isDatasetVisible(di)||!ds.pointRadius)return;if(ds.soloLabel&&nvis>2)return;if(ds.noDotLabel)return;const f=ds.labelFmt||(v=>fmt(v));
  meta.data.forEach((pt,i)=>{const v=ds.data[i];if(v==null)return;const t=f(v),w=c.measureText(t).width+4,x=pt.x,y=pt.y-6,box=[x-w/2,y-12,x+w/2,y];
   if(drawn.some(b=>!(box[2]<b[0]||box[0]>b[2]||box[3]<b[1]||box[1]>b[3])))return;drawn.push(box);
   c.strokeStyle='#fff';c.lineWidth=3;c.strokeText(t,x,y);c.fillStyle=ds.labelColor||'#0b0b0b';c.fillText(t,x,y)})});c.restore()}};
function mkChart(id,cfg){const el=document.getElementById(id);if(!el||typeof Chart==='undefined')return;Chart.defaults.font.family='Inter,system-ui,Arial,sans-serif';Chart.defaults.color='#52514e';
 cfg.plugins=[...(cfg.plugins||[]),dotLabels];cfg.options=cfg.options||{};cfg.options.layout={padding:{top:8}};const y=cfg.options.scales&&cfg.options.scales.y;if(y&&cfg.data.datasets.some(d=>(d.type||cfg.type)==='line'&&d.pointRadius))y.grace='10%';charts.push(new Chart(el,cfg))}
const gridOpt={grid:{color:'#eef0f3'},border:{display:false}};

/* ---------- Yield (modern) ---------- */
function vYield(){V.yp=V.yp||'B';V.yd=V.yd||(Object.keys(S.logs).some(k=>k.startsWith('2026-09'))?'2026-09-30':lastDataDate());const[from,to]=rangeOf(V.yp,V.yd);const gs=grups();const rs=rows(from,to,gs);
 const bySt=agg(rs,r=>r.st.id),bySub=agg(rs,r=>r.st.sub_fase),byP=agg(rs,r=>r.p),bySh=agg(rs,r=>r.sh),tot=agg(rs,()=>1).get(1);
 const chain=SUBS.slice(1,4).filter(sf=>bySub.get(sf));const rty=chain.length?chain.reduce((a,sf)=>a*yv(bySub.get(sf)),1):null;const f1=bySub.get('Fase 1'),y1=yv(f1),yFA=yv(bySub.get('FA1'));const lines=[['F1',y1],['F2',rty],['FA1',yFA]].filter(x=>x[1]!=null);const wl=lines.length>1?lines.slice().sort((a,b)=>a[1]-b[1])[0][0]:null;const wtag=k=>'';
 const lbl={H:'Harian',M:'Mingguan',B:'Bulanan'}[V.yp];const per=V.yp==='H'?from:`${from} s/d ${to}`;
 const yc=v=>v==null?'#94a3b8':v>=.995?'#16a34a':v>=.98?'#f59e0b':'#ef4444';
 let h=`<div class=ph><div><h1>Yield output</h1><p>Yield = OK ÷ (OK + NG) · ${lbl} · ${per}</p></div></div>
 <div class=filters><span class=seg>${['H','M','B'].map(p=>`<button data-yp="${p}" class="${p===V.yp?'on':''}">${{H:'Harian',M:'Mingguan',B:'Bulanan'}[p]}</button>`).join('')}</span>${dateBox('yd','yd',V.yd)}<select id=yf><option value=all ${V.yf!=='lt'?'selected':''}>Seluruh station</option><option value=lt ${V.yf==='lt'?'selected':''}>Station dengan yield &lt; 100%</option></select></div>
 <div class="kpis k5"><div class=kpi><div>Yield keseluruhan</div><b style="color:${yc(yv(tot))}">${pct(yv(tot))}</b><div>OK ${fmt(tot?tot.ok:0)} · <span style="color:#B91C1C">NG ${fmt(tot?tot.ng:0)}</span></div></div>
 <div class="kpi ${wl==='F1'?'worst':''}"><div>Yield Fase 1 ${wtag('F1')}</div><b style="color:${yc(y1)}">${pct(y1)}</b><div>${f1?`OK ${fmt(f1.ok)} · <span style="color:#B91C1C">NG ${fmt(f1.ng)}</span>`:'–'}</div></div>
 <div class="kpi ${wl==='F2'?'worst':''}"><div>Yield Fase 2 ${wtag('F2')}</div><b style="color:${yc(rty)}">${pct(rty)}</b><div>${chain.length?(()=>{const o=chain.reduce((a,sf)=>a+bySub.get(sf).ok,0),n=chain.reduce((a,sf)=>a+bySub.get(sf).ng,0);return`OK ${fmt(o)} · <span style="color:#B91C1C">NG ${fmt(n)}</span>`})():'–'}</div></div>
 <div class="kpi ${wl==='FA1'?'worst':''}"><div>Yield FA1 ${wtag('FA1')}</div><b style="color:${yc(yFA)}">${pct(yFA)}</b><div>${bySub.get('FA1')?`OK ${fmt(bySub.get('FA1').ok)} · <span style="color:#B91C1C">NG ${fmt(bySub.get('FA1').ng)}</span>`:'–'}</div></div>
 <div class=kpi><div>Total NG</div><b style="color:#B91C1C">${fmt(tot?tot.ng:0)}</b><div>dari ${fmt(tot?tot.ok+tot.ng:0)} input</div></div></div>`;
 if(!rs.length)return h+'<div class=hint>Belum ada data pada periode ini. Coba pilih tanggal di September 2026.</div>';
 const worst=null;
 const sts=M.st.filter(s=>bySt.get(s.id)).map(s=>({s,a:bySt.get(s.id),y:yv(bySt.get(s.id))})).sort((a,b)=>a.y-b.y).filter(x=>V.yf!=='lt'||x.y<1);
 h+=`<div class=card style="overflow:auto;margin-bottom:16px"><div class=cardh><b>Yield per station${V.yf==='lt'?` · yield &lt; 100% (${sts.length} station)`:''}</b><span class=muted>diurutkan dari yield terendah · ● hijau ≥ 99,5% · kuning 98–99,5% · merah &lt; 98%</span></div><table class="mt mt2"><thead><tr><th>Station</th><th class=n>Operator</th><th class=n>OK</th><th class=n>NG</th><th style="min-width:200px">Yield</th></tr></thead><tbody>`+
 sts.map(x=>`<tr><td><b class=nm>${esc(x.s.nama)}</b></td><td class=n>${x.a.ops.size}</td><td class=n>${fmt(x.a.ok)}</td><td class=n style="color:#B91C1C">${fmt(x.a.ng)}</td><td><div class=valbar><span class=dotc style="background:${yc(x.y)}"></span><b>${pct(x.y)}</b>${mbar(Math.max(0,x.y*100-90),10,yc(x.y))}</div></td></tr>`).join('')+'</tbody></table></div>';
 const small=(title,keys,m)=>`<div class=card style="overflow:auto"><div class=cardh><b>${title}</b></div><table class="mt mt2"><thead><tr><th></th><th class=n>OK</th><th class=n>NG</th><th>Yield</th></tr></thead><tbody>`+
  keys.filter(k=>m.get(k)).map(k=>{const a=m.get(k),y=yv(a);return`<tr><td>${P.includes(k)?`<span class="pb p${P.indexOf(k)}">${k}</span>`:`<b class=nm>${k}</b>`}</td><td class=n>${fmt(a.ok)}</td><td class=n style="color:#B91C1C">${fmt(a.ng)}</td><td><div class=valbar><span class=dotc style="background:${yc(y)}"></span><b>${pct(y)}</b></div></td></tr>`}).join('')+'</tbody></table></div>';
 return h+`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">${small('Yield per produk',P,byP)}${small('Yield per shift',['Pagi','Malam'],bySh)}</div>
 <p class=muted>Data September diimpor sebagai shift Pagi, jadi perbandingan shift baru bermakna untuk data baru.</p>`}

/* ---------- Grafik trend (modern) ---------- */
function vTrend(){V.tm=V.tm||defMonth();V.tg=V.tg||'all';V.tgr=V.tgr||'H';const[y,mo]=V.tm.split('-').map(Number);
 const from=V.tm+'-01',to=dstr(new Date(y,mo,0));const allowed=grups();const gsel=V.tg==='all'?allowed:[V.tg].filter(g=>allowed.includes(g));const rs=rows(from,to,gsel);
 const keyf=r=>V.tgr==='H'?r.t:dstr(monday(new Date(r.t+'T00:00')));const labels=[...new Set(rs.map(keyf))].sort();
 const fmtL=k=>V.tgr==='H'?k.slice(8)+'/'+k.slice(5,7):'Mg '+k.slice(8)+'/'+k.slice(5,7);
 const byK=agg(rs,keyf);const subs=SUBS.filter(sf=>rs.some(r=>r.st.sub_fase===sf));const bySK=agg(rs,r=>keyf(r)+'|'+r.st.sub_fase);
 const tgt=prodOps.filter(o=>gsel.includes(stById[o.st].grup)).reduce((a,o)=>a+(o.tg||0),0)*(V.tgr==='H'?1:5);
 V._chart={labels:labels.map(fmtL),ok:labels.map(k=>byK.get(k).ok),tgt:labels.map(()=>tgt),subs,yl:subs.map(sf=>labels.map(k=>{const v=yv(bySK.get(k+'|'+sf));return v==null?null:+(100*v).toFixed(2)}))};
 let h=`<div class=ph><div><h1>Grafik trend</h1><p>Output OK dan yield per ${V.tgr==='H'?'hari':'minggu'} · ${MON[mo-1]} ${y}</p></div></div>
 <div class=filters>${monSel('tm',V.tm)}<select id=tg>${allowed.length>1?`<option value=all>Semua fase</option>`:''}${allowed.map(g=>`<option value="${g}" ${g===V.tg?'selected':''}>${GL[g]}</option>`).join('')}</select>
 <span class=seg>${['H','M'].map(p=>`<button data-tgr="${p}" class="${p===V.tgr?'on':''}">${p==='H'?'Harian':'Mingguan'}</button>`).join('')}</span></div>`;
 if(!rs.length)return h+'<div class=hint>Belum ada data pada bulan ini. Pilih September 2026.</div>';
 {const ok=V._chart.ok,t=tgt,avg=ok.reduce((a,b)=>a+b,0)/ok.length,hit=ok.filter(v=>v>=t).length,mid=ok.filter(v=>v<t&&v>=.8*t).length,lo=ok.length-hit-mid,bi=ok.indexOf(Math.max(...ok)),wi=ok.indexOf(Math.min(...ok));const L=V._chart.labels;const u=V.tgr==='H'?'hari':'minggu';
 h+=`<div class="kpis k5"><div class=kpi><div>Rata-rata output / ${u}</div><b>${fmt(Math.round(avg))}</b><div>${t?Math.round(100*avg/t):'–'}% dari rencana ${fmt(t)}</div></div><div class=kpi><div>Capai rencana</div><b style="color:#166534">${hit} ${u}</b></div><div class=kpi><div>Hampir (80–99%)</div><b style="color:#92400e">${mid} ${u}</b></div><div class=kpi><div>Di bawah 80%</div><b style="color:#B91C1C">${lo} ${u}</b></div>
 <div class=kpi><div>Tertinggi / terendah</div><b style="font-size:16px">${fmt(ok[bi])} / ${fmt(ok[wi])}</b><div>${L[bi]} / ${L[wi]}</div></div></div>
 <div class=card style="padding:16px 18px;margin-bottom:16px"><b style="font-weight:600">Output OK vs rencana kapasitas</b>
 <div class=legend3><span><i style="background:#16a34a"></i>✓ ≥ 100% rencana</span><span><i style="background:#f59e0b"></i>• 80–99%</span><span><i style="background:#ef4444"></i>▼ &lt; 80%</span><span><i class=ln></i>Rencana</span><span class=muted>garis biru = output OK · warna titik = capaian · angka di atas titik = % capaian</span></div>
 <div style="height:300px;margin-top:6px"><canvas id=c1></canvas></div></div>`}
 h+=`<div class=card style="padding:16px 18px;margin-bottom:16px"><b style="font-weight:600">Yield per tahap proses</b><div class=muted>Satu grafik per tahap dengan skala yang sama · nilai tertulis di setiap titik</div>
 <div class=smgrid style="grid-template-columns:1fr">${subs.map((sf,i)=>{const v=V._chart.yl[i].filter(x=>x!=null);const av=v.length?v.reduce((a,b)=>a+b,0)/v.length:null;return`<div class=sm><div class=smh><span><i style="background:${SERIES[SUBS.indexOf(sf)]}"></i>${sf}</span><b>${av==null?'–':av.toFixed(2)+'%'} <small class=muted style="font-weight:400">· target ${YTGT[sf]}%</small></b></div><div style="height:300px"><canvas id="cy${i}"></canvas></div></div>`}).join('')}</div></div>`;
 return h}
const YTGT={'Fase 1':99.5,'Encaps':99.5,'Connector':99.5,'Packing':99.5,'FA1':99.5};
function drawTrend(){const c=V._chart;if(!c)return;
 const T=c.tgt[0]||0,col=v=>!T?SERIES[0]:v>=T?'#16a34a':v>=.8*T?'#f59e0b':'#ef4444';
 mkChart('c1',{type:'line',data:{labels:c.labels,datasets:[{label:'Output OK',data:c.ok,borderColor:'#2a78d6',borderWidth:2,pointRadius:5,pointHoverRadius:7,pointBackgroundColor:c.ok.map(col),pointBorderColor:'#fff',pointBorderWidth:2,noDotLabel:true,tension:0}]},
  options:{maintainAspectRatio:false,layout:{padding:{top:18}},plugins:{legend:{display:false},tooltip:{callbacks:{label:t=>'Output OK: '+fmt(t.raw)+(T?' ('+Math.round(100*t.raw/T)+'% rencana)':'')}}},scales:{x:{grid:{display:false},border:{display:false}},y:{...gridOpt,beginAtZero:true,suggestedMax:T*1.15,ticks:{callback:v=>fmt(v)}}}},
  plugins:[{id:'tgt',afterDatasetsDraw(ch){if(!T)return;const x=ch.ctx,{left,right}=ch.chartArea,y=ch.scales.y.getPixelForValue(T);x.save();x.strokeStyle='#52514e';x.lineWidth=2;x.setLineDash([6,4]);x.beginPath();x.moveTo(left,y);x.lineTo(right,y);x.stroke();x.setLineDash([]);
   const m=ch.getDatasetMeta(0);x.textAlign='center';x.textBaseline='bottom';x.font='600 10px Inter,Arial';m.data.forEach((b,i)=>{x.fillStyle='#0b0b0b';x.fillText(Math.round(100*c.ok[i]/T)+'%',b.x,b.y-8)});x.restore()}}]});
 const all=c.yl.flat().filter(v=>v!=null);const mn=Math.floor(Math.min(...all)*2)/2-0.2,mxv=100.2;
 c.subs.forEach((sf,i)=>{const YT=YTGT[sf];mkChart('cy'+i,{type:'line',data:{labels:c.labels,datasets:[{label:sf,data:c.yl[i],labelFmt:v=>v.toFixed(1),labelColor:'#3d3d3a',borderColor:SERIES[SUBS.indexOf(sf)],backgroundColor:SERIES[SUBS.indexOf(sf)],borderWidth:2,pointRadius:2.5,spanGaps:true}]},
  options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:t=>sf+': '+t.raw+'%'}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{maxRotation:0,font:{size:11}}},y:{...gridOpt,min:mn,max:mxv,ticks:{callback:v=>v+'%',maxTicksLimit:6,font:{size:11}}}}},
  plugins:[{id:'yt',afterDatasetsDraw(ch){if(YT==null)return;const x=ch.ctx,{left,right}=ch.chartArea,y=ch.scales.y.getPixelForValue(YT);x.save();x.strokeStyle='#52514e';x.lineWidth=1.5;x.setLineDash([6,4]);x.beginPath();x.moveTo(left,y);x.lineTo(right,y);x.stroke();x.setLineDash([]);x.fillStyle='#52514e';x.font='600 10px Inter,Arial';x.textAlign='right';x.textBaseline='top';x.strokeStyle='#fff';x.lineWidth=3;x.strokeText('Target '+YT+'%',right-2,y+3);x.fillText('Target '+YT+'%',right-2,y+3);x.restore()}}]})})}

/* ---------- Performa karyawan (modern) ---------- */
function vPerf(){V.pm=V.pm||defMonth();const[y,mo]=V.pm.split('-').map(Number);const from=V.pm+'-01',to=dstr(new Date(y,mo,0));const nd=new Date(y,mo,0).getDate();
 const rs=rows(from,to,grups());const bySt=agg(rs,r=>r.st.id);const sts=M.st.filter(s=>bySt.get(s.id));
 if(!sts.some(s=>s.id===+V.pst))V.pst=String((sts.slice().sort((a,b)=>bySt.get(b.id).ops.size-bySt.get(a.id).ops.size)[0]||M.st[0]).id);
 const st=stById[+V.pst];const rr=rs.filter(r=>r.st.id===st.id);const byOp=agg(rr,r=>r.op);V.psort=V.psort||'tot';
 let list=[...byOp.entries()].map(([op,a])=>{const o=opById[op],avg=a.days.size?a.ok/a.days.size:0;return{o,a,avg,cap:o.tg?avg/o.tg:null,yl:yv(a)}});
 list.sort(V.psort==='avg'?(a,b)=>b.avg-a.avg:(a,b)=>b.a.ok-a.a.ok);
 const totOK=list.reduce((a,x)=>a+x.a.ok,0),totNG=list.reduce((a,x)=>a+x.a.ng,0),mx=Math.max(1,...list.map(x=>x.a.ok)),ma=Math.max(1,...list.map(x=>x.avg));
 const opts=GL&&['F1','F2','FA1'].filter(g=>grups().includes(g)).map(g=>`<optgroup label="${GL[g]}">${sts.filter(s=>s.grup===g).map(s=>`<option value="${s.id}" ${s.id===st.id?'selected':''}>${s.sub_fase!==GL[g]&&g==='F2'?s.sub_fase+' · ':''}${esc(s.nama)}</option>`).join('')}</optgroup>`).join('');
 const days=[...Array(nd)].map((_,i)=>V.pm+'-'+pad(i+1)).filter(d=>rr.some(r=>r.t===d));const dayOK={};rr.forEach(r=>{const k=r.op+'|'+r.t;dayOK[k]=(dayOK[k]||0)+r.ok});
 V._perfsm={labels:days.map(d=>+d.slice(8)),ops:list.map(x=>({n:x.o.nama,tg:x.o.tg||null,d:days.map(d=>dayOK[x.o.id+'|'+d]||null)})),max:(()=>{const md=Math.max(1,...Object.values(dayOK));return Math.max(md,...list.map(x=>x.o.tg||0).filter(t=>t<=md*1.5))})()};
 const capB=c=>c==null?'<span class=muted>–</span>':`<span class="capb ${c>=1?'g':c>=.8?'y':'r'}">${c>=1?'✓':c>=.8?'•':'▼'} ${Math.round(c*100)}%</span>`;
 const best=list.slice().sort((a,b)=>b.a.ok-a.a.ok)[0],bestA=list.slice().sort((a,b)=>b.avg-a.avg)[0];
 let h=`<div class=ph><div><h1>Performa karyawan</h1><p>Siapa output terbanyak dan rata-rata tertinggi di tiap station · ${MON[mo-1]} ${y}</p></div></div>
 <div class=filters>${monSel('pm',V.pm)}<select id=pst style="min-width:280px">${opts}</select>
 <span class=seg><button data-psort=tot class="${V.psort==='tot'?'on':''}">Urut total OK</button><button data-psort=avg class="${V.psort==='avg'?'on':''}">Urut rata-rata/hari</button></span></div>`;
 if(!list.length)return h+'<div class=hint>Belum ada data untuk station ini pada bulan terpilih.</div>';
 h+=`<div class="kpis k5"><div class=kpi><div>Total OK station</div><b>${fmt(totOK)}</b><div><span style="color:#B91C1C">NG ${fmt(totNG)}</span> · yield ${pct(totOK+totNG?totOK/(totOK+totNG):null)}</div></div><div class=kpi><div>Jumlah operator</div><b>${list.length}</b></div>
 <div class=kpi><div>Output terbanyak</div><b style="font-size:16px">${esc(best.o.nama)}</b><div>${fmt(best.a.ok)} pcs</div></div><div class=kpi><div>Rata-rata tertinggi</div><b style="font-size:16px">${esc(bestA.o.nama)}</b><div>${fmt(Math.round(bestA.avg))} pcs/hari</div></div>
 <div class=kpi><div>Rata-rata station</div><b>${fmt(Math.round(list.reduce((a,x)=>a+x.avg,0)/list.length))}</b><div>pcs/hari per operator</div></div></div>
 <div class=card style="overflow:auto;margin-bottom:16px"><div class=cardh><b>Peringkat operator — ${esc(st.nama)}</b><span class=muted>capaian = rata-rata ÷ target harian · ✓ ≥ 100% · • 80–99% · ▼ &lt; 80%</span></div>
 <table class="mt mt2"><thead><tr><th style="width:44px">Rank</th><th>Operator</th><th style="min-width:170px">Total OK</th><th style="min-width:170px">Rata-rata / hari</th><th class=n>Hari kerja</th><th class=n>NG</th><th class=n>Yield</th><th class=n>Target</th><th>Capaian</th></tr></thead><tbody>`+
 list.map((x,i)=>`<tr><td><span class="rk ${i<3?'top':''}">${i+1}</span></td><td><b class=nm>${esc(x.o.nama)}</b><span class=sub2>${x.o.id}</span></td><td><div class=valbar><b>${fmt(x.a.ok)}</b>${mbar(x.a.ok,mx,'#16a34a')}</div></td><td><div class=valbar><b>${fmt(Math.round(x.avg))}</b>${mbar(x.avg,ma,'#2E75B6')}</div></td>
 <td class=n>${x.a.days.size}</td><td class=n style="color:#B91C1C">${x.a.ng?fmt(x.a.ng):'–'}</td><td class=n>${pct(x.yl)}</td><td class=n>${x.o.tg||'–'}</td><td>${capB(x.cap)}</td></tr>`).join('')+
 `</tbody></table></div><div class=card style="padding:16px 18px"><b style="font-weight:600">Trend harian per operator — ${esc(st.nama)}</b><div class=muted>Semua operator di station ini dalam satu grafik · output OK per hari</div>
 <div class=plhint>Klik nama operator di legenda untuk menyembunyikan/menampilkan garisnya · nilai di tiap titik muncul saat ≤ 2 operator ditampilkan · hari libur tidak ditampilkan dan garis tetap menyambung · garis abu-abu putus-putus = target station</div><div style="height:380px;margin-top:8px"><canvas id=cpall></canvas></div></div>`;return h}
const OPCOL=['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#7b5cd6','#14a3b8','#a0522d','#5d6b7d','#c2185b'];
function drawPerf(){const p=V._perfsm;if(!p)return;
 const tgs=p.ops.map(o=>o.tg).filter(t=>t&&t<=p.max*1.5).sort((a,b)=>a-b);const T=tgs.length?tgs[Math.floor(tgs.length/2)]:null;
 const ds=p.ops.map((o,i)=>({label:o.n,data:o.d,borderColor:OPCOL[i%10],backgroundColor:OPCOL[i%10],borderWidth:2,pointRadius:3,pointHoverRadius:6,spanGaps:true,borderDash:i>=10?[6,3]:[],soloLabel:true,labelColor:'#3d3d3a'}));
 mkChart('cpall',{type:'line',data:{labels:p.labels,datasets:ds},
  options:{maintainAspectRatio:false,interaction:{mode:'nearest',intersect:false},plugins:{legend:{position:'bottom',labels:{boxWidth:12,boxHeight:3,usePointStyle:false,font:{size:11}}},tooltip:{callbacks:{title:t=>'Tanggal '+t[0].label,label:t=>t.dataset.label+': '+fmt(t.raw)}}},
   scales:{x:{grid:{display:false},border:{display:false},title:{display:true,text:'Tanggal (hanya hari produksi)',font:{size:10},color:'#64748b'},ticks:{maxRotation:0,font:{size:10}}},y:{...gridOpt,beginAtZero:true,suggestedMax:T?T*1.1:undefined,ticks:{maxTicksLimit:6,font:{size:10},callback:v=>fmt(v)}}}},
  plugins:[{id:'t',afterDatasetsDraw(ch){if(!T)return;const x=ch.ctx,{left,right}=ch.chartArea,y=ch.scales.y.getPixelForValue(T);if(y<ch.chartArea.top)return;x.save();x.strokeStyle='#9ca3af';x.setLineDash([6,4]);x.lineWidth=1.5;x.beginPath();x.moveTo(left,y);x.lineTo(right,y);x.stroke();x.setLineDash([]);x.fillStyle='#52514e';x.font='600 10px Inter,Arial';x.textAlign='right';x.textBaseline='bottom';x.fillText('Target '+fmt(T),right,y-2);x.restore()}}]})}

/* ---------- OK Yield Report & Rework Product ---------- */
const friStart=t=>{const d=new Date(t+'T00:00');d.setDate(d.getDate()-((d.getDay()-5+7)%7));return dstr(d)};
const addD=(t,n)=>{const d=new Date(t+'T00:00');d.setDate(d.getDate()+n);return dstr(d)};
const wkLbl=w=>`${w.slice(8)}/${w.slice(5,7)} – ${addD(w,6).slice(8)}/${addD(w,6).slice(5,7)}`;
function weeksOf(m){const[y,mo]=m.split('-').map(Number);const a=m+'-01',b=dstr(new Date(y,mo,0));const out=[];for(let w=friStart(a);w<=b;w=addD(w,7))out.push(w);return out}
const OKY=[{id:'C',k:'Coupling',col:'#2a78d6',grup:'F1',nama:'耦合 Coupling'},{id:17,k:'IL Test',col:'#1baf7a',grup:'F2',nama:'测试 Test'}];
function vOky(){V.om=V.om||defMonth();const[y,mo]=V.om.split('-').map(Number);const wks=weeksOf(V.om);const from=wks[0],to=addD(wks[wks.length-1],6);
 const gs=grups();const rs=rows(from,to,gs).filter(r=>[2,3,17].includes(r.st.id)).map(r=>/ SPL$/.test(r.p)?{...r,p:r.p.replace(' SPL','')}:r).map(r=>r.st.id===17?{...r,sid:17}:r.st.id===2?{...r,sid:'C',ng:0}:{...r,sid:'C',ok:0});const by=agg(rs,r=>friStart(r.t)+'|'+r.sid),tot=agg(rs,r=>r.sid),byP=agg(rs,r=>friStart(r.t)+'|'+r.sid+'|'+r.p),totP=agg(rs,r=>r.sid+'|'+r.p);
 const vis=OKY.filter(o=>gs.includes(o.grup));
 const cell=a=>a&&a.ok+a.ng?`<td class=n>${a.ok?fmt(a.ok):'–'}</td><td class=n style="color:#B91C1C">${fmt(a.ng)}</td><td class=n><b>${a.ok?pct(yv(a)):'–'}</b></td>`:'<td class=n>–</td><td class=n>–</td><td class=n>–</td>';
 V._oky={labels:wks.map(wkLbl),sets:vis.map(o=>({k:o.k,col:o.col,d:wks.map(w=>{const a=by.get(w+'|'+o.id);return a&&a.ok+a.ng?+(100*yv(a)).toFixed(2):null})}))};
 let h=`<div class=ph><div><h1>OK Yield Report</h1><p>Mingguan (Jumat – Kamis) · ${MON[mo-1]} ${y} · periode ${from} s/d ${to}</p></div></div>
 <div class=filters>${monSel('om',V.om)}<span class=muted>Minggu dihitung Jumat s/d Kamis; minggu di awal/akhir bulan bisa memuat tanggal bulan lain.</span></div>`;
 if(!vis.length)return h+'<div class=hint>Peran ini tidak punya akses ke station Coupling, UV Exposure, atau IL Test.</div>';

 
 if(!rs.length)return h+'<div class=hint>Belum ada data pada periode ini. Pilih September 2026.</div>';
 
 h+=`<div class=card style="overflow:auto"><div class=cardh><b>Tabel mingguan</b><span class=muted>OK hijau · NG merah</span></div><table class="mt mt2"><thead><tr><th rowspan=2>Minggu (Jum–Kam)</th><th rowspan=2>Tipe produk</th>${vis.map(o=>`<th colspan=3 style="text-align:center;border-bottom:2px solid ${o.col}">${o.k}<div class=muted style="font-weight:400;text-transform:none">${esc(o.nama)}</div></th>`).join('')}</tr>
 <tr>${vis.map(()=>'<th class=n>OK</th><th class=n>NG</th><th class=n>Yield</th>').join('')}</tr></thead><tbody>`+
 wks.map((w,i)=>{const has=a=>a&&a.ok+a.ng>0;const ps=P.filter(p=>vis.some(o=>has(byP.get(w+'|'+o.id+'|'+p))));const lab=`<b class=nm>Mg ${i+1}</b><div class=muted style="font-size:11px">${wkLbl(w)}</div>`;
  if(!ps.length)return`<tr class=wk1><td>${lab}</td><td class=muted>–</td>${vis.map(()=>cell(null)).join('')}</tr>`;
  return ps.map((p,k)=>`<tr class="${k?'':'wk1'}">${k?'':`<td rowspan=${ps.length+1} style="vertical-align:top">${lab}</td>`}<td><span class="pb p${P.indexOf(p)}">${p}</span></td>${vis.map(o=>cell(byP.get(w+'|'+o.id+'|'+p))).join('')}</tr>`).join('')+
  `<tr style="background:#f8fafc;font-weight:600"><td class=muted>Subtotal</td>${vis.map(o=>cell(by.get(w+'|'+o.id)).replace(/<\/?b>/g,'')).join('')}</tr>`}).join('')+
 P.filter(p=>vis.some(o=>totP.get(o.id+'|'+p))).map((p,k,arr)=>`<tr class="${k?'':'wk1'}" style="background:#eef2f7">${k?'':`<td rowspan=${arr.length+1} style="vertical-align:top;font-weight:600">Total bulan</td>`}<td><span class="pb p${P.indexOf(p)}">${p}</span></td>${vis.map(o=>cell(totP.get(o.id+'|'+p))).join('')}</tr>`).join('')+
 `<tr style="background:#e2e8f0;font-weight:700"><td>Total</td>${vis.map(o=>cell(tot.get(o.id)).replace(/<\/?b>/g,'')).join('')}</tr></tbody></table></div>`;return h}
function drawOky(){const c=V._oky;if(!c)return;const all=c.sets.flatMap(s=>s.d).filter(v=>v!=null);if(!all.length)return;const mn=Math.max(0,Math.floor(Math.min(...all))-1);
 mkChart('coky',{type:'line',data:{labels:c.labels,datasets:c.sets.map(s=>({label:s.k,data:s.d,borderColor:s.col,backgroundColor:s.col,borderWidth:2,pointRadius:4,spanGaps:true,labelFmt:v=>v.toFixed(2)+'%',labelColor:'#3d3d3a'}))},
  options:{maintainAspectRatio:false,interaction:{mode:'nearest',intersect:false},plugins:{legend:{position:'bottom',labels:{boxWidth:12,boxHeight:3}},tooltip:{callbacks:{label:t=>t.dataset.label+': '+t.raw+'%'}}},scales:{x:{grid:{display:false},border:{display:false}},y:{...gridOpt,min:mn,max:100.5,ticks:{callback:v=>v+'%',maxTicksLimit:6}}}}})}

function vRwk(){V.wm=V.wm||defMonth();const[y,mo]=V.wm.split('-').map(Number);const wks=weeksOf(V.wm);V.ww=V.ww&&(V.ww==='all'||wks.includes(V.ww))?V.ww:'all';
 const from=V.ww==='all'?V.wm+'-01':V.ww,to=V.ww==='all'?dstr(new Date(y,mo,0)):addD(V.ww,6);const rs=rows(from,to,grups());const bySt=agg(rs,r=>r.st.id);
 const list=M.st.filter(s=>bySt.get(s.id)&&bySt.get(s.id).ng>0).map(s=>({s,a:bySt.get(s.id),y:yv(bySt.get(s.id))})).sort((a,b)=>b.a.ng-a.a.ng);
 const tNG=list.reduce((a,x)=>a+x.a.ng,0),tOK=list.reduce((a,x)=>a+x.a.ok,0),mx=Math.max(1,...list.map(x=>x.a.ng));const yc=v=>v>=.995?'#16a34a':v>=.98?'#f59e0b':'#ef4444';
 let h=`<div class=ph><div><h1>Rework Product</h1><p>Station yang menghasilkan NG · ${V.ww==='all'?MON[mo-1]+' '+y:'Minggu '+wkLbl(V.ww)} · periode ${from} s/d ${to}</p></div></div>
 <div class=filters>${monSel('wm',V.wm)}<select id=ww><option value=all>Satu bulan penuh</option>${wks.map((w,i)=>`<option value="${w}" ${w===V.ww?'selected':''}>Mg ${i+1} · ${wkLbl(w)} (Jum–Kam)</option>`).join('')}</select></div>`;
 if(!list.length)return h+'<div class=hint>Tidak ada NG pada periode ini.</div>';
 const top=list[0],worst=list.slice().sort((a,b)=>a.y-b.y)[0];
 h+=`<div class="kpis k5"><div class=kpi><div>Total NG</div><b style="color:#B91C1C">${fmt(tNG)}</b><div>dari ${list.length} station</div></div><div class=kpi><div>Total OK station ber-NG</div><b>${fmt(tOK)}</b><div>yield ${pct(yv({ok:tOK,ng:tNG}))}</div></div>
 <div class=kpi><div>NG terbanyak</div><b style="font-size:15px">${esc(top.s.nama)}</b><div>${fmt(top.a.ng)} pcs · ${Math.round(100*top.a.ng/tNG)}% dari total NG</div></div><div class=kpi><div>Yield terendah</div><b style="font-size:15px">${esc(worst.s.nama)}</b><div style="color:${yc(worst.y)}">${pct(worst.y)}</div></div>
 <div class=kpi><div>Station dengan NG</div><b>${list.length}</b><div>dari ${M.st.filter(s=>bySt.get(s.id)).length} station aktif</div></div></div>
 <div class=card style="overflow:auto"><div class=cardh><b>Qty OK, NG, dan yield per station</b><span class=muted>diurutkan dari NG terbanyak · porsi = NG station ÷ total NG</span></div><table class="mt mt2"><thead><tr><th style="width:40px">#</th><th>Station</th><th>Fase</th><th class=n>OK</th><th class=n>NG</th><th class=n>Yield</th><th style="min-width:220px">Porsi NG</th></tr></thead><tbody>`+
 list.map((x,i)=>`<tr><td><span class="rk ${i<3?'top':''}">${i+1}</span></td><td><b class=nm>${esc(x.s.nama)}</b></td><td class=muted>${x.s.sub_fase}</td><td class=n>${fmt(x.a.ok)}</td><td class=n style="color:#B91C1C;font-weight:600">${fmt(x.a.ng)}</td><td class=n><span class=dotc style="background:${yc(x.y)}"></span> <b>${pct(x.y)}</b></td><td><div class=valbar><b>${(100*x.a.ng/tNG).toFixed(1)}%</b>${mbar(x.a.ng,mx,'#ef4444')}</div></td></tr>`).join('')+
 `<tr style="background:#f8fafc;font-weight:600"><td></td><td>Total</td><td></td><td class=n>${fmt(tOK)}</td><td class=n style="color:#B91C1C">${fmt(tNG)}</td><td class=n>${pct(yv({ok:tOK,ng:tNG}))}</td><td>100%</td></tr></tbody></table></div>
 <p class=muted>Sumber: NG dari input output harian per station. Qty hasil rework (OK/NG setelah rework) belum dicatat di MES.</p>`;return h}

/* ---------- Rekap karyawan (modern) ---------- */
const PCOL=['#94a3b8','#22c55e','#3b82f6','#14b8a6','#8b5cf6','#f97316'];
const mbar=(v,max,col)=>`<div class=mbar><i style="width:${max?Math.max(2,100*v/max):0}%;${col?'background:'+col:''}"></i></div>`;
const monSel=(id,val)=>{const ms=months();return `<select id=${id}>${ms.map(m=>`<option value="${m}" ${m===val?'selected':''}>${MON[+m.slice(5)-1]} ${m.slice(0,4)}</option>`).join('')}</select>`};
const defMonth=()=>{const ms=months();return ms.includes('2026-09')?'2026-09':ms[0]};
function vRekap(){V.m=V.m||defMonth();const[y,mo]=V.m.split('-').map(Number);const end=new Date(y,mo,0);const acuan=end<now()?end:now();
 const lim=new Date(acuan);lim.setMonth(lim.getMonth()-3);const R={};
 for(const[k,v]of Object.entries(S.logs)){if(!k.startsWith(V.m))continue;const[t,,st,op,p]=k.split('|');if(!grups().includes(stById[st].grup))continue;const r=R[op]=R[op]||{p:{},days:{},st:{},ng:0};r.p[p]=(r.p[p]||0)+v[0];r.ng+=v[1];r.days[t]=(r.days[t]||0)+v[0];r.st[st]=(r.st[st]||0)+v[0]}
 const ids=new Set([...prodOps.filter(o=>grups().includes(stById[o.st].grup)).map(o=>o.id),...Object.keys(R)]);
 let rows=[...ids].map(i=>{const o=opById[i],r=R[i]||{p:{},days:{},st:{},ng:0};const main=Object.entries(r.st).sort((a,b)=>b[1]-a[1])[0];
  const tot=P.reduce((a,p)=>a+(r.p[p]||0),0),dw=Object.values(r.days).filter(x=>x>0).length;
  return{o,r,tot,dw,avg:dw?tot/dw:0,kat:o.tgl?(new Date(o.tgl)>lim?'Karyawan Baru':'Karyawan Lama'):'',stn:main?stById[main[0]]:(o.st?stById[o.st]:null)}});
 const grp=f=>{const l=rows.filter(f);const t=l.reduce((a,x)=>a+x.tot,0),d=l.reduce((a,x)=>a+x.dw,0);return{n:l.length,t,avg:d?t/d:0}};
 const GB=grp(x=>x.kat==='Karyawan Baru'),GL2=grp(x=>x.kat==='Karyawan Lama'),GA=grp(()=>true);
 if(V.fk)rows=rows.filter(x=>x.kat===V.fk);const q=(V.q||'').toLowerCase();if(q)rows=rows.filter(x=>(x.o.nama+x.o.id+(x.stn?x.stn.nama:'')).toLowerCase().includes(q));
 V.rs=V.rs||'tot';rows.sort(V.rs==='nama'?(a,b)=>a.o.nama.localeCompare(b.o.nama):V.rs==='avg'?(a,b)=>b.avg-a.avg:(a,b)=>b.tot-a.tot);
 const mx=Math.max(1,...rows.map(x=>x.tot)),ma=Math.max(1,...rows.map(x=>x.avg));
 const card=(t,g,c)=>`<div class=kpi style="${c?'border-left:4px solid '+c+';border-radius:0 10px 10px 0':''}"><div>${t}</div><b>${fmt(g.t)}</b><div>${g.n} orang · rata-rata ${fmt(Math.round(g.avg))} pcs/hari</div></div>`;
 return `<div class=ph><div><h1>Rekap karyawan</h1><p>${MON[mo-1]} ${y} · total OK per operator dari semua station dan shift</p></div></div>
 <div class=filters>${monSel('rmon',V.m)}<select id=fk><option value="">Semua karyawan</option>${['Karyawan Baru','Karyawan Lama'].map(k=>`<option ${k===V.fk?'selected':''}>${k}</option>`).join('')}</select>
 <select id=rs><option value=tot ${V.rs==='tot'?'selected':''}>Urutkan: Total OK</option><option value=avg ${V.rs==='avg'?'selected':''}>Urutkan: Rata-rata/hari</option><option value=nama ${V.rs==='nama'?'selected':''}>Urutkan: Nama</option></select>
 <input type=search id=q placeholder="Cari nama, ID, station" value="${esc(V.q||'')}"></div>
 <div class=kpis>${card('Karyawan Baru (masa kerja < 3 bulan)',GB,'#f59e0b')}${card('Karyawan Lama',GL2,'#2E75B6')}${card('Total semua karyawan',GA,'#1F3864')}</div>
 <div class=plegend>Komposisi produk: ${P.map((p,i)=>`<span><i style="background:${PCOL[i]}"></i>${p}</span>`).join('')}</div>
 <div class=card style="overflow:auto"><table class="mt mt2"><thead><tr><th style="width:40px">#</th><th>Operator</th><th>Station utama</th><th>Total OK</th><th style="min-width:180px">Komposisi produk</th><th class=n>Hari kerja</th><th>Rata-rata / hari</th></tr></thead><tbody>`+
 rows.map((x,i)=>`<tr${x.o.rs?' class=dim':''}><td class=muted>${i+1}</td><td><b class=nm>${esc(x.o.nama)}</b><span class=sub2>${x.o.id}${x.kat==='Karyawan Baru'?' · <span class=newb>Baru</span>':''}${x.o.rs?' · resign':''}</span></td>
 <td class=muted>${x.stn?esc(x.stn.nama):'–'}</td><td><div class=valbar><b>${fmt(x.tot)}</b>${mbar(x.tot,mx,'#16a34a')}</div></td>
 <td>${x.tot?`<div class=stack title="${P.filter(p=>x.r.p[p]).map(p=>p+': '+fmt(x.r.p[p])).join(' · ')}">${P.map((p,j)=>x.r.p[p]?`<i style="width:${100*x.r.p[p]/x.tot}%;background:${PCOL[j]}" data-tip="${p}: ${fmt(x.r.p[p])}"></i>`:'').join('')}</div><span class=sub2>${P.filter(p=>x.r.p[p]).map(p=>p+' '+fmt(x.r.p[p])).join(' · ')}</span>`:'<span class=muted>–</span>'}</td>
 <td class=n>${x.dw||'–'}</td><td><div class=valbar><b>${x.dw?fmt(Math.round(x.avg)):'–'}</b>${mbar(x.avg,ma,'#2E75B6')}</div></td></tr>`).join('')+'</tbody></table></div>'}

/* ---------- master & audit ---------- */
function vOp(){const t=now(),lim=new Date(t);lim.setMonth(lim.getMonth()-3);const q=(V.q2||'').toLowerCase();
 const rows=prodOps.filter(o=>(o.nama+o.id+stById[o.st].nama).toLowerCase().includes(q));
 return `<div class=ph><div><h1>Master operator</h1><p>${prodOps.length} operator produksi aktif · kategori dihitung dari tanggal masuk</p></div><input type=search id=q2 placeholder="Cari…" value="${esc(V.q2||'')}"></div>
 <div class=card><table class=mt><tr><th>ID</th><th>Nama</th><th>Line</th><th>Station default</th><th>Grup</th><th>Tgl masuk</th><th style="text-align:right">Target/hari</th><th>Kategori</th></tr>`+
 rows.map(o=>{const b=o.tgl&&new Date(o.tgl)>lim;return`<tr><td class=muted>${o.id}</td><td>${esc(o.nama)}</td><td>${o.line||''}</td><td>${esc(stById[o.st].nama)}</td><td>${GL[stById[o.st].grup]}</td><td>${o.tgl||''}</td><td class=n>${o.tg||''}</td><td>${o.tgl?`<span class="pill ${b?'p-draft':'p-submitted'}">${b?'Karyawan Baru':'Karyawan Lama'}</span>`:''}</td></tr>`}).join('')+'</table></div>'}
function vAudit(){return `<div class=ph><div><h1>Audit log</h1><p>Semua submit, verifikasi, kunci otomatis, dan koreksi</p></div></div><div class=card><table class=mt><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Detail</th></tr>`+
 S.audit.map(a=>`<tr><td class=muted style="white-space:nowrap">${a.w}</td><td>${esc(a.u)}</td><td><span class="pill p-none">${a.a}</span></td><td>${esc(a.d)}</td></tr>`).join('')+'</table></div>'}

/* ---------- render & events ---------- */
function recalc(){const gb=document.getElementById('gb');if(!gb)return;const num=v=>{v=(v||'').replace(/[,.\s]/g,'');return /^\d+$/.test(v)?+v:0};const ft={};let T=0,N=0;
 gb.querySelectorAll('tr[data-op]').forEach(tr=>{let o=0,n=0;tr.querySelectorAll('input').forEach(i=>{const[, p,x]=i.dataset.k.split('|');const v=num(i.value);(ft[p]=ft[p]||[0,0])[+x]+=v;x==='0'?o+=v:n+=v});
  const td=tr.querySelector('td.tot');if(tr.querySelector('input'))td.innerHTML=o+n?`${fmt(o)}<small>${yl(o,n)}</small>`:'';else{let a=0,b=0;}T+=o;N+=n});
 Object.keys(ft).forEach(p=>{const i=[...document.querySelectorAll('#gb tr:first-child input')].length?P.indexOf(p):0;const c=document.getElementById('ft'+(p==='FA1'?0:PROD.indexOf(p)));if(c)c.innerHTML=ft[p][0]+ft[p][1]?`${fmt(ft[p][0])} <span style="color:#C00000">/ ${ft[p][1]}</span>`:''});
 const ftt=document.getElementById('ftt');if(ftt&&gb.querySelector('input'))ftt.innerHTML=T+N?`${fmt(T)}<small class=muted style="display:block">${yl(T,N)}</small>`:'';
 const so=document.getElementById('sok');if(so){so.textContent=fmt(T);sng.textContent=fmt(N);syl.textContent=yl(T,N)}}
function roTotals(){const gb=document.getElementById('gb');if(!gb||gb.querySelector('input'))return;let T=0,N=0;const ft={};
 gb.querySelectorAll('tr[data-op]').forEach(tr=>{const op=tr.dataset.op;let o=0,n=0;const cells=[...tr.querySelectorAll('td.ro')];
  cells.forEach((td,i)=>{const t=td.cloneNode(true);const ng=t.querySelector('i');const nv=ng?+ng.textContent:0;if(ng)ng.remove();const ov=+(t.textContent.replace(/[^\d]/g,''))||0;o+=ov;n+=nv;(ft[i]=ft[i]||[0,0])[0]+=ov;ft[i][1]+=nv});
  tr.querySelector('td.tot').innerHTML=o+n?`${fmt(o)}<small>${yl(o,n)}</small>`:'';T+=o;N+=n});
 Object.entries(ft).forEach(([i,v])=>{const c=document.getElementById('ft'+i);if(c)c.innerHTML=v[0]+v[1]?`${fmt(v[0])} <span style="color:#C00000">/ ${v[1]}</span>`:''});const f=document.getElementById('ftt');if(f)f.innerHTML=T+N?`${fmt(T)}<small class=muted style="display:block">${yl(T,N)}</small>`:''}
function render(){killCharts();V._chart=null;V._perfsm=null;V._oky=null;autoLock();save();const v=V.view;const need={input:['asisten_leader','leader'],verif:['leader','spv','engineer'],kor:['leader','spv','engineer'],rekap:['leader','spv','engineer'],perf:['leader','spv','engineer'],op:['leader','spv','engineer'],audit:['spv','engineer']};
 if(need[v]&&!can(...need[v]))V={view:'status'};menu();
 const f={status:vStatus,input:vInput,verif:vVerif,grp:vGroup,station:vStation,korform:vKorForm,kor:vKor,report:vReport,report2:vReport2,rekap:vRekap,yield:vYield,trend:vTrend,oky:vOky,rwk:vRwk,perf:vPerf,op:vOp,audit:vAudit}[V.view];
 document.getElementById('main').innerHTML=flash.map(([c,t])=>`<div class="flash ${c}">${esc(t)}</div>`).join('')+f();flash=[];recalc();roTotals();
 document.getElementById('main').parentElement.style.maxWidth='';document.getElementById('main').style.maxWidth=['report','report2'].includes(V.view)?'none':'';
 clock.value=S.now;who.value=S.user;if(V.view==='trend')drawTrend();if(V.view==='perf')drawPerf();if(V.view==='oky')drawOky();
 document.querySelectorAll('table.xl,table.rk').forEach(t=>{const h1=t.querySelector('thead tr.h1');if(!h1)return;const off=h1.querySelector('th').offsetTop;
  h1.querySelectorAll('th').forEach(th=>th.style.top='0px');const top=Math.floor(h1.getBoundingClientRect().height)-1;t.querySelectorAll('thead tr.h2 th').forEach(th=>th.style.top=top+'px')})}
function renderKeep(){const keep={};document.querySelectorAll('#gb input').forEach(i=>keep[i.dataset.k]=i.value);const al=document.getElementById('alasan'),av=al?al.value:'';
 const bad=[...document.querySelectorAll('#gb input.err')].map(i=>i.dataset.k);render();document.querySelectorAll('#gb input').forEach(i=>{if(i.dataset.k in keep)i.value=keep[i.dataset.k];if(bad.includes(i.dataset.k))i.classList.add('err')});
 const a2=document.getElementById('alasan');if(a2)a2.value=av;recalc()}
function confirmBox(text,fn){const d=document.getElementById('dlg');d.innerHTML=`<div class=modal><div><p style="margin-top:0">${esc(text)}</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class=btn id=cno>Batal</button><button class="btn pri" id=cyes>Ya, lanjut</button></div></div></div>`;
 cno.onclick=()=>d.innerHTML='';cyes.onclick=()=>{d.innerHTML='';fn()}}
document.addEventListener('click',e=>{const t=e.target.closest('[data-go],[data-st],[data-sh],[data-shift],[data-view],[data-kor],[data-kok],[data-kno],[data-act],[data-sk],[data-yp],[data-tgr],[data-grp],[data-okst],[data-nost],[data-tog],[data-ptm],[data-rtog],[data-rst],[data-psort]');if(!t)return;const d=t.dataset;
 if(d.go)return go({view:d.go,m:V.m,tm:V.tm,pm:V.pm,yd:V.yd,yp:V.yp});if(d.yp){V.yp=d.yp;return render()}if(d.tgr){V.tgr=d.tgr;return render()}if(d.sk){V.sk=d.sk;return render()}if(d.rtog){V.ropen=V.ropen||{};V.ropen[d.rtog]=!V.ropen[d.rtog];return render()}if(d.rst){V.rst=+d.rst;V.ropen={[stById[+d.rst].grup]:true};return render()}if(d.psort){V.psort=d.psort;return render()}if(d.ptm){V.ptm=d.ptm;V.pte=null;return render()}if(d.tog){V.open=V.open||{};V.open[d.tog]=!V.open[d.tog];return render()}if(d.st){V.st=+d.st;V.extra=[];return render()}if(d.sh){V.sh=d.sh;V.extra=[];return render()}
 if(d.grp){const[gt,gs,gg]=d.grp.split('|');return go({view:'grp',gt,gs,gg})}if(d.view)return go({view:'station',gt:V.gt,gs:V.gs,gg:V.gg,st:+d.view});
 if(d.kor)return go({view:'korform',tgl:V.gt,sh:V.gs,st:+d.kor,extra:[]});
 if(d.okst||d.nost){const x=getSub(V.gt,V.gs,+(d.okst||d.nost));if(!x||x.status!=='submitted')return render();const nm=stById[x.st].nama;
  if(d.okst){x.status='locked';x.auto=0;x.lock_at=tstr(now());audit('verifikasi',`${x.tgl} ${x.sh} ${nm} disetujui & dikunci`);msg('ok',`${nm} disetujui dan dikunci.`)}
  else{const c=(document.getElementById('rej')||{}).value?.trim();if(!c){msg('error','Isi alasan penolakan di kolom atas tabel.');return render()}x.status='rejected';x.cat=c;audit('tolak',`${x.tgl} ${x.sh} ${nm}: ${c}`);msg('ok',`${nm} dikembalikan ke Asisten Leader.`)}return render()}
 if(d.kok||d.kno){const k=S.kor.find(x=>x.id===+(d.kok||d.kno));k.dec=me().nama+' '+tstr(now());
  if(d.kok){const pre=K(k.tgl,k.sh,k.st)+'|';k.ch.forEach(c=>{const key=pre+c.op+'|'+c.p;if(!c.n[0]&&!c.n[1])delete S.logs[key];else S.logs[key]=c.n;
   audit('koreksi',`#${k.id} ${k.tgl} ${k.sh} ${opById[c.op].nama} ${c.p}: OK ${c.o[0]}→${c.n[0]}, NG ${c.o[1]}→${c.n[1]}`)});k.status='approved';msg('ok','Koreksi disetujui dan diterapkan.')}
  else{k.status='rejected';audit('tolak_koreksi','#'+k.id);msg('ok','Request koreksi ditolak.')}return render()}
 const a=d.act;
 if(a==='addop'){const s=addop.value;if(!s)return;V.extra=[...(V.extra||[]),s];return renderKeep()}
 if(a==='draft')return saveInput(false);
 if(a==='nop')return confirmBox(`Tandai ${stById[V.st].nama} tidak ada produksi pada shift ${V.sh} ${V.tgl}? Angka yang sudah diisi di station ini akan dihapus.`,()=>saveInput(true,true));
 if(a==='submit')return confirmBox(`Submit ${stById[V.st].nama} untuk shift ${V.sh} ${V.tgl}? Setelah submit, data station ini tidak bisa diubah Asisten Leader.`,()=>saveInput(true));
 if(a==='tokor')return go({view:'korform',tgl:V.tgl,sh:V.sh,st:V.st,extra:[]});if(a==='sendkor')return sendKor();
 if(a==='approveall'){const c=grpStat(V.gt,V.gs,V.gg);c.list.forEach(([st,x])=>{if(x&&x.status==='submitted'){x.status='locked';x.auto=0;x.lock_at=tstr(now());audit('verifikasi',`${x.tgl} ${x.sh} ${st.nama} disetujui & dikunci`)}});msg('ok',`${c.submitted} station disetujui dan dikunci.`);return render()}});
document.addEventListener('click',e=>{const pop=document.getElementById('calpop');if(!pop)return;
 if(e.target.closest('[data-cal]')){e.stopPropagation();if(!pop.hidden){pop.hidden=true;return}const key=e.target.closest('[data-cal]').dataset.cal;const d=new Date((V[key]||dstr(now()))+'T00:00');return calDraw([d.getFullYear(),d.getMonth()],key)}
 const n=e.target.closest('[data-cnav]');if(n){e.stopPropagation();let[y,m]=pop.dataset.ym.split('-').map(Number);m+=+n.dataset.cnav;if(m<0){m=11;y--}if(m>11){m=0;y++}return calDraw([y,m])}
 const c=e.target.closest('[data-cday]');if(c){e.stopPropagation();V[pop.dataset.key]=c.dataset.cday;V.extra=[];return render()}
 if(!e.target.closest('#calpop'))pop.hidden=true},true);
document.addEventListener('change',e=>{const id=e.target.id;if(e.target.dataset.key&&e.target.value){V[e.target.dataset.key]=e.target.value;V.extra=[];render()}if(id==='rmon'){V.m=e.target.value;render()}if(id==='hide0'){V.hide0=e.target.checked;render()}if(id==='fk'){V.fk=e.target.value;render()}if(['tm','tg','pm','pst','pk','pte','rs','om','wm','ww','yf'].includes(id)){V[id]=e.target.value;render()}});
let qt;document.addEventListener('input',e=>{if(e.target.closest('#gb'))return recalc();if(e.target.id==='q'||e.target.id==='q2'){const id=e.target.id,v=e.target.value,pos=e.target.selectionStart;clearTimeout(qt);qt=setTimeout(()=>{V[id]=v;render();const el=document.getElementById(id);el.focus();el.setSelectionRange(pos,pos)},250)}});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||!e.target.closest('#gb'))return;e.preventDefault();const tr=e.target.closest('tr'),idx=[...tr.querySelectorAll('input')].indexOf(e.target);let n=tr.nextElementSibling;
 while(n&&!n.querySelector('input'))n=n.nextElementSibling;(n?n.querySelectorAll('input')[idx]:tr.parentElement.querySelector('tr input'))?.focus()});
document.addEventListener('paste',e=>{const t=e.target;if(!t.closest||!t.closest('#gb'))return;const txt=e.clipboardData.getData('text');if(!/[\t\n]/.test(txt.trim()))return;e.preventDefault();
 const rows=[...document.querySelectorAll('#gb tr[data-op]')];let ri=rows.indexOf(t.closest('tr'));const ci=[...rows[ri].querySelectorAll('input')].indexOf(t);
 txt.replace(/\r/g,'').replace(/\n$/,'').split('\n').forEach((line,k)=>{const r=rows[ri+k];if(!r)return;const ins=r.querySelectorAll('input');line.split('\t').forEach((v,j)=>{if(ins[ci+j])ins[ci+j].value=v.trim()})});recalc()});
who.innerHTML=USERS.map(u=>`<option value="${u.u}">${u.nama}</option>`).join('');who.onchange=()=>{S.user=who.value;V={view:'status'};render()};
clock.onchange=e=>{if(e.target.value){S.now=e.target.value;render()}};
const shiftClock=h=>{const d=now();d.setHours(d.getHours()+h);S.now=dstr(d)+'T'+pad(d.getHours())+':'+pad(d.getMinutes());render()};
plus1.onclick=()=>shiftClock(1);plus3.onclick=()=>shiftClock(3);
reset.onclick=()=>confirmBox('Hapus semua perubahan demo dan kembali ke data awal?',()=>{S=seed();V={view:'status'};render()});
const navSet=c=>{document.body.classList.toggle('navc',c);const b=document.getElementById('navtog');b.title=c?'Tampilkan menu':'Sembunyikan menu';b.setAttribute('aria-label',b.title);b.setAttribute('aria-expanded',String(!c));try{localStorage.setItem('mesnav',c?'1':'0')}catch(e){}};
navtog.onclick=()=>navSet(!document.body.classList.contains('navc'));try{navSet(localStorage.getItem('mesnav')==='1')}catch(e){navSet(false)}
S=load();render();

(function(){
const body=document.getElementById('body'); if(!body) return;
const num=v=>{v=(v||'').toString().replace(/[,.\s]/g,'');return v===''?null:Number(v)};
const cellVal=td=>{const i=td.querySelector('input');return num(i?i.value:td.textContent)};
const fmt=n=>n.toLocaleString('id-ID');
function recalc(){let T=0,N=0;
  body.querySelectorAll('tr').forEach(tr=>{const c=[...tr.children].slice(-3);const ok=cellVal(c[0]),ng=cellVal(c[1]);
    const y=c[2];if(ok===null&&ng===null){y.textContent='';return}
    const o=ok||0,n=ng||0;T+=o;N+=n;y.textContent=(o+n)?(100*o/(o+n)).toFixed(1)+'%':'';
    const bad=[c[0],c[1]].some(td=>{const i=td.querySelector('input');return i&&i.value&&!/^[\d.,\s]+$/.test(i.value)});
    tr.style.outline=bad?'2px solid #C00000':'';});
  document.getElementById('tok').textContent=fmt(T);document.getElementById('tng').textContent=fmt(N);
  document.getElementById('tyl').textContent=(T+N)?(100*T/(T+N)).toFixed(1)+'%':'';}
function inputs(){return [...body.querySelectorAll('input')]}
body.addEventListener('input',recalc);
body.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();
  const all=inputs(),i=all.indexOf(e.target),nx=all[i+2]||all[i%2?1:0];if(nx)nx.focus();});
body.addEventListener('paste',e=>{const t=e.target;if(t.tagName!=='INPUT')return;
  const txt=(e.clipboardData||window.clipboardData).getData('text');if(!/[\t\n]/.test(txt.trim()))return;
  e.preventDefault();const rows=txt.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(r=>r.split('\t'));
  const all=inputs();let start=all.indexOf(t);
  rows.forEach((r,ri)=>r.forEach((v,ci)=>{const col=(start%2)+ci;if(col>1)return;
    const idx=start-(start%2)+ri*2+col;if(all[idx])all[idx].value=v.trim();}));recalc();});
window.addOp=function(){const s=document.getElementById('addop');if(!s.value)return;
  if(body.querySelector('tr[data-op="'+s.value+'"]')){alert('Operator sudah ada di tabel.');return}
  const nama=s.options[s.selectedIndex].text.replace(/\s*\(.*\)$/,'');
  body.insertAdjacentHTML('beforeend',document.getElementById('tpl').innerHTML.replaceAll('__ID__',s.value).replaceAll('__NAMA__',nama));
  s.value='';recalc();body.querySelector('tr:last-child')&&inputs().slice(-10)[0].focus();};
recalc();})();

import * as K from './core.js';
const {S,A,I,P,H,$,esc,usd,money,ms,fd,period,vig,uname,PAY,toast,modal,closeM,root,R,arr,by,fetchSec,set,update,push,get,increment,serverTimestamp,paint,shellPaint,start,stk,em,buyer,srch,has,pimg,two,cancel,flt,cards,catBar,catOpts,recRow,ST,ord,prd,val,userIssue,isFree}=K;

/* ================= Datos del administrador ================= */
async function decide(id,ok){
  const r=S.rech.find(x=>x.id===id);if(!r||r.status!=='pend')return;
  if(ok){const bad=userIssue(S.users.find(u=>u.id===r.uid));if(bad)throw 'No se puede acreditar a '+r.email+': '+bad+'. Corrígelo en Gestionar saldo (Establecer saldo) o en Firebase y vuelve a intentar.'}
  const x={};
  x['recharges/'+id+'/status']=ok?'ok':'no';x['recharges/'+id+'/reviewedAt']=serverTimestamp();x['recharges/'+id+'/reviewedBy']=S.me.uid;
  if(ok)x['users/'+r.uid+'/balance']=increment(r.amount);
  await update(root,x);
}
async function saveProd(id,p){
  if(!p.name||p.name.length>80||!(p.price>0&&p.price<=1000)||!(p.days>=1&&p.days<=3650))throw 'Revisa: nombre (máx 80), precio (0 a 1000) y días (1 a 3650)';
  if(p.desc.length>2000||p.cat.length>40||p.img.length>500)throw 'Descripción máx 2000, categoría máx 40 e imagen máx 500 caracteres';
  if(id){const x={};Object.keys(p).forEach(k=>{x['products/'+id+'/'+k]=p[k]});await update(root,x)}
  else await set(push(R('products')),p);
}
async function delProd(id){
  const x={['products/'+id]:null};
  (S.free[id]||[]).forEach(s=>{x['stock/'+s]=null;x['secrets/'+s]=null});
  await update(root,x);
}
async function addStock(pid,lines){
  for(let i=0;i<lines.length;i+=50){
    const x={};
    lines.slice(i,i+50).forEach(l=>{const k=push(R('stock')).key;x['stock/'+k]={pid,sold:false};x['secrets/'+k]=l});
    await update(root,x);
  }
}
const saveAcc=(sid,account)=>set(R('secrets/'+sid),account);
const delStock=sid=>update(root,{['stock/'+sid]:null,['secrets/'+sid]:null});
async function setBal(u,mode,v){
  const base=Number(u.balance)||0,nv=mode==='add'?Math.round((base+v)*100)/100:v,x={};
  x['users/'+u.id+'/balance']=mode==='add'?increment(v):v;
  x['balanceLogs/'+push(R('balanceLogs')).key]={uid:u.id,by:S.me.uid,mode,amount:v,before:base,after:nv,createdAt:serverTimestamp()};
  await update(root,x);
}
const saveWa=wa=>set(R('settings/wa'),wa);
/* Ajustes de saldo (se leen al abrir el Historial) */
async function loadLogs(){
  try{S.logs=by(arr(await get(R('balanceLogs'))))}catch{S.logs=S.logs||[]}
  if(S.tab==='hist')paint();
}

/* ================= Entregas: formato de cuenta o mensaje libre ================= */
/* Cuenta: correo|contraseña|perfil|pin|nota   ·   Mensaje libre: se guarda como "@@texto" */
const MAXL=400;
const pidOf=sid=>Object.keys(S.free).find(k=>S.free[k].includes(sid));
const accSum=raw=>{
  if(!raw)return '<i class="mu">(sin datos)</i>';
  if(isFree(raw)){const t=raw.slice(2).trim();return `<span class="tag">Mensaje</span> <span class="mu">${esc(t.slice(0,90))}${t.length>90?'…':''}</span>`}
  const p=raw.split('|').map(x=>x.trim());
  const sub=[p[1]&&'Clave: '+p[1],p[2]&&'Perfil: '+p[2],p[3]&&'PIN: '+p[3],p[4]&&'Nota: '+p[4]].filter(Boolean).map(x=>esc(x)).join(' · ');
  return `<b>${esc(p[0])}</b>${sub?`<br><small class="mu">${sub}</small>`:''}`;
};
const accForm=raw=>{
  const fr=isFree(raw),p=fr?[]:String(raw||'').split('|'),g=i=>esc((p[i]||'').trim());
  return `<label>Tipo de entrega</label><select id="emd" data-i="emd"><option value="acc" ${fr?'':'selected'}>Cuenta (correo y contraseña)</option><option value="free" ${fr?'selected':''}>Mensaje libre</option></select>
<div id="em_acc" style="${fr?'display:none':''}"><label>Correo</label><input id="e0" value="${g(0)}"><label>Contraseña</label><input id="e1" value="${g(1)}"><div class="two"><div><label>Perfil</label><input id="e2" value="${g(2)}"></div><div><label>PIN</label><input id="e3" value="${g(3)}"></div></div><label>Nota o comentario (opcional)</label><input id="e4" maxlength="150" value="${g(4)}" placeholder="Ej: no cambiar la clave"></div>
<div id="em_free" style="${fr?'':'display:none'}"><label>Mensaje que verá el cliente</label><textarea id="ef" rows="5" maxlength="${MAXL-2}" placeholder="Ej: Envía tu correo a soporte por WhatsApp para activar tu cuenta">${esc(fr?String(raw).slice(2).trim():'')}</textarea></div>`;
};
const readAcc=()=>{
  if(val('emd')==='free'){
    const t=val('ef');
    if(!t)throw 'Escribe el mensaje de la entrega';
    if(t.length>MAXL-2)throw 'El mensaje es muy largo (máx '+(MAXL-2)+' caracteres)';
    return '@@'+t;
  }
  const v=[0,1,2,3,4].map(i=>val('e'+i));
  if(!v[0]||!v[1])throw 'El correo y la contraseña son obligatorios (o cambia a Mensaje libre)';
  if(v.some(x=>x.includes('|')))throw 'No uses el símbolo | en los datos';
  while(v.length>2&&!v[v.length-1])v.pop();
  const r=v.join('|');
  if(r.length>MAXL)throw 'Los datos son muy largos (máx '+MAXL+' caracteres)';
  return r;
};

/* ================= Vistas ================= */
const OPEN={};
const fdt=t=>new Date(t).toLocaleString('es-PE',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

/* ---- Productos ---- */
const prodList=()=>{const l=S.prods.filter(p=>has([p.name,p.cat,p.desc],S.q));return l.length?l.map(p=>`<div class="card" style="margin-bottom:10px">${pimg(p,'sm')}<div class="row" style="border:0;padding:0"><b>${esc(p.name)} · ${money(p.price)} · ${p.days} días · ${p.ren?'Renovable':'No renovable'}${p.cat?' · '+esc(p.cat):''}</b><span style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="tag">Stock ${stk(p)}</span><button data-a="adds" data-id="${p.id}">+ Stock</button><button class="ghost" data-a="editp" data-id="${p.id}">Editar</button><button class="no" data-a="delp" data-id="${p.id}">Eliminar</button></span></div></div>`).join(''):'<p class="mu">Crea tu primer producto arriba.</p>'};
const prodV=()=>`<div class="sec card"><h3>Crear producto</h3><div class="two"><div><label>Nombre</label><input id="pn" maxlength="80"></div><div><label>Precio (USD)</label><input id="pp" type="number" min="0" step="0.01"></div></div><label>Descripción</label><textarea id="pd" rows="3"></textarea><div class="two"><div><label>Categoría</label><input id="pc" list="cl" placeholder="Streaming, Música…"><datalist id="cl">${catOpts()}</datalist></div><div><label>¿Renovable?</label><select id="pr"><option value="1">Sí, renovable</option><option value="0">No renovable</option></select></div></div><div class="two"><div><label>Duración (días)</label><input id="pdays" type="number" min="1" value="30"></div><div><label>Link de la imagen (opcional)</label><input id="pi" placeholder="https://..."></div></div><button data-a="addp">Crear producto</button></div><div class="sec"><h3>Productos (${S.prods.length})</h3>${srch('Buscar producto o categoría…')}<div id="lst">${prodList()}</div></div>`;

/* ---- Inventario: cuentas disponibles para entregar ---- */
const stItem=s=>`<div class="row"><span class="acc">${accSum(S.sec[s])}</span><span style="display:flex;gap:6px"><button class="ghost" data-a="editst" data-id="${s}">Editar</button><button class="no" data-a="delst" data-id="${s}">Eliminar</button></span></div>`;
const invList=()=>{
  const q=S.q;
  const l=S.prods.map(p=>{const ids=S.free[p.id]||[],hit=has([p.name,p.cat],q);return{p,ids,hit,m:(q&&!hit)?ids.filter(s=>has([S.sec[s]||''],q)):ids}}).filter(x=>!q||x.hit||x.m.length);
  return l.length?l.map(({p,ids,m})=>{const op=!!(OPEN[p.id]||q);return `<div class="card inv"><div class="row" style="border:0;padding:0;flex-wrap:nowrap"><button class="ghost invh" data-a="invt" data-id="${p.id}">${op?'▾':'▸'} <b>${esc(p.name)}</b> <span class="tag ${ids.length?'ok':'no'}">${ids.length} disponible${ids.length===1?'':'s'}</span></button><button data-a="adds" data-id="${p.id}">+ Agregar</button></div>${op?`<div class="invb">${m.length?m.map(stItem).join(''):'<p class="mu" style="margin:10px 0 0">Sin cuentas disponibles.</p>'}</div>`:''}</div>`}).join(''):'<p class="mu">No hay productos que coincidan.</p>';
};
const invV=()=>{const n=Object.values(S.free).reduce((s,a)=>s+a.length,0);return `<div class="sec"><h3>Inventario disponible (${n})</h3><p class="mu">Cuentas listas para entregar. Toca un producto para ver y corregir sus datos (correo, contraseña, perfil, PIN, nota o mensaje libre).</p>${srch('Buscar por correo, mensaje o producto…')}<div id="lst">${invList()}</div></div>`};

/* ---- Recargas ---- */
const pendV=()=>{const p=S.rech.filter(r=>r.status==='pend'),h=S.rech.filter(r=>r.status!=='pend');return `<div class="sec"><h3>Recargas pendientes (${p.length})</h3>${p.length?p.map(r=>recRow(r,`<span style="display:flex;gap:6px"><button class="ok" data-a="decide" data-id="${r.id}" data-ok="1">Aceptar</button><button class="no" data-a="decide" data-id="${r.id}" data-ok="0">Rechazar</button></span>`)).join(''):'<p class="mu">No hay recargas por revisar.</p>'}</div><div class="sec"><h3>Últimas recargas revisadas</h3>${h.length?h.slice(0,15).map(r=>recRow(r,`<span class="tag ${r.status}">${ST[r.status]}</span>`)).join(''):'<p class="mu">Sin movimientos todavía.</p>'}<p class="mu">El historial completo está en la pestaña Historial.</p></div>`};

/* ---- Clientes y configuración ---- */
const cliV=()=>{const c=S.users.filter(u=>u.id!==S.me.uid);return `<div class="sec"><h3>Clientes (${c.length})</h3>${c.length?c.map(u=>`<div class="row"><span><b>${esc(uname(u))}</b> · ${esc(u.email)}${S.users.filter(x=>String(x.email).toLowerCase()===String(u.email).toLowerCase()).length>1?' <span class="tag no">Correo repetido</span>':''}<br><small class="mu">Saldo: ${money(u.balance)}</small></span><button class="ghost" data-a="balm" data-id="${u.id}">Gestionar saldo</button></div>`).join(''):'<p class="mu">Aún no hay clientes registrados.</p>'}</div>`};
const confV=()=>`<div class="sec card"><h3>Configuración</h3><label>WhatsApp del soporte (con código de país, por ejemplo 51999999999)</label><input id="sw" value="${esc(S.wa)}"><button data-a="savewa" style="margin-top:10px">Guardar configuración</button></div>`;

/* ---- Historial unificado: ventas + recargas + ajustes de saldo ---- */
const H2={t:'all',p:'30',n:100};
const evs=()=>{
  const e=[];
  S.orders.forEach(o=>e.push({k:'buy',t:ms(o.createdAt),o}));
  S.rech.forEach(r=>e.push({k:'rec',t:ms(r.createdAt),r}));
  (S.logs||[]).forEach(l=>e.push({k:'bal',t:ms(l.createdAt),l}));
  return e.sort((a,b)=>b.t-a.t);
};
const evText=e=>{
  if(e.k==='buy'){const o=e.o,b=buyer(o.uid);return ['venta compra',b.email,uname(b),o.pname,o.cname,o.cwa,em(o)]}
  if(e.k==='rec'){const r=e.r;return ['recarga',r.email,r.ref,PAY[r.method]?.n,ST[r.status]]}
  const l=e.l,b=buyer(l.uid);return ['ajuste saldo',b.email,uname(b),l.mode==='add'?'agregar':'establecer'];
};
const cut=()=>{const p=H2.p;if(p==='all')return 0;if(p==='today'){const d=new Date();d.setHours(0,0,0,0);return d.getTime()}return Date.now()-Number(p)*864e5};
const hist=()=>{const c=cut();return evs().filter(e=>(H2.t==='all'||e.k===H2.t)&&e.t>=c&&has(evText(e),S.q))};
const hRow=e=>{
  const d=fdt(e.t);
  if(e.k==='buy'){
    const o=e.o,b=buyer(o.uid);
    return `<div class="hrow buy"><div class="hi"><div><span class="tag">Venta</span> <b>${esc(o.pname)}</b></div><small class="mu">Comprador: ${esc(uname(b))} · ${esc(b.email||'—')}${o.cname?'<br>Cliente final: '+esc(o.cname)+(o.cwa?' · '+esc(o.cwa):''):''}<br>${d} · ${period(o)}</small> ${vig(o)}</div><div class="hr"><b>${money(o.price)}</b><span class="oa"><button class="ghost" data-a="show" data-id="${o.id}">Ver</button><button class="ghost" data-a="edito" data-id="${o.id}">Editar</button></span></div></div>`;
  }
  if(e.k==='rec'){
    const r=e.r;
    return `<div class="hrow rec"><div class="hi"><div><span class="tag">Recarga</span> <b>${esc(PAY[r.method]?.n||r.method)}</b> <span class="tag ${r.status}">${ST[r.status]}</span></div><small class="mu">${esc(r.email)} · op. ${esc(r.ref)}<br>${d}</small></div><div class="hr"><b>${money(r.amount)}</b></div></div>`;
  }
  const l=e.l,b=buyer(l.uid),a=buyer(l.by);
  return `<div class="hrow bal"><div class="hi"><div><span class="tag">Ajuste</span> <b>${l.mode==='add'?'Saldo agregado':'Saldo establecido'}</b></div><small class="mu">${esc(b.email||l.uid)} · ${usd(l.before)} → ${usd(l.after)}<br>${d}${a.email?' · por '+esc(a.email):''}</small></div><div class="hr"><b>${l.mode==='add'?'+':'='}${money(l.mode==='add'?l.amount:l.after)}</b></div></div>`;
};
const histList=()=>{
  const l=hist(),v=l.slice(0,H2.n);
  return `<p class="mu">${l.length} movimiento${l.length===1?'':'s'}</p>${v.length?v.map(hRow).join(''):'<p class="mu">No hay movimientos con estos filtros.</p>'}${l.length>v.length?'<button class="ghost" style="width:100%" data-a="more">Ver más</button>':''}`;
};
const kpis=()=>{
  const t0=new Date();t0.setHours(0,0,0,0);
  const T=t0.getTime(),M=Date.now()-30*864e5,sum=a=>a.reduce((s,o)=>s+(Number(o.price)||0),0);
  const td=S.orders.filter(o=>ms(o.createdAt)>=T),mo=S.orders.filter(o=>ms(o.createdAt)>=M),rc=S.rech.filter(r=>r.status==='ok');
  return [['Ventas de hoy',td.length+' · '+usd(sum(td))],['Últimos 30 días',mo.length+' · '+usd(sum(mo))],['Total vendido',S.orders.length+' · '+usd(sum(S.orders))],['Recargas aprobadas',rc.length+' · '+usd(rc.reduce((s,r)=>s+(Number(r.amount)||0),0))]];
};
const chips=(act,cur,list)=>list.map(x=>`<button class="${cur===x[0]?'':'ghost'}" data-a="${act}" data-v="${x[0]}">${x[1]}</button>`).join('');
const histV=()=>`<div class="sec"><h3>Historial</h3><div class="kpis">${kpis().map(k=>`<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b></div>`).join('')}</div><div class="cbar">${srch('Buscar por correo, producto, cliente u operación…')}<div class="chips2">${chips('hf',H2.t,[['all','Todo'],['buy','Ventas'],['rec','Recargas'],['bal','Ajustes de saldo']])}</div><div class="chips2">${chips('hp',H2.p,[['today','Hoy'],['7','7 días'],['30','30 días'],['all','Todo']])}<button class="ghost" data-a="csv" style="margin-left:auto">Exportar CSV</button></div></div><div id="lst">${histList()}</div></div>`;
const csvRow=e=>{
  const d=fdt(e.t);
  if(e.k==='buy'){const o=e.o,b=buyer(o.uid);return [d,'Venta',b.email||'',o.pname+(o.cname?' / cliente: '+o.cname:''),o.price]}
  if(e.k==='rec'){const r=e.r;return [d,'Recarga '+(ST[r.status]||''),r.email,(PAY[r.method]?.n||r.method)+' op. '+r.ref,r.amount]}
  const l=e.l,b=buyer(l.uid);return [d,l.mode==='add'?'Saldo agregado':'Saldo establecido',b.email||l.uid,usd(l.before)+' → '+usd(l.after),l.mode==='add'?l.amount:l.after];
};

P.views={catalog:()=>catBar()+`<div id="lst">${cards(flt())}</div>`,pend:pendV,prod:prodV,inv:invV,cli:cliV,hist:histV,conf:confV};
P.lst={catalog:()=>cards(flt()),prod:prodList,inv:invList,hist:histList};
P.tabs=()=>{const n=S.rech.filter(r=>r.status==='pend').length;return [['pend','Recargas'+(n?' ('+n+')':'')],['prod','Productos'],['inv','Inventario'],['cli','Clientes'],['hist','Historial'],['conf','Config'],['catalog','Catálogo']]};

/* ================= Ventanas ================= */
const addSM=p=>`<h3>Agregar stock</h3><p class="mu">${esc(p.name)}</p><label>Tipo de entrega</label><select id="am" data-i="am"><option value="acc">Cuentas (correo|contraseña|perfil|pin|nota)</option><option value="free">Mensaje libre</option></select>
<div id="am_acc"><label>Una cuenta por línea. Formato: correo|contraseña|perfil|pin|nota (perfil, pin y nota son opcionales)</label><textarea id="al" rows="6" placeholder="correo@mail.com|clave123|Perfil 1|1234"></textarea></div>
<div id="am_free" style="display:none"><label>Mensaje que recibirá el cliente (sin formato fijo)</label><textarea id="af" rows="5" maxlength="${MAXL-2}" placeholder="Ej: Envía tu correo por WhatsApp a soporte para activar tu cuenta"></textarea><label>Cantidad de entregas con este mensaje</label><input id="aq" type="number" min="1" max="200" value="1"></div>
${two(`<button data-a="addst" data-id="${p.id}">Agregar</button>`,cancel)}`;
const editStM=s=>{const p=prd(pidOf(s));return `<h3>Editar cuenta disponible</h3><p class="mu">${esc(p?.name||'')}. La próxima venta se entregará con estos datos.</p>${accForm(S.sec[s])}${two(`<button data-a="savest" data-id="${s}">Guardar cambios</button>`,cancel)}`};
const editOM=o=>`<h3>Editar entrega</h3><p class="mu">${esc(o.pname)}. El cliente verá los datos actualizados.</p>${accForm(S.sec[o.sid])}${two(`<button data-a="saveo" data-id="${o.id}">Guardar cambios</button>`,cancel)}`;
const balM=u=>`<h3>Saldo del cliente</h3><p>${esc(u.email)}<br><b>Actual: ${money(u.balance)}</b></p><label>Monto (USD)</label><input id="bm" type="number" min="0" step="0.01">${two(`<button class="ok" data-a="setbal" data-id="${u.id}" data-m="add">Agregar</button>`,`<button data-a="setbal" data-id="${u.id}" data-m="set">Establecer saldo</button>`)}<button class="ghost" style="width:100%;margin-top:8px" data-a="closeM">Cancelar</button>`;
const editPM=p=>`<h3>Editar producto</h3><label>Nombre</label><input id="en" maxlength="80" value="${esc(p.name)}"><label>Precio (USD)</label><input id="ep" type="number" min="0" step="0.01" value="${p.price}"><label>Descripción</label><textarea id="ed" rows="4">${esc(p.desc)}</textarea><label>Categoría</label><input id="ec" list="cl2" value="${esc(p.cat||'')}"><datalist id="cl2">${catOpts()}</datalist><label>¿Renovable?</label><select id="er"><option value="1" ${p.ren?'selected':''}>Sí, renovable</option><option value="0" ${p.ren?'':'selected'}>No renovable</option></select><label>Duración (días)</label><input id="edy" type="number" min="1" value="${p.days}"><label>Link de la imagen</label><input id="ei" value="${esc(p.img||'')}">${two(`<button data-a="savep" data-id="${p.id}">Guardar cambios</button>`,cancel)}`;

/* ================= Acciones ================= */
const tab0=A.tab;
Object.assign(A,{
  tab:d=>{tab0(d);if(d.t==='hist')loadLogs()},
  decide:async d=>{await decide(d.id,d.ok==='1');toast(d.ok==='1'?'Recarga aprobada':'Recarga rechazada')},
  addp:async()=>{
    await saveProd(null,{name:val('pn'),desc:val('pd'),img:val('pi'),days:parseInt(val('pdays')),cat:val('pc'),ren:val('pr')==='1',price:parseFloat(val('pp'))});
    paint(true);toast('Producto creado. Ahora súbele stock con el botón + Stock');
  },
  editp:d=>modal(editPM(prd(d.id))),
  savep:async d=>{await saveProd(d.id,{name:val('en'),desc:val('ed'),img:val('ei'),days:parseInt(val('edy')),cat:val('ec'),ren:val('er')==='1',price:parseFloat(val('ep'))});closeM();toast('Producto actualizado')},
  delp:async d=>{if(confirm('¿Eliminar este producto y su stock disponible? Las compras ya realizadas no se borran.')){await delProd(d.id);closeM();toast('Producto eliminado')}},
  /* stock */
  adds:d=>modal(addSM(prd(d.id))),
  addst:async d=>{
    let lines;
    if(val('am')==='free'){
      const t=val('af'),n=parseInt(val('aq'));
      if(!t)return toast('Escribe el mensaje de la entrega');
      if(t.length>MAXL-2)return toast('El mensaje es muy largo (máx '+(MAXL-2)+' caracteres)');
      if(!(n>=1&&n<=200))return toast('La cantidad debe estar entre 1 y 200');
      lines=Array(n).fill('@@'+t);
    }else{
      const all=val('al').split('\n').map(x=>x.trim()).filter(Boolean);
      if(!all.length)return toast('Pega al menos una cuenta');
      const ok=[];
      all.forEach(l=>{const q=l.split('|').map(x=>x.trim());if(q.length>=2&&q.length<=5&&q[0]&&q[1]&&l.length<=MAXL){while(q.length>2&&!q[q.length-1])q.pop();ok.push(q.join('|'))}});
      if(ok.length!==all.length)return toast('Formato inválido en '+(all.length-ok.length)+' línea(s). Usa correo|contraseña|perfil|pin|nota (mín. correo y contraseña)');
      lines=ok;
    }
    closeM();toast('Subiendo '+lines.length+' entrega(s)…');
    await addStock(d.id,lines);toast(lines.length+' entrega(s) agregadas');
  },
  invt:d=>{OPEN[d.id]=!OPEN[d.id];paint(true)},
  editst:async d=>{await fetchSec([d.id]);modal(editStM(d.id))},
  savest:async d=>{const a=readAcc();await saveAcc(d.id,a);S.sec[d.id]=a;closeM();paint(true);toast('Cuenta actualizada')},
  delst:async d=>{if(confirm('¿Eliminar esta cuenta del stock disponible?')){await delStock(d.id);toast('Cuenta eliminada')}},
  /* entregas ya vendidas */
  edito:async d=>{const o=ord(d.id);await fetchSec([o.sid]);modal(editOM(o))},
  saveo:async d=>{const o=ord(d.id),a=readAcc();await saveAcc(o.sid,a);S.sec[o.sid]=a;closeM();paint(true);toast('Entrega actualizada')},
  /* saldo y config */
  balm:d=>modal(balM(S.users.find(u=>u.id===d.id))),
  setbal:async d=>{const v=parseFloat($('bm').value);if(!(v>=0))return toast('Ingresa un monto válido');await setBal(S.users.find(u=>u.id===d.id),d.m,v);closeM();toast('Saldo actualizado');loadLogs()},
  savewa:async()=>{await saveWa(val('sw').replace(/\D/g,''));toast('Configuración guardada')},
  /* historial */
  hf:d=>{H2.t=d.v;H2.n=100;paint(true)},
  hp:d=>{H2.p=d.v;H2.n=100;paint(true)},
  more:()=>{H2.n+=100;paint(true)},
  csv:()=>{
    const q=v=>typeof v==='string'?'"'+v.replace(/^[=+\-@]/,"'$&").replace(/"/g,'""')+'"':v;
    const rows=[['Fecha','Tipo','Usuario','Detalle','Monto USD'],...hist().map(csvRow)];
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    a.download='historial-cbd-'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  },
});
const sw=(a,b)=>v=>{$(a).style.display=v==='free'?'none':'';$(b).style.display=v==='free'?'':'none'};
Object.assign(I,{am:sw('am_acc','am_free'),emd:sw('em_acc','em_free')});
/* ===== MEJORAS DEL PANEL (historial, inventario, entregas libres) — pegar justo antes de H.paint=shellPaint; ===== */
{
const isFree=K.isFree||(a=>String(a||'').startsWith('@@'));

/* ---------- datos ---------- */
const MAXL=400;
const saveAcc=(sid,account)=>set(R('secrets/'+sid),account);
const delStock=sid=>update(root,{['stock/'+sid]:null,['secrets/'+sid]:null});
async function addStock(pid,lines){
  for(let i=0;i<lines.length;i+=50){
    const x={};
    lines.slice(i,i+50).forEach(l=>{const k=push(R('stock')).key;x['stock/'+k]={pid,sold:false};x['secrets/'+k]=l});
    await update(root,x);
  }
}
async function loadLogs(){
  try{S.logs=by(arr(await get(R('balanceLogs'))))}catch{S.logs=S.logs||[]}
  if(S.tab==='hist')paint();
}
const pidOf=sid=>Object.keys(S.free).find(k=>S.free[k].includes(sid));
const fdt=t=>new Date(t).toLocaleString('es-PE',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

/* ---------- entrega: cuenta (correo|clave|perfil|pin|nota) o mensaje libre (@@texto) ---------- */
const accSum=raw=>{
  if(!raw)return '<i class="mu">(sin datos)</i>';
  if(isFree(raw)){const t=raw.slice(2).trim();return `<span class="tag">Mensaje</span> <span class="mu">${esc(t.slice(0,90))}${t.length>90?'…':''}</span>`}
  const p=raw.split('|').map(x=>x.trim());
  const sub=[p[1]&&'Clave: '+p[1],p[2]&&'Perfil: '+p[2],p[3]&&'PIN: '+p[3],p[4]&&'Nota: '+p[4]].filter(Boolean).map(x=>esc(x)).join(' · ');
  return `<b>${esc(p[0])}</b>${sub?`<br><small class="mu">${sub}</small>`:''}`;
};
const accForm=raw=>{
  const fr=isFree(raw),p=fr?[]:String(raw||'').split('|'),g=i=>esc((p[i]||'').trim());
  return `<label>Tipo de entrega</label><select id="emd" data-i="emd"><option value="acc" ${fr?'':'selected'}>Cuenta (correo y contraseña)</option><option value="free" ${fr?'selected':''}>Mensaje libre</option></select>
<div id="em_acc" style="${fr?'display:none':''}"><label>Correo</label><input id="e0" value="${g(0)}"><label>Contraseña</label><input id="e1" value="${g(1)}"><div class="two"><div><label>Perfil</label><input id="e2" value="${g(2)}"></div><div><label>PIN</label><input id="e3" value="${g(3)}"></div></div><label>Nota o comentario (opcional)</label><input id="e4" maxlength="150" value="${g(4)}" placeholder="Ej: no cambiar la clave"></div>
<div id="em_free" style="${fr?'':'display:none'}"><label>Mensaje que verá el cliente</label><textarea id="ef" rows="5" maxlength="${MAXL-2}" placeholder="Ej: Envía tu correo a soporte por WhatsApp para activar tu cuenta">${esc(fr?String(raw).slice(2).trim():'')}</textarea></div>`;
};
const readAcc=()=>{
  if(val('emd')==='free'){
    const t=val('ef');
    if(!t)throw 'Escribe el mensaje de la entrega';
    if(t.length>MAXL-2)throw 'El mensaje es muy largo (máx '+(MAXL-2)+' caracteres)';
    return '@@'+t;
  }
  const v=[0,1,2,3,4].map(i=>val('e'+i));
  if(!v[0]||!v[1])throw 'El correo y la contraseña son obligatorios (o cambia a Mensaje libre)';
  if(v.some(x=>x.includes('|')))throw 'No uses el símbolo | en los datos';
  while(v.length>2&&!v[v.length-1])v.pop();
  const r=v.join('|');
  if(r.length>MAXL)throw 'Los datos son muy largos (máx '+MAXL+' caracteres)';
  return r;
};

/* ---------- Inventario ---------- */
const OPEN={};
const stItem=s=>`<div class="row"><span class="acc">${accSum(S.sec[s])}</span><span style="display:flex;gap:6px"><button class="ghost" data-a="editst" data-id="${s}">Editar</button><button class="no" data-a="delst" data-id="${s}">Eliminar</button></span></div>`;
const invList=()=>{
  const q=S.q;
  const l=S.prods.map(p=>{const ids=S.free[p.id]||[],hit=has([p.name,p.cat],q);return{p,ids,hit,m:(q&&!hit)?ids.filter(s=>has([S.sec[s]||''],q)):ids}}).filter(x=>!q||x.hit||x.m.length);
  return l.length?l.map(({p,ids,m})=>{const op=!!(OPEN[p.id]||q);return `<div class="card inv"><div class="row" style="border:0;padding:0;flex-wrap:nowrap"><button class="ghost invh" data-a="invt" data-id="${p.id}">${op?'▾':'▸'} <b>${esc(p.name)}</b> <span class="tag ${ids.length?'ok':'no'}">${ids.length} disponible${ids.length===1?'':'s'}</span></button><button data-a="addstk" data-id="${p.id}">+ Agregar</button></div>${op?`<div class="invb">${m.length?m.map(stItem).join(''):'<p class="mu" style="margin:10px 0 0">Sin cuentas disponibles.</p>'}</div>`:''}</div>`}).join(''):'<p class="mu">No hay productos que coincidan.</p>';
};
const invV=()=>{const n=Object.values(S.free).reduce((s,a)=>s+a.length,0);return `<div class="sec"><h3>Inventario disponible (${n})</h3><p class="mu">Cuentas listas para entregar. Toca un producto para ver y corregir sus datos (correo, contraseña, perfil, PIN, nota o mensaje libre).</p>${srch('Buscar por correo, mensaje o producto…')}<div id="lst">${invList()}</div></div>`};

/* ---------- Historial ---------- */
const H2={t:'all',p:'30',n:100};
const evs=()=>{
  const e=[];
  S.orders.forEach(o=>e.push({k:'buy',t:ms(o.createdAt),o}));
  S.rech.forEach(r=>e.push({k:'rec',t:ms(r.createdAt),r}));
  (S.logs||[]).forEach(l=>e.push({k:'bal',t:ms(l.createdAt),l}));
  return e.sort((a,b)=>b.t-a.t);
};
const evText=e=>{
  if(e.k==='buy'){const o=e.o,b=buyer(o.uid);return ['venta compra',b.email,uname(b),o.pname,o.cname,o.cwa,em(o)]}
  if(e.k==='rec'){const r=e.r;return ['recarga',r.email,r.ref,PAY[r.method]?.n,ST[r.status]]}
  const l=e.l,b=buyer(l.uid);return ['ajuste saldo',b.email,uname(b),l.mode==='add'?'agregar':'establecer'];
};
const cut=()=>{const p=H2.p;if(p==='all')return 0;if(p==='today'){const d=new Date();d.setHours(0,0,0,0);return d.getTime()}return Date.now()-Number(p)*864e5};
const hist=()=>{const c=cut();return evs().filter(e=>(H2.t==='all'||e.k===H2.t)&&e.t>=c&&has(evText(e),S.q))};
const hRow=e=>{
  const d=fdt(e.t);
  if(e.k==='buy'){
    const o=e.o,b=buyer(o.uid);
    return `<div class="hrow buy"><div class="hi"><div><span class="tag">Venta</span> <b>${esc(o.pname)}</b></div><small class="mu">Comprador: ${esc(uname(b))} · ${esc(b.email||'—')}${o.cname?'<br>Cliente final: '+esc(o.cname)+(o.cwa?' · '+esc(o.cwa):''):''}<br>${d} · ${period(o)}</small> ${vig(o)}</div><div class="hr"><b>${money(o.price)}</b><span class="oa"><button class="ghost" data-a="show" data-id="${o.id}">Ver</button><button class="ghost" data-a="edito" data-id="${o.id}">Editar</button></span></div></div>`;
  }
  if(e.k==='rec'){
    const r=e.r;
    return `<div class="hrow rec"><div class="hi"><div><span class="tag">Recarga</span> <b>${esc(PAY[r.method]?.n||r.method)}</b> <span class="tag ${r.status}">${ST[r.status]}</span></div><small class="mu">${esc(r.email)} · op. ${esc(r.ref)}<br>${d}</small></div><div class="hr"><b>${money(r.amount)}</b></div></div>`;
  }
  const l=e.l,b=buyer(l.uid),a=buyer(l.by);
  return `<div class="hrow bal"><div class="hi"><div><span class="tag">Ajuste</span> <b>${l.mode==='add'?'Saldo agregado':'Saldo establecido'}</b></div><small class="mu">${esc(b.email||l.uid)} · ${usd(l.before)} → ${usd(l.after)}<br>${d}${a.email?' · por '+esc(a.email):''}</small></div><div class="hr"><b>${l.mode==='add'?'+':'='}${money(l.mode==='add'?l.amount:l.after)}</b></div></div>`;
};
const histList=()=>{
  const l=hist(),v=l.slice(0,H2.n);
  return `<p class="mu">${l.length} movimiento${l.length===1?'':'s'}</p>${v.length?v.map(hRow).join(''):'<p class="mu">No hay movimientos con estos filtros.</p>'}${l.length>v.length?'<button class="ghost" style="width:100%" data-a="more">Ver más</button>':''}`;
};
const kpis=()=>{
  const t0=new Date();t0.setHours(0,0,0,0);
  const T=t0.getTime(),M=Date.now()-30*864e5,sum=a=>a.reduce((s,o)=>s+(Number(o.price)||0),0);
  const td=S.orders.filter(o=>ms(o.createdAt)>=T),mo=S.orders.filter(o=>ms(o.createdAt)>=M),rc=S.rech.filter(r=>r.status==='ok');
  return [['Ventas de hoy',td.length+' · '+usd(sum(td))],['Últimos 30 días',mo.length+' · '+usd(sum(mo))],['Total vendido',S.orders.length+' · '+usd(sum(S.orders))],['Recargas aprobadas',rc.length+' · '+usd(rc.reduce((s,r)=>s+(Number(r.amount)||0),0))]];
};
const chips=(act,cur,list)=>list.map(x=>`<button class="${cur===x[0]?'':'ghost'}" data-a="${act}" data-v="${x[0]}">${x[1]}</button>`).join('');
const histV=()=>`<div class="sec"><h3>Historial</h3><div class="kpis">${kpis().map(k=>`<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b></div>`).join('')}</div><div class="cbar">${srch('Buscar por correo, producto, cliente u operación…')}<div class="chips2">${chips('hf',H2.t,[['all','Todo'],['buy','Ventas'],['rec','Recargas'],['bal','Ajustes de saldo']])}</div><div class="chips2">${chips('hp',H2.p,[['today','Hoy'],['7','7 días'],['30','30 días'],['all','Todo']])}<button class="ghost" data-a="csv" style="margin-left:auto">Exportar CSV</button></div></div><div id="lst">${histList()}</div></div>`;
const csvRow=e=>{
  const d=fdt(e.t);
  if(e.k==='buy'){const o=e.o,b=buyer(o.uid);return [d,'Venta',b.email||'',o.pname+(o.cname?' / cliente: '+o.cname:''),o.price]}
  if(e.k==='rec'){const r=e.r;return [d,'Recarga '+(ST[r.status]||''),r.email,(PAY[r.method]?.n||r.method)+' op. '+r.ref,r.amount]}
  const l=e.l,b=buyer(l.uid);return [d,l.mode==='add'?'Saldo agregado':'Saldo establecido',b.email||l.uid,usd(l.before)+' → '+usd(l.after),l.mode==='add'?l.amount:l.after];
};

/* ---------- ventanas ---------- */
const addSM=p=>`<h3>Agregar stock</h3><p class="mu">${esc(p.name)}</p><label>Tipo de entrega</label><select id="am" data-i="am"><option value="acc">Cuentas (correo|contraseña|perfil|pin|nota)</option><option value="free">Mensaje libre</option></select>
<div id="am_acc"><label>Una cuenta por línea. Formato: correo|contraseña|perfil|pin|nota (perfil, pin y nota son opcionales)</label><textarea id="al" rows="6" placeholder="correo@mail.com|clave123|Perfil 1|1234"></textarea></div>
<div id="am_free" style="display:none"><label>Mensaje que recibirá el cliente (sin formato fijo)</label><textarea id="af" rows="5" maxlength="${MAXL-2}" placeholder="Ej: Envía tu correo por WhatsApp a soporte para activar tu cuenta"></textarea><label>Cantidad de entregas con este mensaje</label><input id="aq" type="number" min="1" max="200" value="1"></div>
${two(`<button data-a="addst" data-id="${p.id}">Agregar</button>`,cancel)}`;
const editStM=s=>{const p=prd(pidOf(s));return `<h3>Editar cuenta disponible</h3><p class="mu">${esc(p?.name||'')}. La próxima venta se entregará con estos datos.</p>${accForm(S.sec[s])}${two(`<button data-a="savest" data-id="${s}">Guardar cambios</button>`,cancel)}`};
const editOM=o=>`<h3>Editar entrega</h3><p class="mu">${esc(o.pname)}. El cliente verá los datos actualizados.</p>${accForm(S.sec[o.sid])}${two(`<button data-a="saveo" data-id="${o.id}">Guardar cambios</button>`,cancel)}`;

/* ---------- registro en el panel ---------- */
P.views.inv=invV;P.views.hist=histV;
P.lst.inv=invList;P.lst.hist=histList;
const tabs0=P.tabs;
P.tabs=()=>{
  const base=tabs0().filter(t=>t[0]!=='inv'&&t[0]!=='hist'),out=[];let done=false;
  base.forEach(t=>{if(t[0]==='sales'){out.push(['inv','Inventario'],['hist','Historial']);done=true}else out.push(t)});
  if(!done)out.splice(Math.min(2,out.length),0,['inv','Inventario'],['hist','Historial']);
  return out;
};
const tab0=A.tab,setbal0=A.setbal;
Object.assign(A,{
  tab:d=>{tab0(d);if(d.t==='hist')loadLogs()},
  addstk:d=>modal(addSM(prd(d.id))),
  addst:async d=>{
    let lines;
    if(val('am')==='free'){
      const t=val('af'),n=parseInt(val('aq'));
      if(!t)return toast('Escribe el mensaje de la entrega');
      if(t.length>MAXL-2)return toast('El mensaje es muy largo (máx '+(MAXL-2)+' caracteres)');
      if(!(n>=1&&n<=200))return toast('La cantidad debe estar entre 1 y 200');
      lines=Array(n).fill('@@'+t);
    }else{
      const all=val('al').split('\n').map(x=>x.trim()).filter(Boolean);
      if(!all.length)return toast('Pega al menos una cuenta');
      const ok=[];
      all.forEach(l=>{const q=l.split('|').map(x=>x.trim());if(q.length>=2&&q.length<=5&&q[0]&&q[1]&&l.length<=MAXL){while(q.length>2&&!q[q.length-1])q.pop();ok.push(q.join('|'))}});
      if(ok.length!==all.length)return toast('Formato inválido en '+(all.length-ok.length)+' línea(s). Usa correo|contraseña|perfil|pin|nota (mín. correo y contraseña)');
      lines=ok;
    }
    closeM();toast('Subiendo '+lines.length+' entrega(s)…');
    await addStock(d.id,lines);toast(lines.length+' entrega(s) agregadas');
  },
  invt:d=>{OPEN[d.id]=!OPEN[d.id];paint(true)},
  editst:async d=>{await fetchSec([d.id]);modal(editStM(d.id))},
  savest:async d=>{const a=readAcc();await saveAcc(d.id,a);S.sec[d.id]=a;closeM();paint(true);toast('Cuenta actualizada')},
  delst:async d=>{if(confirm('¿Eliminar esta cuenta del stock disponible?')){await delStock(d.id);toast('Cuenta eliminada')}},
  edito:async d=>{const o=ord(d.id);await fetchSec([o.sid]);modal(editOM(o))},
  saveo:async d=>{const o=ord(d.id),a=readAcc();await saveAcc(o.sid,a);S.sec[o.sid]=a;closeM();paint(true);toast('Entrega actualizada')},
  hf:d=>{H2.t=d.v;H2.n=100;paint(true)},
  hp:d=>{H2.p=d.v;H2.n=100;paint(true)},
  more:()=>{H2.n+=100;paint(true)},
  csv:()=>{
    const q=v=>typeof v==='string'?'"'+v.replace(/^[=+\-@]/,"'$&").replace(/"/g,'""')+'"':v;
    const rows=[['Fecha','Tipo','Usuario','Detalle','Monto USD'],...hist().map(csvRow)];
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    a.download='historial-cbd-'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  },
});
if(setbal0)A.setbal=async d=>{await setbal0(d);loadLogs()};
const sw=(a,b)=>v=>{$(a).style.display=v==='free'?'none':'';$(b).style.display=v==='free'?'':'none'};
Object.assign(I,{am:sw('am_acc','am_free'),emd:sw('em_acc','em_free')});
}
H.paint=shellPaint;
start('admincdb');

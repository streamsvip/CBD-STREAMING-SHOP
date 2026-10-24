import * as K from './core.js?v=20261026';
const {S,A,I,P,H,$,esc,usd,money,ms,period,vig,uname,PAY,toast,modal,closeM,root,R,fetchSec,set,update,push,increment,serverTimestamp,paint,shellPaint,start,stk,em,buyer,srch,has,pimg,two,cancel,flt,cards,catBar,catOpts,recRow,ST,ord,prd,val,userIssue,isFree,empty,ask}=K;

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
const clearStock=ids=>{const x={};ids.forEach(s=>{x['stock/'+s]=null;x['secrets/'+s]=null});return update(root,x)};
/* Edición en bloque: las líneas actualizan las cuentas existentes en orden, las que sobran se eliminan y las nuevas se crean */
async function bulkSave(pid,lines){
  const ids=[...(S.free[pid]||[])],x={};
  lines.forEach((l,i)=>{if(i<ids.length)x['secrets/'+ids[i]]=l});
  ids.slice(lines.length).forEach(s=>{x['stock/'+s]=null;x['secrets/'+s]=null});
  if(Object.keys(x).length)await update(root,x);
  const extra=lines.slice(ids.length);
  if(extra.length)await addStock(pid,extra);
}
const saveWa=wa=>set(R('settings/wa'),wa);

/* ================= Entregas: formato de cuenta o mensaje libre ================= */
/* Cuenta: correo|contraseña|perfil|pin|nota   ·   Mensaje libre: se guarda como "@@texto" */
const MAXL=400;
const accForm=raw=>{
  const fr=isFree(raw),p=fr?[]:String(raw||'').split('|'),g=i=>esc((p[i]||'').trim());
  return `<label>Tipo de entrega</label><select id="emd" data-i="emd"><option value="acc" ${fr?'':'selected'}>Cuenta (correo y contraseña)</option><option value="free" ${fr?'selected':''}>Mensaje libre</option></select>
<div id="em_acc" style="${fr?'display:none':''}"><label>Correo</label><input id="e0" value="${g(0)}"><label>Contraseña</label><input id="e1" value="${g(1)}"><div class="two"><div><label>Perfil</label><input id="e2" value="${g(2)}"></div><div><label>PIN</label><input id="e3" value="${g(3)}"></div></div><label>Nota o comentario (opcional)</label><input id="e4" maxlength="150" value="${g(4)}" placeholder="Ej: no cambiar la clave"></div>
<div id="em_free" style="${fr?'':'display:none'}"><label>Mensaje que verá el cliente</label><textarea id="ef" rows="5" maxlength="${MAXL-2}" placeholder="Ej: Envía tu correo a soporte por WhatsApp para activar tu cuenta">${esc(fr?String(raw).slice(2).trim():'')}</textarea></div>`;
};
const packMsg=t=>{
  if(!t)throw 'Escribe el mensaje de la entrega';
  if(t.length>MAXL-2)throw 'El mensaje es muy largo (máx '+(MAXL-2)+' caracteres)';
  return '@@'+t;
};
const packAcc=v=>{
  if(!v[0]||!v[1])throw 'El correo y la contraseña son obligatorios (o usa Mensaje libre)';
  if(v.some(x=>x.includes('|')))throw 'No uses el símbolo | en los datos';
  v=[...v];while(v.length>2&&!v[v.length-1])v.pop();
  const r=v.join('|');
  if(r.length>MAXL)throw 'Los datos son muy largos (máx '+MAXL+' caracteres)';
  return r;
};
const readAcc=()=>val('emd')==='free'?packMsg(val('ef')):packAcc([0,1,2,3,4].map(i=>val('e'+i)));
const normLine=l=>{
  l=l.trim();
  if(l.startsWith('@@')){const t=l.slice(2).trim();return t&&t.length<=MAXL-2?'@@'+t:null}
  const q=l.split('|').map(x=>x.trim());
  if(q.length<2||q.length>5||!q[0]||!q[1])return null;
  while(q.length>2&&!q[q.length-1])q.pop();
  const r=q.join('|');return r.length<=MAXL?r:null;
};

/* ================= Vistas ================= */
const OPEN={};
const fdt=t=>new Date(t).toLocaleString('es-PE',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const alive=o=>ms(o.createdAt)+(o.days||30)*864e5>Date.now();

/* ---- Productos ---- */
const prodList=()=>{const l=S.prods.filter(p=>has([p.name,p.cat,p.desc],S.q));return l.length?l.map(p=>`<div class="card pitem"><div class="pth">${pimg(p,'sm2')}</div><div class="pbody"><b>${esc(p.name)}</b><div class="meta"><span>${money(p.price)}</span><span>⏱ ${p.days} días</span><span>${p.ren?'Renovable':'No renovable'}</span>${p.cat?`<span>${esc(p.cat)}</span>`:''}<span class="tag ${stk(p)?'ok':'no'}">Stock ${stk(p)}</span></div></div><div class="pact"><button data-a="adds" data-id="${p.id}">+ Stock</button><button class="ghost" data-a="editp" data-id="${p.id}">Editar</button><button class="no" data-a="delp" data-id="${p.id}">Eliminar</button></div></div>`).join(''):empty('Crea tu primer producto arriba.')};
const prodV=()=>`<div class="sec card"><h3>Crear producto</h3><div class="two"><div><label>Nombre</label><input id="pn" maxlength="80"></div><div><label>Precio (USD)</label><input id="pp" type="number" min="0" step="0.01"></div></div><label>Descripción</label><textarea id="pd" rows="3"></textarea><div class="two"><div><label>Categoría</label><input id="pc" list="cl" placeholder="Streaming, Música…"><datalist id="cl">${catOpts()}</datalist></div><div><label>¿Renovable?</label><select id="pr"><option value="1">Sí, renovable</option><option value="0">No renovable</option></select></div></div><div class="two"><div><label>Duración (días)</label><input id="pdays" type="number" min="1" value="30"></div><div><label>Link de la imagen (opcional)</label><input id="pi" placeholder="https://..."></div></div><button data-a="addp">Crear producto</button></div><div class="sec"><h3>Productos <span class="pill">${S.prods.length}</span></h3>${srch('Buscar producto o categoría…')}<div id="lst">${prodList()}</div></div>`;

/* ---- Inventario: cuentas disponibles para entregar (edición directa, en bloque y vaciado) ---- */
const FL=['Correo','Clave','Perfil','PIN','Nota'];
const iRow=(s,i)=>{
  const raw=S.sec[s],fr=isFree(raw),p=fr?[]:String(raw||'').split('|');
  const fields=fr
    ?`<textarea data-f="m" rows="2" maxlength="${MAXL-2}" placeholder="Mensaje que verá el cliente" aria-label="Mensaje">${esc(String(raw).slice(2).trim())}</textarea>`
    :FL.map((l,k)=>`<input data-f="${k}" maxlength="${k===4?150:80}" placeholder="${l}" aria-label="${l}" value="${esc((k===4?p.slice(4).join(' | '):(p[k]||'')).trim())}">`).join('');
  return `<div class="irow${fr?' free':''}" data-s="${s}"><span class="inum">${i+1}</span><div class="ifs">${fields}</div><span class="iact"><button data-a="isave" data-id="${s}">Guardar</button><button class="no" data-a="delst" data-id="${s}" title="Eliminar esta cuenta" aria-label="Eliminar">✕</button></span></div>`;
};
const invList=()=>{
  const q=S.q;
  const l=S.prods.map(p=>{const ids=S.free[p.id]||[],hit=has([p.name,p.cat],q);return{p,ids,m:(q&&!hit)?ids.filter(s=>has([S.sec[s]||''],q)):ids,hit}}).filter(x=>!q||x.hit||x.m.length);
  return l.length?l.map(({p,ids,m})=>{const op=!!(OPEN[p.id]||q);return `<div class="card inv"><div class="invtop"><button class="ghost invh" data-a="invt" data-id="${p.id}">${op?'▾':'▸'} <b>${esc(p.name)}</b> <span class="tag ${ids.length?'ok':'no'}">${ids.length} disponible${ids.length===1?'':'s'}</span></button><span class="invbtns"><button data-a="adds" data-id="${p.id}">+ Agregar</button><button class="ghost" data-a="bulk" data-id="${p.id}" ${ids.length?'':'disabled'}>Editar en bloque</button><button class="no" data-a="clr" data-id="${p.id}" ${ids.length?'':'disabled'}>Vaciar</button></span></div>${op?`<div class="invb">${m.length?m.map(iRow).join(''):'<p class="mu" style="margin:0">Sin cuentas disponibles.</p>'}</div>`:''}</div>`}).join(''):empty('No hay productos que coincidan.');
};
const invV=()=>{
  const n=Object.values(S.free).reduce((s,a)=>s+a.length,0),con=S.prods.filter(p=>stk(p)>0).length;
  return `<div class="sec"><h3>Inventario disponible <span class="pill">${n}</span></h3><div class="kpis"><div class="kpi"><small>Cuentas disponibles</small><b>${n}</b></div><div class="kpi"><small>Productos con stock</small><b>${con}</b></div><div class="kpi"><small>Productos agotados</small><b>${S.prods.length-con}</b></div></div><p class="mu">Corrige los datos directamente en cada cuenta y toca <b>Guardar</b>. Para cambiar muchas a la vez usa <b>Editar en bloque</b>.</p><div class="invtools">${srch('Buscar por correo, mensaje o producto…')}<div class="chips2"><button class="ghost" data-a="invall" data-v="1">Expandir todo</button><button class="ghost" data-a="invall" data-v="0">Contraer todo</button><button class="no" data-a="clrall" style="margin-left:auto" ${n?'':'disabled'}>Vaciar todo el inventario</button></div></div><div id="lst">${invList()}</div></div>`;
};

/* ---- Recargas: pendientes + historial propio de recargas ---- */
let RN=30;
const recHist=()=>{
  const l=S.rech.filter(r=>r.status!=='pend'&&has([r.email,r.ref,PAY[r.method]?.n,ST[r.status]],S.q)),v=l.slice(0,RN);
  return `<p class="mu cnt2">${l.length} registro${l.length===1?'':'s'}</p>${v.length?v.map(r=>recRow(r,`<span class="tag ${r.status}">${ST[r.status]}</span>`)).join(''):empty('Sin movimientos con estos filtros.')}${l.length>v.length?'<button class="ghost wide" data-a="morer">Ver más</button>':''}`;
};
const pendV=()=>{
  const p=S.rech.filter(r=>r.status==='pend'),n=S.rech.length-p.length;
  return `<div class="sec"><h3>Recargas pendientes <span class="pill">${p.length}</span></h3>${p.length?p.map(r=>recRow(r,`<span style="display:flex;gap:6px"><button class="ok" data-a="decide" data-id="${r.id}" data-ok="1">Aceptar</button><button class="no" data-a="decide" data-id="${r.id}" data-ok="0">Rechazar</button></span>`)).join(''):empty('No hay recargas por revisar.')}</div><div class="sec"><h3>Historial de recargas <span class="pill">${n}</span></h3>${srch('Buscar por correo, operación o estado…')}<div id="lst">${recHist()}</div></div>`;
};

/* ---- Clientes y configuración ---- */
const cliV=()=>{const c=S.users.filter(u=>u.id!==S.me.uid);return `<div class="sec"><h3>Clientes <span class="pill">${c.length}</span></h3>${c.length?c.map(u=>`<div class="card row cli" style="flex-direction:row;margin-bottom:10px"><span class="usr"><span class="av">${esc(uname(u)[0].toUpperCase())}</span><span><b>${esc(uname(u))}</b>${S.users.filter(x=>String(x.email).toLowerCase()===String(u.email).toLowerCase()).length>1?' <span class="tag no">Correo repetido</span>':''}<br><small class="mu">${esc(u.email)} · Saldo: ${money(u.balance)}</small></span></span><button class="ghost" data-a="balm" data-id="${u.id}">Gestionar saldo</button></div>`).join(''):empty('Aún no hay clientes registrados.')}</div>`};
const confV=()=>`<div class="sec card"><h3>Configuración</h3><label>WhatsApp del soporte (con código de país, por ejemplo 51999999999)</label><input id="sw" value="${esc(S.wa)}"><button data-a="savewa" style="margin-top:6px">Guardar configuración</button></div>`;

/* ---- Historial: solo cuentas entregadas (ventas). Las recargas tienen su propio historial en la pestaña Recargas ---- */
const H2={p:'30',s:'all',n:60};
const cut=()=>{const p=H2.p;if(p==='all')return 0;if(p==='today'){const d=new Date();d.setHours(0,0,0,0);return d.getTime()}return Date.now()-Number(p)*864e5};
const hist=()=>{const c=cut();return S.orders.filter(o=>ms(o.createdAt)>=c&&(H2.s==='all'||(H2.s==='on')===alive(o))&&has([o.pname,buyer(o.uid).email,uname(buyer(o.uid)),o.cname,o.cwa,em(o)],S.q))};
const hRow=o=>{
  const b=buyer(o.uid);
  return `<div class="hrow">${pimg({name:o.pname,img:o.img},'sm2')}<div class="hi"><div class="ht"><b>${esc(o.pname)}</b> ${vig(o)}</div><div class="hm"><div><span>Comprador</span>${esc(uname(b))} · ${esc(b.email||'—')}</div><div><span>Cuenta entregada</span>${esc(em(o)||'—')}</div>${o.cname?`<div><span>Cliente final</span>${esc(o.cname)}${o.cwa?' · '+esc(o.cwa):''}</div>`:''}<div><span>Fecha</span>${fdt(ms(o.createdAt))}</div><div><span>Vigencia</span>${period(o)}</div></div></div><div class="hr"><b>${money(o.price)}</b><span class="oa"><button class="ghost" data-a="show" data-id="${o.id}">Ver</button><button class="ghost" data-a="edito" data-id="${o.id}">Editar</button></span></div></div>`;
};
const histList=()=>{
  const l=hist(),v=l.slice(0,H2.n);
  return `<p class="mu cnt2">${l.length} entrega${l.length===1?'':'s'}</p>${v.length?v.map(hRow).join(''):empty('No hay entregas con estos filtros.')}${l.length>v.length?'<button class="ghost wide" data-a="more">Ver más</button>':''}`;
};
const kpis=()=>{
  const t0=new Date();t0.setHours(0,0,0,0);
  const T=t0.getTime(),M=Date.now()-30*864e5,sum=a=>a.reduce((s,o)=>s+(Number(o.price)||0),0);
  const td=S.orders.filter(o=>ms(o.createdAt)>=T),mo=S.orders.filter(o=>ms(o.createdAt)>=M);
  return [['Entregas de hoy',td.length+' · '+usd(sum(td))],['Últimos 30 días',mo.length+' · '+usd(sum(mo))],['Total vendido',S.orders.length+' · '+usd(sum(S.orders))],['Cuentas vigentes',S.orders.filter(alive).length+'']];
};
const chips=(act,cur,list)=>list.map(x=>`<button class="${cur===x[0]?'':'ghost'}" data-a="${act}" data-v="${x[0]}">${x[1]}</button>`).join('');
const histV=()=>`<div class="sec"><h3>Historial de entregas</h3><div class="kpis">${kpis().map(k=>`<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b></div>`).join('')}</div><div class="cbar">${srch('Buscar por producto, comprador, cliente o cuenta…')}<div class="chips2">${chips('hp',H2.p,[['today','Hoy'],['7','7 días'],['30','30 días'],['all','Todo']])}</div><div class="chips2">${chips('hs',H2.s,[['all','Todas'],['on','Vigentes'],['off','Vencidas']])}<button class="ghost" data-a="csv" style="margin-left:auto">Exportar CSV</button></div></div><div id="lst">${histList()}</div></div>`;
const csvRow=o=>{const b=buyer(o.uid);return [fdt(ms(o.createdAt)),o.pname,b.email||'',em(o)||'',o.cname||'',o.cwa||'',alive(o)?'Vigente':'Vencida',o.price]};

P.views={catalog:()=>catBar()+`<div id="lst">${cards(flt())}</div>`,pend:pendV,prod:prodV,inv:invV,cli:cliV,hist:histV,conf:confV};
P.lst={catalog:()=>cards(flt()),pend:recHist,prod:prodList,inv:invList,hist:histList};
P.tabs=()=>{const n=S.rech.filter(r=>r.status==='pend').length;return [['pend','Recargas'+(n?' ('+n+')':'')],['prod','Productos'],['inv','Inventario'],['cli','Clientes'],['hist','Historial'],['conf','Config'],['catalog','Catálogo']]};

/* ================= Ventanas ================= */
const addSM=p=>`<h3>Agregar stock</h3><p class="mu">${esc(p.name)}</p><label>Tipo de entrega</label><select id="am" data-i="am"><option value="acc">Cuentas (correo|contraseña|perfil|pin|nota)</option><option value="free">Mensaje libre</option></select>
<div id="am_acc"><label>Una cuenta por línea. Formato: correo|contraseña|perfil|pin|nota (perfil, pin y nota son opcionales)</label><textarea id="al" rows="6" placeholder="correo@mail.com|clave123|Perfil 1|1234"></textarea></div>
<div id="am_free" style="display:none"><label>Mensaje que recibirá el cliente (sin formato fijo)</label><textarea id="af" rows="5" maxlength="${MAXL-2}" placeholder="Ej: Envía tu correo por WhatsApp a soporte para activar tu cuenta"></textarea><label>Cantidad de entregas con este mensaje</label><input id="aq" type="number" min="1" max="200" value="1"></div>
${two(`<button data-a="addst" data-id="${p.id}">Agregar</button>`,cancel)}`;
const bulkM=p=>{const ids=S.free[p.id]||[];return `<h3>Editar en bloque</h3><p class="mu"><b>${esc(p.name)}</b> · ${ids.length} disponible${ids.length===1?'':'s'}. Una cuenta por línea: correo|contraseña|perfil|pin|nota. Para un mensaje libre empieza la línea con @@. Si borras una línea se elimina esa cuenta; si agregas líneas se crean cuentas nuevas.</p><textarea id="bk" rows="12" wrap="off" spellcheck="false" style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;white-space:pre;overflow:auto">${esc(ids.map(s=>S.sec[s]||'').join('\n'))}</textarea>${two(`<button data-a="bsave" data-id="${p.id}">Guardar cambios</button>`,cancel)}`};
const editOM=o=>`<h3>Editar entrega</h3><p class="mu">${esc(o.pname)}. El cliente verá los datos actualizados.</p>${accForm(S.sec[o.sid])}${two(`<button data-a="saveo" data-id="${o.id}">Guardar cambios</button>`,cancel)}`;
const balM=u=>`<h3>Saldo del cliente</h3><p>${esc(u.email)}<br><b>Actual: ${money(u.balance)}</b></p><label for="bamt">Monto (USD)</label><input id="bamt" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00"><small class="mu" style="display:block;margin:-6px 0 12px"><b>Agregar</b>: mínimo $0.10 · <b>Establecer</b>: cualquier monto desde $0.00</small>${two(`<button class="ok" data-a="setbal" data-id="${u.id}" data-m="add">Agregar</button>`,`<button data-a="setbal" data-id="${u.id}" data-m="set">Establecer saldo</button>`)}<button class="no" style="width:100%;margin-top:8px" data-a="setbal" data-id="${u.id}" data-m="set" data-z="1">Poner saldo en $0.00</button><button class="ghost" style="width:100%;margin-top:8px" data-a="closeM">Cancelar</button>`;
const editPM=p=>`<h3>Editar producto</h3><label>Nombre</label><input id="en" maxlength="80" value="${esc(p.name)}"><label>Precio (USD)</label><input id="ep" type="number" min="0" step="0.01" value="${p.price}"><label>Descripción</label><textarea id="ed" rows="4">${esc(p.desc)}</textarea><label>Categoría</label><input id="ec" list="cl2" value="${esc(p.cat||'')}"><datalist id="cl2">${catOpts()}</datalist><label>¿Renovable?</label><select id="er"><option value="1" ${p.ren?'selected':''}>Sí, renovable</option><option value="0" ${p.ren?'':'selected'}>No renovable</option></select><label>Duración (días)</label><input id="edy" type="number" min="1" value="${p.days}"><label>Link de la imagen</label><input id="ei" value="${esc(p.img||'')}">${two(`<button data-a="savep" data-id="${p.id}">Guardar cambios</button>`,cancel)}`;

/* ================= Acciones ================= */
const tab0=A.tab;
Object.assign(A,{
  tab:d=>{RN=30;H2.n=60;tab0(d)},
  decide:async d=>{await decide(d.id,d.ok==='1');toast(d.ok==='1'?'Recarga aprobada':'Recarga rechazada')},
  morer:()=>{RN+=30;paint(true)},
  addp:async()=>{
    await saveProd(null,{name:val('pn'),desc:val('pd'),img:val('pi'),days:parseInt(val('pdays')),cat:val('pc'),ren:val('pr')==='1',price:parseFloat(val('pp'))});
    paint(true);toast('Producto creado. Ahora súbele stock con el botón + Stock');
  },
  editp:d=>modal(editPM(prd(d.id))),
  savep:async d=>{await saveProd(d.id,{name:val('en'),desc:val('ed'),img:val('ei'),days:parseInt(val('edy')),cat:val('ec'),ren:val('er')==='1',price:parseFloat(val('ep'))});closeM();toast('Producto actualizado')},
  delp:async d=>{const p=prd(d.id),n=(S.free[d.id]||[]).length;if(await ask({icon:'trash',title:'¿Eliminar este producto?',html:'<b>'+esc(p?.name||'')+'</b><br>'+(n?'También se eliminarán sus <b>'+n+' cuenta'+(n===1?'':'s')+' disponible'+(n===1?'':'s')+'</b>. ':'')+'Las compras ya realizadas no se borran.',ok:'Eliminar producto'})){await delProd(d.id);closeM();toast('Producto eliminado')}},
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
  isave:async(d,b)=>{
    const row=b.closest('.irow'),g=k=>(row.querySelector('[data-f="'+k+'"]')?.value||'').trim();
    const acc=row.classList.contains('free')?packMsg(g('m')):packAcc([0,1,2,3,4].map(g));
    await saveAcc(d.id,acc);S.sec[d.id]=acc;row.classList.remove('dirty');toast('Cuenta actualizada');
  },
  invall:d=>{S.prods.forEach(p=>{OPEN[p.id]=d.v==='1'});paint(true)},
  bulk:d=>modal(bulkM(prd(d.id))),
  bsave:async d=>{
    const ids=S.free[d.id]||[],lines=val('bk').split('\n').map(x=>x.trim()).filter(Boolean).map(normLine),bad=lines.filter(x=>x===null).length;
    if(bad)return toast('Formato inválido en '+bad+' línea(s). Usa correo|contraseña|perfil|pin|nota, o empieza con @@ para un mensaje libre');
    const del=Math.max(0,ids.length-lines.length),add=Math.max(0,lines.length-ids.length);
    if(del&&!await ask({icon:'trash',title:'¿Eliminar '+del+' cuenta'+(del===1?'':'s')+'?',html:'Quitaste <b>'+del+'</b> línea'+(del===1?'':'s')+' de la lista, así que esas cuentas se eliminarán del inventario.',ok:'Guardar y eliminar'}))return;
    closeM();toast('Guardando…');await bulkSave(d.id,lines);
    toast('Listo: '+Math.min(ids.length,lines.length)+' actualizada(s)'+(add?', '+add+' nueva(s)':'')+(del?', '+del+' eliminada(s)':''));
  },
  clr:async d=>{const p=prd(d.id),ids=[...(S.free[d.id]||[])];if(ids.length&&await ask({icon:'trash',title:'¿Vaciar este producto?',html:(ids.length===1?'Se eliminará la <b>única cuenta disponible</b>':'Se eliminarán las <b>'+ids.length+' cuentas disponibles</b>')+' de <b>'+esc(p.name)+'</b>. Las ya vendidas no se tocan.',ok:'Vaciar producto'})){await clearStock(ids);toast(ids.length+' cuenta(s) eliminadas')}},
  clrall:async()=>{const ids=Object.values(S.free).flat();if(ids.length&&await ask({icon:'trash',title:'Vaciar todo el inventario',html:(ids.length===1?'Se eliminará <b>1 cuenta disponible</b>':'Se eliminarán <b>'+ids.length+' cuentas disponibles</b>')+' de <b>todos los productos</b>. Esta acción no se puede deshacer. Las cuentas ya vendidas no se tocan.',ok:'Vaciar todo',word:'VACIAR'})){await clearStock(ids);toast('Inventario vaciado')}},
  delst:async d=>{if(await ask({icon:'trash',title:'¿Eliminar esta cuenta?',html:'Se quitará del stock disponible y ya no se podrá entregar.',ok:'Eliminar'})){await delStock(d.id);toast('Cuenta eliminada')}},
  /* entregas ya vendidas */
  edito:async d=>{const o=ord(d.id);await fetchSec([o.sid]);modal(editOM(o))},
  saveo:async d=>{const o=ord(d.id),a=readAcc();await saveAcc(o.sid,a);S.sec[o.sid]=a;closeM();paint(true);toast('Entrega actualizada')},
  /* saldo y config */
  balm:d=>modal(balM(S.users.find(u=>u.id===d.id))),
  setbal:async d=>{
    const u=S.users.find(x=>x.id===d.id),z=d.z==='1';
    let v=z?0:parseFloat(($('bamt')?.value||'').replace(',','.'));
    if(!Number.isFinite(v)||v<0)return toast('Ingresa un monto válido');
    v=Math.round(v*100)/100;
    if(d.m==='add'&&v<0.1)return toast('El monto mínimo para agregar es $0.10');
    if(d.m==='add'&&v>100000)return toast('Monto demasiado alto');
    if(z&&!await ask({title:'¿Poner el saldo en $0.00?',html:'El saldo de <b>'+esc(u.email)+'</b> pasará de <b>'+usd(u.balance)+'</b> a <b>$0.00</b>. Quedará registrado en el historial de ajustes.',ok:'Poner en $0.00'}))return;
    await setBal(u,d.m,v);closeM();toast(d.m==='add'?'Saldo agregado: +'+usd(v):'Saldo establecido en '+usd(v));
  },
  savewa:async()=>{await saveWa(val('sw').replace(/\D/g,''));toast('Configuración guardada')},
  /* historial de entregas */
  hp:d=>{H2.p=d.v;H2.n=60;paint(true)},
  hs:d=>{H2.s=d.v;H2.n=60;paint(true)},
  more:()=>{H2.n+=60;paint(true)},
  csv:()=>{
    const q=v=>typeof v==='string'?'"'+v.replace(/^[=+\-@]/,"'$&").replace(/"/g,'""')+'"':v;
    const rows=[['Fecha','Producto','Comprador','Cuenta entregada','Cliente final','WhatsApp cliente','Estado','Monto USD'],...hist().map(csvRow)];
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    a.download='entregas-cbd-'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  },
});
const sw=(a,b)=>v=>{$(a).style.display=v==='free'?'none':'';$(b).style.display=v==='free'?'':'none'};
Object.assign(I,{am:sw('am_acc','am_free'),emd:sw('em_acc','em_free')});
document.addEventListener('input',e=>{e.target.closest?.('.irow')?.classList.add('dirty')});
H.paint=shellPaint;
start('admincdb');

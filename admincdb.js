import * as K from './core.js';
const {S,A,I,P,H,$,esc,usd,sol,money,ms,fd,period,vig,uname,wa9,parseAcc,PAY,toast,modal,closeM,err,db,root,R,arr,by,denied,fetchSec,set,update,push,get,increment,serverTimestamp,paint,shellPaint,start,LOGO,BURG,who,stk,em,buyer,srch,has,pimg,accMsg,two,cancel,eye,flt,cards,catBar,catOpts,ordList,recRow,ST,prodM,ordM,ord,prd,val,openWa,copy,login,register,userIssue,MIN}=K;

/* ---- administrador ---- */
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
async function setBal(u,mode,v){
  const base=Number(u.balance)||0,nv=mode==='add'?Math.round((base+v)*100)/100:v,x={};
  x['users/'+u.id+'/balance']=mode==='add'?increment(v):v;
  x['balanceLogs/'+push(R('balanceLogs')).key]={uid:u.id,by:S.me.uid,mode,amount:v,before:base,after:nv,createdAt:serverTimestamp()};
  await update(root,x);
}
const saveWa=wa=>set(R('settings/wa'),wa);
/* ---- admin ---- */
const prodList=()=>{const l=S.prods.filter(p=>has([p.name,p.cat,p.desc],S.q));return l.length?l.map(p=>`<div class="card" style="margin-bottom:10px">${pimg(p,'sm')}<div class="row" style="border:0;padding:0"><b>${esc(p.name)} · ${money(p.price)} · ${p.days} días · ${p.ren?'Renovable':'No renovable'}${p.cat?' · '+esc(p.cat):''}</b><span><span class="tag">Stock ${stk(p)}</span> <button class="ghost" data-a="editp" data-id="${p.id}">Editar</button> <button class="no" data-a="delp" data-id="${p.id}">Eliminar</button></span></div><label>Subir stock: una cuenta por línea con el formato correo|contraseña|perfil|pin</label><textarea id="st_${p.id}" rows="3" placeholder="correo@mail.com|clave123|Perfil 1|1234"></textarea><button class="ghost" data-a="adds" data-id="${p.id}">Agregar cuentas</button></div>`).join(''):'<p class="mu">Crea tu primer producto arriba.</p>'};
const salesList=()=>{const o=S.orders.filter(x=>has([x.pname,x.cname,buyer(x.uid).name,buyer(x.uid).email,em(x)],S.q));return o.length?o.map(x=>`<div class="row"><span>${esc(x.pname)}<br><small class="mu">Comprador: ${esc(uname(buyer(x.uid)))} · ${esc(buyer(x.uid).email||'—')}<br>${period(x)}</small> ${vig(x)}</span><span style="display:flex;gap:6px;align-items:center"><b>${money(x.price)}</b><button class="ghost" data-a="show" data-id="${x.id}">Ver</button><button class="ghost" data-a="edito" data-id="${x.id}">Editar</button></span></div>`).join(''):'<p class="mu">Todavía no hay ventas.</p>'};
const pendV=()=>{const p=S.rech.filter(r=>r.status==='pend'),h=S.rech.filter(r=>r.status!=='pend');return `<div class="sec"><h3>Recargas pendientes (${p.length})</h3>${p.length?p.map(r=>recRow(r,`<span style="display:flex;gap:6px"><button class="ok" data-a="decide" data-id="${r.id}" data-ok="1">Aceptar</button><button class="no" data-a="decide" data-id="${r.id}" data-ok="0">Rechazar</button></span>`)).join(''):'<p class="mu">No hay recargas por revisar.</p>'}</div><div class="sec"><h3>Historial de recargas</h3>${h.length?h.map(r=>recRow(r,`<span class="tag ${r.status}">${ST[r.status]}</span>`)).join(''):'<p class="mu">Sin movimientos todavía.</p>'}</div>`};
const prodV=()=>`<div class="sec card"><h3>Crear producto</h3><div class="two"><div><label>Nombre</label><input id="pn" maxlength="80"></div><div><label>Precio (USD)</label><input id="pp" type="number" min="0" step="0.01"></div></div><label>Descripción</label><textarea id="pd" rows="3"></textarea><div class="two"><div><label>Categoría</label><input id="pc" list="cl" placeholder="Streaming, Música…"><datalist id="cl">${catOpts()}</datalist></div><div><label>¿Renovable?</label><select id="pr"><option value="1">Sí, renovable</option><option value="0">No renovable</option></select></div></div><div class="two"><div><label>Duración (días)</label><input id="pdays" type="number" min="1" value="30"></div><div><label>Link de la imagen (opcional)</label><input id="pi" placeholder="https://..."></div></div><button data-a="addp">Crear producto</button></div><div class="sec"><h3>Productos y stock (${S.prods.length})</h3>${srch('Buscar producto o categoría…')}<div id="lst">${prodList()}</div></div>`;
const cliV=()=>{const c=S.users.filter(u=>u.id!==S.me.uid);return `<div class="sec"><h3>Clientes (${c.length})</h3>${c.length?c.map(u=>`<div class="row"><span><b>${esc(uname(u))}</b> · ${esc(u.email)}${S.users.filter(x=>String(x.email).toLowerCase()===String(u.email).toLowerCase()).length>1?' <span class="tag no">Correo repetido</span>':''}<br><small class="mu">Saldo: ${money(u.balance)}</small></span><button class="ghost" data-a="balm" data-id="${u.id}">Gestionar saldo</button></div>`).join(''):'<p class="mu">Aún no hay clientes registrados.</p>'}</div>`};
const salesV=()=>`<div class="sec"><h3>Historial de compras (${S.orders.length})</h3>${srch('Buscar por correo, nombre o producto…')}<p class="mu">Total vendido: <b>${money(S.orders.reduce((s,x)=>s+x.price,0))}</b></p><div id="lst">${salesList()}</div></div>`;
const confV=()=>`<div class="sec card"><h3>Configuración</h3><label>WhatsApp del soporte (con código de país, por ejemplo 51999999999)</label><input id="sw" value="${esc(S.wa)}"><button data-a="savewa" style="margin-top:10px">Guardar configuración</button></div>`;
P.views={catalog:()=>catBar()+`<div id="lst">${cards(flt())}</div>`,pend:pendV,prod:prodV,cli:cliV,sales:salesV,conf:confV};
P.lst={catalog:()=>cards(flt()),prod:prodList,sales:salesList};
P.tabs=()=>[['pend','Recargas'],['prod','Productos'],['cli','Clientes'],['sales','Ventas'],['conf','Config'],['catalog','Catálogo']];
const editOM=o=>{const p=(S.sec[o.sid]||'').split('|'),g=i=>esc((p[i]||'').trim());return `<h3>Editar entrega</h3><p class="mu">${esc(o.pname)}. El cliente verá los datos actualizados.</p><label>Correo</label><input id="e0" value="${g(0)}"><label>Contraseña</label><input id="e1" value="${g(1)}"><div class="two"><div><label>Perfil</label><input id="e2" value="${g(2)}"></div><div><label>PIN</label><input id="e3" value="${g(3)}"></div></div>${two(`<button data-a="saveo" data-id="${o.id}">Guardar cambios</button>`,cancel)}`};
const balM=u=>`<h3>Saldo del cliente</h3><p>${esc(u.email)}<br><b>Actual: ${money(u.balance)}</b></p><label>Monto (USD)</label><input id="bm" type="number" min="0" step="0.01">${two(`<button class="ok" data-a="setbal" data-id="${u.id}" data-m="add">Agregar</button>`,`<button data-a="setbal" data-id="${u.id}" data-m="set">Establecer saldo</button>`)}<button class="ghost" style="width:100%;margin-top:8px" data-a="closeM">Cancelar</button>`;
const editPM=p=>`<h3>Editar producto</h3><label>Nombre</label><input id="en" maxlength="80" value="${esc(p.name)}"><label>Precio (USD)</label><input id="ep" type="number" min="0" step="0.01" value="${p.price}"><label>Descripción</label><textarea id="ed" rows="4">${esc(p.desc)}</textarea><label>Categoría</label><input id="ec" list="cl2" value="${esc(p.cat||'')}"><datalist id="cl2">${catOpts()}</datalist><label>¿Renovable?</label><select id="er"><option value="1" ${p.ren?'selected':''}>Sí, renovable</option><option value="0" ${p.ren?'':'selected'}>No renovable</option></select><label>Duración (días)</label><input id="edy" type="number" min="1" value="${p.days}"><label>Link de la imagen</label><input id="ei" value="${esc(p.img||'')}">${two(`<button data-a="savep" data-id="${p.id}">Guardar cambios</button>`,cancel)}`;
Object.assign(A,{
  decide:async d=>{await decide(d.id,d.ok==='1');toast(d.ok==='1'?'Recarga aprobada':'Recarga rechazada')},
  addp:async()=>{
    await saveProd(null,{name:val('pn'),desc:val('pd'),img:val('pi'),days:parseInt(val('pdays')),cat:val('pc'),ren:val('pr')==='1',price:parseFloat(val('pp'))});
    paint(true);toast('Producto creado. Ahora sube su stock en la lista de abajo');
  },
  editp:d=>modal(editPM(prd(d.id))),
  savep:async d=>{await saveProd(d.id,{name:val('en'),desc:val('ed'),img:val('ei'),days:parseInt(val('edy')),cat:val('ec'),ren:val('er')==='1',price:parseFloat(val('ep'))});closeM();toast('Producto actualizado')},
  delp:async d=>{if(confirm('¿Eliminar este producto y su stock disponible? Las compras ya realizadas no se borran.')){await delProd(d.id);closeM();toast('Producto eliminado')}},
  adds:async d=>{
    const all=val('st_'+d.id).split('\n').map(x=>x.trim()).filter(Boolean),ok=all.filter(l=>{const q=l.split('|');return q.length===4&&q[0].trim()&&q[1].trim()&&l.length<=400});
    if(!all.length)return toast('Pega al menos una cuenta');
    if(ok.length!==all.length)return toast('Formato inválido en '+(all.length-ok.length)+' línea(s). Usa correo|contraseña|perfil|pin');
    toast('Subiendo '+ok.length+' cuentas…');await addStock(d.id,ok.map(l=>l.split('|').map(x=>x.trim()).join('|')));$('st_'+d.id).value='';toast(ok.length+' cuentas agregadas');
  },
  edito:async d=>{const o=ord(d.id);await fetchSec([o.sid]);modal(editOM(o))},
  saveo:async d=>{
    const o=ord(d.id),v=[0,1,2,3].map(i=>val('e'+i));
    if(!v[0]||!v[1])return toast('El correo y la contraseña son obligatorios');
    if(v.some(x=>x.includes('|')))return toast('No uses el símbolo | en los datos');
    await saveAcc(o.sid,v.join('|'));S.sec[o.sid]=v.join('|');closeM();paint(true);toast('Entrega actualizada');
  },
  balm:d=>modal(balM(S.users.find(u=>u.id===d.id))),
  setbal:async d=>{const v=parseFloat($('bm').value);if(!(v>=0))return toast('Ingresa un monto válido');await setBal(S.users.find(u=>u.id===d.id),d.m,v);closeM();toast('Saldo actualizado')},
  savewa:async()=>{await saveWa(val('sw').replace(/\D/g,''));toast('Configuración guardada')}
});
H.paint=shellPaint;
start('admincdb');

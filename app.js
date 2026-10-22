import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getDatabase,ref,onValue,get,set,update,push,query,orderByChild,equalTo,serverTimestamp,increment} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* ===== Núcleo ===== */
const S={me:null,adm:false,ready:false,bal:0,name:'',prods:[],free:{},orders:[],rech:[],users:[],sec:{},wa:'',tab:'catalog',view:'home',mode:'login',pm:'yape',q:'',cat:''};
const A={},I={};
const RATE=3.4,MIN=1;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const usd=n=>'$'+Number(n||0).toFixed(2);
const sol=n=>'S/ '+(Number(n||0)*RATE).toFixed(2);
const money=n=>`${usd(n)} <small class="mu">(${sol(n)})</small>`;
const ms=t=>typeof t==='number'?t:Date.now();
const fd=t=>new Date(t).toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'});
const endOf=o=>ms(o.createdAt)+(o.days||30)*864e5;
const left=o=>Math.ceil((endOf(o)-Date.now())/864e5);
const period=o=>`Del ${fd(ms(o.createdAt))} al ${fd(endOf(o))}`;
const vig=o=>left(o)>0?`<span class="tag ok">Vigente · ${left(o)} día${left(o)===1?'':'s'}</span>`:'<span class="tag no">Vencido</span>';
const uname=u=>u?.name||u?.email?.split('@')[0]||'—';
const wa9=v=>{v=String(v||'').replace(/\D/g,'');return v.length===9?'51'+v:v};
const parseAcc=a=>{const p=String(a||'').split('|').map(x=>x.trim());return p.length<2?[['Cuenta',a||'(cargando…)']]:['Correo','Contraseña','Perfil','PIN'].map((l,i)=>[l,p[i]]).filter(x=>x[1])};
const PAY={yape:{n:'Yape',rows:[['Número','965730677'],['Nombre','Cristhian Eddy C. A.']],qr:'yaqr.jpeg',note:'Paga el equivalente en soles.'},bin:{n:'Binance Pay',rows:[['ID de usuario','1250169311'],['Nombre','CRB TECH SHP']],qr:'binqr.jpeg',note:'Paga el monto en dólares (USDT).'}};
function toast(t,d=2800){const e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',d)}
const modal=h=>{$('mbox').innerHTML=h;$('modal').classList.add('on')};
const closeM=()=>$('modal').classList.remove('on');
const MSG={'auth/invalid-credential':'Correo o contraseña incorrectos','auth/invalid-login-credentials':'Correo o contraseña incorrectos','auth/email-already-in-use':'Ese correo ya está registrado','auth/weak-password':'Contraseña muy débil (mínimo 6)','auth/invalid-email':'Correo inválido','auth/operation-not-allowed':'Activa Correo/Contraseña en Firebase → Authentication → Método de acceso','auth/network-request-failed':'Sin conexión con Firebase','auth/invalid-api-key':'La API key de Firebase no es válida','auth/unauthorized-domain':'Agrega tu dominio en Authentication → Configuración → Dominios autorizados','auth/too-many-requests':'Demasiados intentos, espera un momento','permission-denied':'Firebase rechazó la operación. Revisa que las reglas estén publicadas y que el usuario tenga sus datos completos (email, role, balance)'};
const err=e=>typeof e==='string'?e:(MSG[e?.code]||((e?.code||'').startsWith('auth/requests-from-referer')?'La API key bloquea este dominio: agrégalo en Google Cloud → Credenciales → Referentes HTTP':(e?.message||'Error inesperado')));

/* ===== Firebase: Auth + Realtime Database ===== */
const app=initializeApp({
  apiKey:"AIzaSyD88UxvoC-0QW3Pjd1fAFb7Maqi58JCOAk",
  authDomain:"cbd-streaming-shop.firebaseapp.com",
  databaseURL:"https://cbd-streaming-shop-default-rtdb.firebaseio.com",
  projectId:"cbd-streaming-shop",
  storageBucket:"cbd-streaming-shop.firebasestorage.app",
  messagingSenderId:"734290065810",
  appId:"1:734290065810:web:7ec275e906d7704f52a94b"
});
const auth=getAuth(app),db=getDatabase(app),root=ref(db),R=p=>ref(db,p);
let subs=[];
const on=(q,f)=>subs.push(onValue(q,f,e=>{console.warn('RTDB:',e.code||e.message);if(S.me)toast('Base de datos: sin permiso. Revisa que las reglas estén publicadas')}));
const arr=s=>{const r=[];s.forEach(c=>{r.push({id:c.key,...c.val()})});return r};
const by=a=>a.sort((x,y)=>ms(y.createdAt)-ms(x.createdAt));
const denied=e=>/permission/i.test(e?.code||e?.message||'');
function pub(r){
  onValue(R('products'),s=>{S.prods=arr(s);r()},()=>{});
  onValue(R('settings/wa'),s=>{S.wa=s.val()||'';r()},()=>{});
}
const unlisten=()=>{subs.splice(0).forEach(f=>f())};
function priv(r){
  const u=S.me.uid,c=n=>S.adm?R(n):query(R(n),orderByChild('uid'),equalTo(u));
  on(R('users/'+u),s=>{const d=s.val()||{};S.ud=d;S.bal=Number(d.balance)||0;S.name=d.name||'';r()});
  on(query(R('stock'),orderByChild('sold'),equalTo(false)),s=>{S.free={};s.forEach(x=>{(S.free[x.val().pid]??=[]).push(x.key)});r()});
  on(c('orders'),s=>{S.orders=by(arr(s));r();if(!S.adm)fetchSec(S.orders.slice(0,40).map(o=>o.sid)).then(r)});
  on(c('recharges'),s=>{S.rech=by(arr(s));r()});
  if(S.adm){
    on(R('users'),s=>{S.users=arr(s);r()});
    on(R('secrets'),s=>{S.sec={};s.forEach(x=>{S.sec[x.key]=x.val()});r()});
  }
}
async function fetchSec(ids){
  await Promise.all(ids.filter(i=>i&&!(i in S.sec)).map(async i=>{try{S.sec[i]=(await get(R('secrets/'+i))).val()||''}catch{}}));
}
/* ---- autenticación ---- */
const login=(e,p)=>signInWithEmailAndPassword(auth,e,p);
const logout=()=>signOut(auth);
async function register(name,e,p){
  const c=await createUserWithEmailAndPassword(auth,e,p);
  await set(R('users/'+c.user.uid),{name,email:c.user.email,role:'client',balance:0,createdAt:serverTimestamp()});
}
/* El rol se lee de users/<uid>/role (las reglas permiten leer tu propio nodo) */
const isAdmin=async u=>{try{return (await get(R('users/'+u.uid+'/role'))).val()==='admin'}catch{return false}};
/* ---- cliente ---- */
async function buy(p,cname,cwa){
  const ids=[...(S.free[p.id]||[])],u=S.me.uid;
  if(!ids.length)throw 'Producto sin stock';
  if(S.bal<p.price)throw 'Saldo insuficiente. Recarga para continuar';
  const bad=userIssue(S.ud);if(bad)throw 'Tu cuenta tiene un problema: '+bad+'. Contacta al soporte.';
  for(let t=0;t<3&&ids.length;t++){
    const sid=ids.splice(Math.random()*ids.length|0,1)[0],oid=push(R('orders')).key,x={};
    x['orders/'+oid]={uid:u,pid:p.id,sid,pname:p.name,price:p.price,days:p.days,ren:p.ren,img:p.img||'',cname,cwa,createdAt:serverTimestamp()};
    x['stock/'+sid+'/sold']=true;x['stock/'+sid+'/buyer']=u;x['stock/'+sid+'/order']=oid;
    x['users/'+u+'/balance']=increment(-p.price);x['users/'+u+'/lastOrder']=oid;
    try{await update(root,x);await fetchSec([sid]);return {oid,sid}}catch(e){if(!denied(e))throw e}
  }
  throw 'No se pudo completar la compra. Si se repite, avisa al soporte: el stock pudo agotarse o falta publicar las reglas.';
}
/* Detecta datos de usuario que las reglas rechazan (saldo como texto, campos faltantes) */
function userIssue(u){
  if(!u||typeof u!=='object')return 'el usuario no existe en la base de datos';
  const miss=['email','role','balance'].filter(k=>u[k]===undefined||u[k]===null);
  if(miss.length)return 'le falta el dato '+miss.join(', ');
  if(typeof u.balance!=='number')return 'el saldo está guardado como texto ("'+u.balance+'")';
  return '';
}
const saveCli=(id,cn,cw)=>update(root,{['orders/'+id+'/cname']:cn,['orders/'+id+'/cwa']:cw});
const recharge=(amount,rf)=>set(R('recharges/'+S.pm+'_'+rf),{uid:S.me.uid,email:S.me.email,amount,method:S.pm,ref:rf,status:'pend',createdAt:serverTimestamp()})
  .catch(e=>{throw denied(e)?'Ese número de operación ya fue registrado o los datos no son válidos':e});
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

/* ===== Vistas ===== */
let shell=null;
const ST={pend:'Pendiente',ok:'Aprobada',no:'Rechazada'};
const LOGO=`<span class="logo"><img src="logo.jpeg" alt="CBD STREAMING SHOP" onerror="this.parentNode.innerHTML='<b>CBD STREAMING</b> <span>SHOP</span>'"></span>`;
const BURG='<button class="burger" data-a="tg" aria-label="Menú"><svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></button>';
const who=()=>S.adm?'Administrador':uname({name:S.name,email:S.me?.email});
const stk=p=>(S.free[p.id]||[]).length;
const em=o=>(S.sec[o.sid]||'').split('|')[0];
const buyer=id=>S.users.find(u=>u.id===id)||{};
const srch=ph=>`<input class="srch" data-i="q" placeholder="${ph}" value="${esc(S.q)}">`;
const has=(arr,q)=>!q||arr.join(' ').toLowerCase().includes(q.toLowerCase());
const pimg=(p,c='')=>`<div class="pw ${c}"><div class="ph">${esc((p.name||'?').trim()[0]||'?')}</div>${p.img?`<img src="${esc(p.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:''}</div>`;
const accMsg=o=>'*'+o.pname+'*\n'+parseAcc(S.sec[o.sid]).map(x=>x[0]+': '+x[1]).join('\n')+'\nVigencia: '+period(o)+' ('+o.days+' días, '+(o.ren?'renovable':'no renovable')+')\n\n¡Gracias por tu compra en CBD STREAMING SHOP!';
const two=(a,b)=>`<div class="two">${a}${b}</div>`;
const cancel='<button class="ghost" data-a="closeM">Cancelar</button>';
const eye=id=>`<button class="ghost eye" data-a="prod" data-id="${id}" title="Ver descripción completa" aria-label="Ver descripción completa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg></button>`;
/* ---- catálogo ---- */
const flt=()=>S.prods.filter(p=>(!S.cat||p.cat===S.cat)&&has([p.name,p.desc,p.cat],S.q));
const cards=l=>l.length?`<div class="grid">${l.map(p=>`<div class="card pc" style="cursor:pointer" data-a="prod" data-id="${p.id}">${pimg(p)}${p.cat?`<span class="tag">${esc(p.cat)}</span>`:''}<h3>${esc(p.name)}</h3><small>${esc(p.desc)}</small><div class="p">${money(p.price)}</div><div class="meta"><span>⏱ ${p.days} días</span><span>${p.ren?'Renovable':'No renovable'}</span><span>Stock ${stk(p)}</span></div>${S.adm?`<div class="bar"><button class="ghost" data-a="editp" data-id="${p.id}">Editar</button><button class="no" data-a="delp" data-id="${p.id}">Eliminar</button>${eye(p.id)}</div>`:`<div class="bar"><button ${stk(p)?'':'disabled'} data-a="buy" data-id="${p.id}">${stk(p)?'Comprar':'Agotado'}</button>${eye(p.id)}</div>`}</div>`).join('')}</div>`:'<p class="mu">No hay productos para mostrar.</p>';
const catBar=()=>`<div class="cbar">${srch('Buscar producto…')}<div class="chips2"><button class="${S.cat?'ghost':''}" data-a="cat" data-v="">Todas</button>${[...new Set(S.prods.map(p=>p.cat).filter(Boolean))].map(c=>`<button class="${S.cat===c?'':'ghost'}" data-a="cat" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>`;
const catOpts=()=>[...new Set(S.prods.map(p=>p.cat).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join('');
/* ---- compras / recargas ---- */
const ordList=()=>{const o=S.orders.filter(x=>has([x.pname,x.cname,x.cwa,em(x)],S.q));return o.length?o.map(x=>`<div class="ord"><span class="av ${x.cname?'':'na'}">${x.cname?esc(x.cname.trim()[0].toUpperCase()):'?'}</span><div class="oi"><div class="cn">${x.cname?esc(x.cname):'<i class="mu">Sin nombre de cliente</i>'}</div><div>${esc(x.pname)} · <small class="mu">${money(x.price)}</small></div><small class="mu">${esc(em(x))}${x.cwa?' · '+esc(x.cwa):''}<br>${period(x)}</small> ${vig(x)}</div><span class="oa"><button class="ghost" data-a="show" data-id="${x.id}">Ver cuenta</button><button data-a="cli" data-id="${x.id}">${x.cname?'Editar cliente':'Agregar cliente'}</button></span></div>`).join(''):'<p class="mu">Todavía no compraste nada.</p>'};
const recRow=(r,btn)=>`<div class="row"><span>${esc(r.email)}<br><small class="mu">${PAY[r.method]?.n} · ${money(r.amount)} · op. ${esc(r.ref)} · ${fd(ms(r.createdAt))}</small></span>${btn}</div>`;
/* ---- admin ---- */
const prodList=()=>{const l=S.prods.filter(p=>has([p.name,p.cat,p.desc],S.q));return l.length?l.map(p=>`<div class="card" style="margin-bottom:10px">${pimg(p,'sm')}<div class="row" style="border:0;padding:0"><b>${esc(p.name)} · ${money(p.price)} · ${p.days} días · ${p.ren?'Renovable':'No renovable'}${p.cat?' · '+esc(p.cat):''}</b><span><span class="tag">Stock ${stk(p)}</span> <button class="ghost" data-a="editp" data-id="${p.id}">Editar</button> <button class="no" data-a="delp" data-id="${p.id}">Eliminar</button></span></div><label>Subir stock: una cuenta por línea con el formato correo|contraseña|perfil|pin</label><textarea id="st_${p.id}" rows="3" placeholder="correo@mail.com|clave123|Perfil 1|1234"></textarea><button class="ghost" data-a="adds" data-id="${p.id}">Agregar cuentas</button></div>`).join(''):'<p class="mu">Crea tu primer producto arriba.</p>'};
const salesList=()=>{const o=S.orders.filter(x=>has([x.pname,x.cname,buyer(x.uid).name,buyer(x.uid).email,em(x)],S.q));return o.length?o.map(x=>`<div class="row"><span>${esc(x.pname)}<br><small class="mu">Comprador: ${esc(uname(buyer(x.uid)))} · ${esc(buyer(x.uid).email||'—')}<br>${period(x)}</small> ${vig(x)}</span><span style="display:flex;gap:6px;align-items:center"><b>${money(x.price)}</b><button class="ghost" data-a="show" data-id="${x.id}">Ver</button><button class="ghost" data-a="edito" data-id="${x.id}">Editar</button></span></div>`).join(''):'<p class="mu">Todavía no hay ventas.</p>'};
const pendV=()=>{const p=S.rech.filter(r=>r.status==='pend'),h=S.rech.filter(r=>r.status!=='pend');return `<div class="sec"><h3>Recargas pendientes (${p.length})</h3>${p.length?p.map(r=>recRow(r,`<span style="display:flex;gap:6px"><button class="ok" data-a="decide" data-id="${r.id}" data-ok="1">Aceptar</button><button class="no" data-a="decide" data-id="${r.id}" data-ok="0">Rechazar</button></span>`)).join(''):'<p class="mu">No hay recargas por revisar.</p>'}</div><div class="sec"><h3>Historial de recargas</h3>${h.length?h.map(r=>recRow(r,`<span class="tag ${r.status}">${ST[r.status]}</span>`)).join(''):'<p class="mu">Sin movimientos todavía.</p>'}</div>`};
const prodV=()=>`<div class="sec card"><h3>Crear producto</h3><div class="two"><div><label>Nombre</label><input id="pn" maxlength="80"></div><div><label>Precio (USD)</label><input id="pp" type="number" min="0" step="0.01"></div></div><label>Descripción</label><textarea id="pd" rows="3"></textarea><div class="two"><div><label>Categoría</label><input id="pc" list="cl" placeholder="Streaming, Música…"><datalist id="cl">${catOpts()}</datalist></div><div><label>¿Renovable?</label><select id="pr"><option value="1">Sí, renovable</option><option value="0">No renovable</option></select></div></div><div class="two"><div><label>Duración (días)</label><input id="pdays" type="number" min="1" value="30"></div><div><label>Link de la imagen (opcional)</label><input id="pi" placeholder="https://..."></div></div><button data-a="addp">Crear producto</button></div><div class="sec"><h3>Productos y stock (${S.prods.length})</h3>${srch('Buscar producto o categoría…')}<div id="lst">${prodList()}</div></div>`;
const cliV=()=>{const c=S.users.filter(u=>u.id!==S.me.uid);return `<div class="sec"><h3>Clientes (${c.length})</h3>${c.length?c.map(u=>`<div class="row"><span><b>${esc(uname(u))}</b> · ${esc(u.email)}<br><small class="mu">Saldo: ${money(u.balance)}</small></span><button class="ghost" data-a="balm" data-id="${u.id}">Gestionar saldo</button></div>`).join(''):'<p class="mu">Aún no hay clientes registrados.</p>'}</div>`};
const salesV=()=>`<div class="sec"><h3>Historial de compras (${S.orders.length})</h3>${srch('Buscar por correo, nombre o producto…')}<p class="mu">Total vendido: <b>${money(S.orders.reduce((s,x)=>s+x.price,0))}</b></p><div id="lst">${salesList()}</div></div>`;
const confV=()=>`<div class="sec card"><h3>Configuración</h3><label>WhatsApp del soporte (con código de país, por ejemplo 51999999999)</label><input id="sw" value="${esc(S.wa)}"><button data-a="savewa" style="margin-top:10px">Guardar configuración</button></div>`;
const VIEWS={catalog:()=>catBar()+`<div id="lst">${cards(flt())}</div>`,mine:()=>`<div class="sec"><h3>Mis compras (${S.orders.length})</h3>${srch('Buscar por correo o nombre del cliente…')}<div id="lst">${ordList()}</div></div>`,rec:()=>`<div class="sec"><h3>Mis recargas</h3>${S.rech.length?S.rech.map(x=>recRow(x,`<span class="tag ${x.status}">${ST[x.status]}</span>`)).join(''):'<p class="mu">Sin recargas.</p>'}</div>`,pend:pendV,prod:prodV,cli:cliV,sales:salesV,conf:confV};
const LST={catalog:()=>cards(flt()),mine:ordList,prod:prodList,sales:salesList};
const TABS=()=>S.adm?[['pend','Recargas'],['prod','Productos'],['cli','Clientes'],['sales','Ventas'],['conf','Config'],['catalog','Catálogo']]:[['catalog','Catálogo'],['mine','Mis compras'],['rec','Mis recargas']];
/* ---- modales ---- */
const prodM=p=>`${pimg(p,'big')}<h2 style="font-size:20px;margin:14px 0 6px">${esc(p.name)}</h2>${p.cat?`<span class="tag">${esc(p.cat)}</span>`:''}<div class="p big">${money(p.price)}</div><div class="meta" style="margin:8px 0"><span>⏱ ${p.days} días</span><span>${p.ren?'Renovable':'No renovable'}</span><span>Stock ${stk(p)}</span></div><p class="desc">${esc(p.desc)||'Sin descripción.'}</p>${two(S.me&&!S.adm?`<button ${stk(p)?'':'disabled'} data-a="buy" data-id="${p.id}">${stk(p)?'Comprar':'Agotado'}</button>`:(S.adm?`<button class="no" data-a="delp" data-id="${p.id}">Eliminar producto</button>`:''),'<button class="ghost" data-a="closeM">Cerrar</button>')}`;
const buyM=p=>`<h3>Confirmar compra</h3>${pimg(p)}<p style="margin-top:10px">${esc(p.name)}<br><small class="mu">${p.days} días · ${p.ren?'Renovable':'No renovable'}</small><br><b>${money(p.price)}</b></p><label>Nombre del cliente (opcional, lo puedes agregar después)</label><input id="cn" maxlength="40" placeholder="Para quién es esta compra"><label>WhatsApp del cliente (opcional)</label><input id="cw" inputmode="tel" maxlength="20" placeholder="51999999999">${two(`<button data-a="cbuy" data-id="${p.id}">Comprar</button>`,cancel)}`;
const ordM=o=>{const f=parseAcc(S.sec[o.sid]);return `<div style="text-align:center"><div class="ck">✓</div><h3>${S.adm?'Datos entregados':'¡Compra exitosa!'}</h3></div><div class="dprod dp2">${pimg({name:o.pname,img:o.img},'sm2')}<div><b>${esc(o.pname)}</b><br><small class="mu">${period(o)} · ${o.ren?'Renovable':'No renovable'}</small><br>${vig(o)}</div></div>${f.map(x=>`<div class="fld"><div><small class="mu">${x[0]}</small><div class="fv">${esc(x[1])}</div></div>${S.adm?'':`<button class="ghost" data-a="copy" data-t="${esc(x[1])}">Copiar</button>`}</div>`).join('')}<p class="mu" style="font-size:12px;margin:12px 0">No cambies la contraseña ni el PIN y usa solo tu perfil asignado. Si tienes algún problema, escríbenos por soporte.</p>${S.adm?'':`<button class="ghost" style="width:100%;margin-bottom:8px" data-a="copyall" data-id="${o.id}">Copiar todo</button><div class="wbox"><label>WhatsApp del cliente (con código de país)</label><input id="wn" inputmode="tel" value="${esc(o.cwa||'')}" placeholder="51999999999"><button style="width:100%" data-a="sendcli" data-id="${o.id}">Enviar por WhatsApp</button></div>`}<button style="width:100%;margin-top:8px" data-a="closeM">Entendido</button>`};
const cliM=o=>`<h3>Datos del cliente</h3><p class="mu">${esc(o.pname)}</p><label>Nombre del cliente</label><input id="cn2" maxlength="40" value="${esc(o.cname||'')}"><label>WhatsApp del cliente (opcional)</label><input id="cw2" inputmode="tel" maxlength="20" value="${esc(o.cwa||'')}" placeholder="51999999999">${two(`<button data-a="scli" data-id="${o.id}">Guardar</button>`,cancel)}`;
const payHTML=k=>{const p=PAY[k];return `<div class="qrb"><div class="qrph"><b>QR de ${p.n}</b><small>${p.qr}</small></div><img src="${p.qr}" alt="QR ${p.n}" onerror="this.remove()"></div><div class="cred" style="white-space:normal">${p.rows.map((r,i)=>`<div class="fld" style="margin:0 0 6px"><div><small class="mu">${r[0]}</small><div class="fv">${r[1]}</div></div>${i===0?`<button class="ghost" data-a="copy" data-t="${r[1]}">Copiar</button>`:''}</div>`).join('')}</div><p class="mu" style="text-align:center">${p.note}</p>`};
const rechM=()=>`<h3>Recargar saldo</h3><div class="tabs" style="margin:8px 0"><button id="my" data-a="pm" data-k="yape">Yape</button><button id="mb" class="ghost" data-a="pm" data-k="bin">Binance</button></div><div id="pinfo">${payHTML('yape')}</div><p class="mu">Realiza el pago y envía los datos. El administrador acreditará tu saldo al confirmarlo.</p><label>Monto a recargar (USD, mínimo $1)</label><input id="ra" type="number" min="1" step="0.01" data-i="ra"><p class="mu" style="margin:-4px 0 8px">Equivale a <b id="rs">S/ 0.00</b> (cambio 3.40)</p><label>Número de operación</label><input id="rr" maxlength="40"><div style="display:flex;gap:8px"><button data-a="srech">Enviar solicitud</button><button class="ghost" data-a="closeM">Cerrar</button></div>`;
const sentM=m=>`<h3>Solicitud registrada</h3><p class="mu">Tu recarga quedó pendiente. Envía este aviso al administrador por WhatsApp para que la apruebe más rápido.</p><div class="cred">${esc(m)}</div>${two('<button data-a="wasend">Enviar por WhatsApp</button>','<button class="ghost" data-a="closeM">Cerrar</button>')}`;
const editOM=o=>{const p=(S.sec[o.sid]||'').split('|'),g=i=>esc((p[i]||'').trim());return `<h3>Editar entrega</h3><p class="mu">${esc(o.pname)}. El cliente verá los datos actualizados.</p><label>Correo</label><input id="e0" value="${g(0)}"><label>Contraseña</label><input id="e1" value="${g(1)}"><div class="two"><div><label>Perfil</label><input id="e2" value="${g(2)}"></div><div><label>PIN</label><input id="e3" value="${g(3)}"></div></div>${two(`<button data-a="saveo" data-id="${o.id}">Guardar cambios</button>`,cancel)}`};
const balM=u=>`<h3>Saldo del cliente</h3><p>${esc(u.email)}<br><b>Actual: ${money(u.balance)}</b></p><label>Monto (USD)</label><input id="bm" type="number" min="0" step="0.01">${two(`<button class="ok" data-a="setbal" data-id="${u.id}" data-m="add">Agregar</button>`,`<button data-a="setbal" data-id="${u.id}" data-m="set">Establecer saldo</button>`)}<button class="ghost" style="width:100%;margin-top:8px" data-a="closeM">Cancelar</button>`;
const editPM=p=>`<h3>Editar producto</h3><label>Nombre</label><input id="en" maxlength="80" value="${esc(p.name)}"><label>Precio (USD)</label><input id="ep" type="number" min="0" step="0.01" value="${p.price}"><label>Descripción</label><textarea id="ed" rows="4">${esc(p.desc)}</textarea><label>Categoría</label><input id="ec" list="cl2" value="${esc(p.cat||'')}"><datalist id="cl2">${catOpts()}</datalist><label>¿Renovable?</label><select id="er"><option value="1" ${p.ren?'selected':''}>Sí, renovable</option><option value="0" ${p.ren?'':'selected'}>No renovable</option></select><label>Duración (días)</label><input id="edy" type="number" min="1" value="${p.days}"><label>Link de la imagen</label><input id="ei" value="${esc(p.img||'')}">${two(`<button data-a="savep" data-id="${p.id}">Guardar cambios</button>`,cancel)}`;
/* ---- pantallas ---- */
const landing=()=>`<div class="top">${LOGO}<div class="r"><button class="ghost out" data-a="go" data-m="login">Ingresar</button><button class="out" data-a="go" data-m="reg">Registrarme</button>${BURG}</div></div><div id="dw" class="dw"><div class="dov" data-a="tg"></div><aside class="dp"><button data-a="go" data-m="reg">Crear cuenta gratis</button><button class="ghost" data-a="go" data-m="login">Ingresar</button></aside></div>
<section class="hero"><div class="badge">Entrega inmediata · Pagos con Yape y Binance</div><h1>Tus plataformas de streaming a <span>precios increíbles</span></h1><p>Cuentas de entretenimiento con entrega automática. Recarga saldo, elige tu plataforma y recibe tus accesos en segundos.</p><div class="cta"><button data-a="go" data-m="reg">Crear cuenta gratis</button><button class="ghost" data-a="go" data-m="login">Ya tengo cuenta</button></div><div class="stats"><div><b>Inmediata</b><small>Entrega automática</small></div><div><b>Yape · Binance</b><small>Medios de pago</small></div><div><b>WhatsApp</b><small>Soporte directo</small></div></div></section>
<div class="wrap"><div class="chips">${['Netflix','Disney+','Prime Video','Max','Spotify','Crunchyroll','YouTube Premium','Paramount+'].map(x=>`<span>${x}</span>`).join('')}</div>${S.prods.length?`<div class="sec"><h3>Productos disponibles</h3><div class="grid">${S.prods.slice(0,6).map(p=>`<div class="card">${pimg(p)}<h3>${esc(p.name)}</h3><small>${esc(p.desc)}</small><div class="p">${money(p.price)}</div></div>`).join('')}</div><p class="mu">Inicia sesión para comprar.</p></div>`:''}
<div class="sec"><h3>Cómo funciona</h3><div class="grid steps"><div class="card"><h3>Regístrate</h3><small>Crea tu cuenta con tu correo.</small></div><div class="card"><h3>Recarga saldo</h3><small>Paga y envía tu número de operación. Se acredita al confirmarlo.</small></div><div class="card"><h3>Compra y disfruta</h3><small>Elige tu plataforma y recibe tus accesos al momento.</small></div></div></div></div><div class="foot"><p>¿Dudas antes de comprar?</p><a class="btn" href="#" data-a="sup">Escríbenos por WhatsApp</a><p style="font-size:13px">© CBD STREAMING SHOP</p></div>`;
const authV=()=>{const l=S.mode==='login';return `<div class="auth"><div style="text-align:center">${LOGO}</div><h2 style="text-align:center;margin:16px 0 2px;font-size:20px">${l?'Bienvenido de vuelta':'Crea tu cuenta'}</h2><p class="mu" style="text-align:center;margin:0 0 4px">${l?'Ingresa para ver el catálogo y tus compras.':'Regístrate para comprar y recargar saldo.'}</p><div class="tabs"><button class="${l?'':'ghost'}" data-a="mode" data-m="login">Ingresar</button><button class="${l?'ghost':''}" data-a="mode" data-m="reg">Registrarme</button></div>${l?'':'<label>Nombre de usuario</label><input id="nm" autocomplete="nickname" maxlength="24">'}<label>Correo</label><input id="em" type="email" autocomplete="email"><label>Contraseña</label><input id="pw" type="password" autocomplete="${l?'current-password':'new-password'}" data-enter="auth"><button style="width:100%" data-a="auth">${l?'Entrar':'Crear cuenta'}</button><button class="ghost" style="width:100%;margin-top:8px" data-a="home">Volver al inicio</button></div>`};
const shellV=()=>`<div class="top">${LOGO}<div class="r">${S.adm?'':'<span class="bal" id="bal1"></span><button class="rc" data-a="rech">Recargar</button>'}<span class="usr"><span class="av" data-wi></span><span class="un" data-w></span></span><button class="ghost out" data-a="logout">Salir</button>${BURG}</div></div><div id="dw" class="dw"><div class="dov" data-a="tg"></div><aside class="dp"><div class="usr big"><span class="av" data-wi></span><span><b data-w></b><br><small class="mu">${esc(S.me.email)}</small></span></div>${S.adm?'':'<p class="bal" id="bal2" style="text-align:center;margin:0"></p><button data-a="rech">Recargar saldo</button>'}<div class="dn" id="dn"></div><button class="ghost" data-a="logout">Cerrar sesión</button></aside></div><div class="wrap"><div class="tabs nav" id="nav"></div><div id="view"></div></div>`;
function paint(force){
  const a=$('app');if(!S.ready)return;
  if(!S.me){shell=null;a.innerHTML=S.view==='home'?landing():authV();return}
  ['bal1','bal2'].forEach(i=>{const e=$(i);if(e)e.innerHTML='Saldo: '+money(S.bal)});
  const f=document.activeElement;
  if(!force&&f&&f.closest('#view')&&/INPUT|TEXTAREA|SELECT/.test(f.tagName))return;
  if(shell!==S.me.uid||!$('view')){shell=S.me.uid;a.innerHTML=shellV()}
  const h=TABS().map(t=>`<button class="${S.tab===t[0]?'':'ghost'}" data-a="tab" data-t="${t[0]}">${t[1]}</button>`).join('');
  $('nav').innerHTML=h;$('dn').innerHTML=h;
  document.querySelectorAll('[data-w]').forEach(e=>e.textContent=who());
  document.querySelectorAll('[data-wi]').forEach(e=>e.textContent=who()[0].toUpperCase());
  ['bal1','bal2'].forEach(i=>{const e=$(i);if(e)e.innerHTML='Saldo: '+money(S.bal)});
  const v=$('view'),k=S.tab+'|'+S.me.uid;
  v.innerHTML=(VIEWS[S.tab]||VIEWS.catalog)();
  if(paint.k!==k){paint.k=k;v.classList.remove('in');void v.offsetWidth;v.classList.add('in');scrollTo(0,0)}
}

/* ===== Eventos y arranque ===== */
const ord=id=>S.orders.find(o=>o.id===id),prd=id=>S.prods.find(p=>p.id===id);
const val=id=>$(id).value.trim(),openWa=(w,m)=>{w=String(w||'').replace(/\D/g,'');if(!w)return toast('Falta configurar el WhatsApp');open('https://wa.me/'+w+'?text='+encodeURIComponent(m),'_blank','noopener')};
const copy=t=>navigator.clipboard.writeText(t).then(()=>toast('Copiado'),()=>toast('Selecciona y copia manualmente'));
let lastMsg='';
Object.assign(A,{
  closeM,
  tg:()=>$('dw')?.classList.toggle('on'),
  go:d=>{S.mode=d.m;S.view='auth';paint();scrollTo(0,0)},
  mode:d=>{S.mode=d.m;paint()},
  home:()=>{S.view='home';paint()},
  auth:async()=>{
    const e=val('em').toLowerCase(),p=$('pw').value;
    if(!e||p.length<6)return toast('Ingresa un correo y una contraseña de 6 o más caracteres');
    if(S.mode==='reg'){const n=val('nm');if(n.length<2)return toast('Escribe tu nombre de usuario');await register(n,e,p)}else await login(e,p);
  },
  logout:()=>logout(),
  tab:d=>{S.tab=d.t;S.q='';S.cat='';$('dw')?.classList.remove('on');paint(true)},
  cat:d=>{S.cat=d.v;paint(true)},
  sup:()=>openWa(S.wa,'Hola, necesito soporte.'+(S.me?' Mi correo: '+S.me.email:'')),
  prod:d=>modal(prodM(prd(d.id))),
  buy:d=>{const p=prd(d.id);if(!p||!(S.free[p.id]||[]).length)return toast('Producto sin stock');if(S.bal<p.price)return toast('Saldo insuficiente. Recarga para continuar');modal(buyM(p))},
  cbuy:async d=>{
    const p=prd(d.id),cn=val('cn'),cw=wa9(val('cw'));closeM();toast('Procesando compra…');
    const r=await buy(p,cn,cw);
    modal(ordM(ord(r.oid)||{id:r.oid,sid:r.sid,pname:p.name,img:p.img,days:p.days,ren:p.ren,price:p.price,cname:cn,cwa:cw}));
  },
  show:async d=>{const o=ord(d.id);await fetchSec([o.sid]);modal(ordM(o))},
  cli:d=>modal(cliM(ord(d.id))),
  scli:async d=>{await saveCli(d.id,val('cn2'),wa9(val('cw2')));closeM();toast('Cliente actualizado')},
  copy:d=>copy(d.t),
  copyall:d=>copy(accMsg(ord(d.id))),
  sendcli:d=>{const n=wa9(val('wn'));if(n.length<10)return toast('Escribe el WhatsApp con código de país');openWa(n,accMsg(ord(d.id)))},
  rech:()=>{S.pm='yape';modal(rechM())},
  pm:d=>{S.pm=d.k;$('pinfo').innerHTML=payHTML(d.k);$('my').className=d.k==='yape'?'':'ghost';$('mb').className=d.k==='bin'?'':'ghost'},
  srech:async()=>{
    const a=parseFloat($('ra').value),r=val('rr');
    if(!(a>=MIN)||!/^[A-Za-z0-9]{3,40}$/.test(r))return toast('Monto mínimo $1 y número de operación de 3 a 40 letras o números, sin espacios');
    await recharge(a,r);
    lastMsg=`Nueva solicitud de recarga\nMétodo: ${S.pm==='yape'?'Yape':'Binance Pay'}\nCliente: ${S.me.email}\nMonto: $${a.toFixed(2)} (${sol(a)})\nN.º de operación: ${r}\nFecha y hora: ${new Date().toLocaleString('es-PE')}`;
    modal(sentM(lastMsg));
  },
  wasend:()=>openWa(S.wa,lastMsg),
  /* admin */
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
Object.assign(I,{
  q:v=>{S.q=v;const l=LST[S.tab];if(l)$('lst').innerHTML=l()},
  ra:v=>{$('rs').textContent=sol(v||0)}
});
/* ---- arranque ---- */
document.body.insertAdjacentHTML('beforeend','<div id="modal"><div class="box" id="mbox"></div></div><div id="toast"></div><a class="fab" href="#" data-a="sup" aria-label="Soporte por WhatsApp"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.1.1.3 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/></svg><span>Soporte</span></a>');
document.addEventListener('click',async e=>{
  if(e.target.id==='modal')return closeM();
  const b=e.target.closest('[data-a]');if(!b)return;
  e.preventDefault();
  try{await A[b.dataset.a]?.(b.dataset,b)}catch(x){toast(err(x),6000)}
});
document.addEventListener('input',e=>I[e.target.dataset.i]?.(e.target.value));
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.enter)A[e.target.dataset.enter]().catch(x=>toast(err(x)))});
try{localStorage.removeItem('ds_db');sessionStorage.removeItem('ds_me')}catch{}
addEventListener('unhandledrejection',e=>toast(err(e.reason)));
pub(()=>paint());
onAuthStateChanged(auth,async u=>{
  unlisten();Object.assign(S,{sec:{},orders:[],rech:[],users:[],free:{},bal:0,name:'',ud:null,q:'',cat:''});
  if(!u){S.me=null;S.adm=false;S.view='home'}
  else{S.me=u;S.adm=await isAdmin(u);S.tab=S.adm?'pend':'catalog';priv(()=>paint())}
  S.ready=true;paint(true);
});

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
const PAY={yape:{n:'Yape',rows:[['Número','965730677'],['Nombre','Cristhian Eddy C. A.']],qr:'img/yaqr.jpeg',note:'Paga el equivalente en soles.'},bin:{n:'Binance Pay',rows:[['ID de usuario','1250169311'],['Nombre','CRB TECH SHP']],qr:'img/binqr.jpeg',note:'Paga el monto en dólares (USDT).'}};
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
/* ---- pantalla de carga: se oculta cuando sesión, datos, fuentes e imágenes visibles ya están listos ---- */
const pend={pub:0,priv:0};let locked=0,hid=0,t0=performance.now();
const once=k=>{let d=0;pend[k]++;return()=>{if(!d){d=1;pend[k]=Math.max(0,pend[k]-1);fin()}}};
const fin=()=>{if(S.ready&&!locked&&!pend.pub&&!pend.priv)hideLoad()};
function showLoad(m){locked=1;hid=0;t0=performance.now();const b=$('boot');if(!b)return;$('bm').textContent=m||'Cargando…';b.classList.remove('off')}
const hideNow=()=>{locked=0;hid=1;$('boot')?.classList.add('off')};
function hideLoad(){
  if(hid)return;hid=1;
  const imgs=[...document.images].filter(i=>!i.closest('#boot')&&!i.complete&&i.getBoundingClientRect().top<innerHeight).map(i=>new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true})}));
  Promise.race([Promise.all([document.fonts?document.fonts.ready:0,...imgs]),new Promise(r=>setTimeout(r,2500))]).then(()=>{
    setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>$('boot')?.classList.add('off'))),Math.max(0,700-(performance.now()-t0)));
  });
}
const on=(q,f)=>{const d=once('priv');subs.push(onValue(q,s=>{f(s);d()},e=>{console.warn('RTDB:',e.code||e.message);if(S.me)toast('Base de datos: sin permiso. Revisa que las reglas estén publicadas');d()}))};
const arr=s=>{const r=[];s.forEach(c=>{r.push({id:c.key,...c.val()})});return r};
const by=a=>a.sort((x,y)=>ms(y.createdAt)-ms(x.createdAt));
const denied=e=>/permission/i.test(e?.code||e?.message||'');
function pub(r){
  const d1=once('pub');onValue(R('products'),s=>{S.prods=arr(s);r();d1()},()=>d1());
  const d2=once('pub');onValue(R('settings/wa'),s=>{S.wa=s.val()||'';r();d2()},()=>d2());
}
const unlisten=()=>{subs.splice(0).forEach(f=>f());pend.priv=0};
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
/* Perfil: una sola creación por usuario (misma promesa para registro y sesión) y solo si no existe */
const pf={};
const profile=(u,name)=>pf[u.uid]??=(async()=>{
  try{
    if((await get(R('users/'+u.uid))).exists())return;
    const n=String(name||u.email.split('@')[0]).trim().slice(0,40).padEnd(2,'_');
    await set(R('users/'+u.uid),{name:n,email:u.email,role:'client',balance:0,createdAt:serverTimestamp()});
  }catch(e){delete pf[u.uid];throw e}
})();
async function register(name,e,p){
  S.pendName=name;
  const c=await createUserWithEmailAndPassword(auth,e,p);
  await profile(c.user,name);
}
/* El rol se lee de users/<uid>/role (las reglas permiten leer tu propio nodo) */
const isAdmin=async u=>{try{return (await get(R('users/'+u.uid+'/role'))).val()==='admin'}catch{return false}};
/* Detecta datos de usuario que las reglas rechazan (saldo como texto, campos faltantes) */
function userIssue(u){
  if(!u||typeof u!=='object')return 'el usuario no existe en la base de datos';
  const miss=['email','role','balance'].filter(k=>u[k]===undefined||u[k]===null);
  if(miss.length)return 'le falta el dato '+miss.join(', ');
  if(typeof u.balance!=='number')return 'el saldo está guardado como texto ("'+u.balance+'")';
  return '';
}
/* ===== Vistas ===== */
let shell=null;
const ST={pend:'Pendiente',ok:'Aprobada',no:'Rechazada'};
const LOGO=`<span class="logo"><img src="img/logo.png" alt="CBD STREAMING SHOP" onerror="this.parentNode.innerHTML='<b>CBD STREAMING</b> <span>SHOP</span>'"></span>`;
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
const prodM=p=>`${pimg(p,'big')}<h2 style="font-size:20px;margin:14px 0 6px">${esc(p.name)}</h2>${p.cat?`<span class="tag">${esc(p.cat)}</span>`:''}<div class="p big">${money(p.price)}</div><div class="meta" style="margin:8px 0"><span>⏱ ${p.days} días</span><span>${p.ren?'Renovable':'No renovable'}</span><span>Stock ${stk(p)}</span></div><p class="desc">${esc(p.desc)||'Sin descripción.'}</p>${two(S.me&&!S.adm?`<button ${stk(p)?'':'disabled'} data-a="buy" data-id="${p.id}">${stk(p)?'Comprar':'Agotado'}</button>`:(S.adm?`<button class="no" data-a="delp" data-id="${p.id}">Eliminar producto</button>`:'<button data-a="goauth">Ingresar para comprar</button>'),'<button class="ghost" data-a="closeM">Cerrar</button>')}`;
const ordM=o=>{const f=parseAcc(S.sec[o.sid]);return `<div style="text-align:center"><div class="ck">✓</div><h3>${S.adm?'Datos entregados':'¡Compra exitosa!'}</h3></div><div class="dprod dp2">${pimg({name:o.pname,img:o.img},'sm2')}<div><b>${esc(o.pname)}</b><br><small class="mu">${period(o)} · ${o.ren?'Renovable':'No renovable'}</small><br>${vig(o)}</div></div>${f.map(x=>`<div class="fld"><div><small class="mu">${x[0]}</small><div class="fv">${esc(x[1])}</div></div>${S.adm?'':`<button class="ghost" data-a="copy" data-t="${esc(x[1])}">Copiar</button>`}</div>`).join('')}<p class="mu" style="font-size:12px;margin:12px 0">No cambies la contraseña ni el PIN y usa solo tu perfil asignado. Si tienes algún problema, escríbenos por soporte.</p>${S.adm?'':`<button class="ghost" style="width:100%;margin-bottom:8px" data-a="copyall" data-id="${o.id}">Copiar todo</button><div class="wbox"><label>WhatsApp del cliente (con código de país)</label><input id="wn" inputmode="tel" value="${esc(o.cwa||'')}" placeholder="51999999999"><button style="width:100%" data-a="sendcli" data-id="${o.id}">Enviar por WhatsApp</button></div>`}<button style="width:100%;margin-top:8px" data-a="closeM">Entendido</button>`};
const shellV=()=>`<div class="top">${LOGO}<div class="r">${S.adm?'':'<span class="bal" id="bal1"></span><button class="rc" data-a="rech">Recargar</button>'}<span class="usr"><span class="av" data-wi></span><span class="un" data-w></span></span><button class="ghost out" data-a="logout">Salir</button>${BURG}</div></div><div id="dw" class="dw"><div class="dov" data-a="tg"></div><aside class="dp"><div class="usr big"><span class="av" data-wi></span><span><b data-w></b><br><small class="mu">${esc(S.me.email)}</small></span></div>${S.adm?'':'<p class="bal" id="bal2" style="text-align:center;margin:0"></p><button data-a="rech">Recargar saldo</button>'}<div class="dn" id="dn"></div><button class="ghost" data-a="logout">Cerrar sesión</button></aside></div><div class="wrap"><div class="tabs nav" id="nav"></div><div id="view"></div></div>`;
const P={views:{},lst:{},tabs:()=>[]},H={paint:()=>{}};
const paint=f=>H.paint(f);
function shellPaint(force){
  const a=$('app');if(!S.ready||!S.me)return;
  ['bal1','bal2'].forEach(i=>{const e=$(i);if(e)e.innerHTML='Saldo: '+money(S.bal)});
  const f=document.activeElement;
  if(!force&&f&&f.closest('#view')&&/INPUT|TEXTAREA|SELECT/.test(f.tagName))return;
  if(shell!==S.me.uid||!$('view')){shell=S.me.uid;a.innerHTML=shellV()}
  const h=P.tabs().map(t=>`<button class="${S.tab===t[0]?'':'ghost'}" data-a="tab" data-t="${t[0]}">${t[1]}</button>`).join('');
  $('nav').innerHTML=h;$('dn').innerHTML=h;
  document.querySelectorAll('[data-w]').forEach(e=>e.textContent=who());
  document.querySelectorAll('[data-wi]').forEach(e=>e.textContent=who()[0].toUpperCase());
  ['bal1','bal2'].forEach(i=>{const e=$(i);if(e)e.innerHTML='Saldo: '+money(S.bal)});
  const v=$('view'),k=S.tab+'|'+S.me.uid;
  v.innerHTML=(P.views[S.tab]||P.views.catalog)();
  if(paint.k!==k){paint.k=k;v.classList.remove('in');void v.offsetWidth;v.classList.add('in');scrollTo(0,0)}
}
/* ===== Eventos y arranque ===== */
const ord=id=>S.orders.find(o=>o.id===id),prd=id=>S.prods.find(p=>p.id===id);
const val=id=>$(id).value.trim(),openWa=(w,m)=>{w=String(w||'').replace(/\D/g,'');if(!w)return toast('Falta configurar el WhatsApp');open('https://wa.me/'+w+'?text='+encodeURIComponent(m),'_blank','noopener')};
const copy=t=>navigator.clipboard.writeText(t).then(()=>toast('Copiado'),()=>toast('Selecciona y copia manualmente'));
Object.assign(A,{
  closeM,
  tg:()=>$('dw')?.classList.toggle('on'),
  logout:()=>{showLoad('Cerrando sesión…');return logout().catch(x=>{hideNow();throw x})},
  tab:d=>{S.tab=d.t;S.q='';S.cat='';$('dw')?.classList.remove('on');paint(true)},
  cat:d=>{S.cat=d.v;paint(true)},
  sup:()=>openWa(S.wa,'Hola, necesito soporte.'+(S.me?' Mi correo: '+S.me.email:'')),
  prod:d=>modal(prodM(prd(d.id))),
  show:async d=>{const o=ord(d.id);await fetchSec([o.sid]);modal(ordM(o))},
  copy:d=>copy(d.t),
});
Object.assign(I,{q:v=>{S.q=v;const l=P.lst[S.tab];if(l)$('lst').innerHTML=l()}});
const go=p=>location.replace('./'+p);
function circleIcon(){
  const im=new Image();
  im.onload=()=>{try{
    const s=128,cv=document.createElement('canvas');cv.width=cv.height=s;
    const x=cv.getContext('2d');x.beginPath();x.arc(s/2,s/2,s/2,0,Math.PI*2);x.clip();
    const m=Math.min(im.width,im.height);x.drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,s,s);
    let l=document.querySelector('link[rel~="icon"]');if(!l){l=document.createElement('link');l.rel='icon';document.head.appendChild(l)}
    l.type='image/png';l.href=cv.toDataURL('image/png');
  }catch{}};
  im.src='img/cdb.jpeg';
}
function start(page){
document.body.insertAdjacentHTML('beforeend','<div id="modal"><div class="box" id="mbox"></div></div><div id="toast"></div><a class="fab" href="#" data-a="sup" aria-label="Soporte por WhatsApp"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.1.1.3 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/></svg><span>Soporte</span></a>');
if(page!=='catalogo')document.querySelector('.fab')?.remove();
circleIcon();
document.addEventListener('click',async e=>{
  if(e.target.id==='modal')return closeM();
  const b=e.target.closest('[data-a]');if(!b)return;
  e.preventDefault();
  try{const r=A[b.dataset.a]?.(b.dataset,b);if(r&&r.then){b.disabled=true;try{await r}finally{b.disabled=false}}}catch(x){toast(err(x),6000)}
});
document.addEventListener('input',e=>I[e.target.dataset.i]?.(e.target.value));
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.enter)A[e.target.dataset.enter]().catch(x=>toast(err(x)))});
try{localStorage.removeItem('ds_db');sessionStorage.removeItem('ds_me')}catch{}
addEventListener('unhandledrejection',e=>toast(err(e.reason)));
pub(()=>paint());
setTimeout(()=>{if(!locked)hideLoad()},10000);
let authTk=0;
onAuthStateChanged(auth,async u=>{
  const tk=++authTk;
  unlisten();Object.assign(S,{sec:{},orders:[],rech:[],users:[],free:{},bal:0,name:'',ud:null,q:'',cat:''});
  if(!u){
    S.me=null;S.adm=false;S.view='home';
    if(page!=='login')return go('login');
  }else{
    const adm=await isAdmin(u);
    if(!adm)await profile(u,S.pendName).catch(x=>console.warn('perfil:',x.code||x.message));
    if(tk!==authTk)return;
    const dest=adm?'admincdb':'catalogo';
    if(page!==dest)return go(dest);
    S.pendName='';S.me=u;S.adm=adm;S.tab=adm?'pend':'catalog';priv(()=>paint());
  }
  S.ready=true;paint(true);fin();
});
}
export {S,A,I,P,H,$,esc,usd,sol,money,ms,fd,period,vig,uname,wa9,parseAcc,PAY,toast,modal,closeM,err,db,root,R,arr,by,denied,fetchSec,set,update,push,get,increment,serverTimestamp,paint,shellPaint,start,LOGO,BURG,who,stk,em,buyer,srch,has,pimg,accMsg,two,cancel,eye,flt,cards,catBar,catOpts,ordList,recRow,ST,prodM,ordM,ord,prd,val,openWa,copy,login,register,userIssue,MIN,auth,showLoad,hideNow}

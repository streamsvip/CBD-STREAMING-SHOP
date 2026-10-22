import {S,A,I,$,toast,modal,closeM,err,sol,MIN,wa9} from './core.js';
import {auth,onAuthStateChanged,updateDoc} from './firebase.js';
import * as D from './data.js';
import * as V from './views.js';
const {paint}=V;
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
    if(S.mode==='reg'){const n=val('nm');if(n.length<2)return toast('Escribe tu nombre de usuario');await D.register(n,e,p)}else await D.login(e,p);
  },
  logout:()=>D.logout(),
  tab:d=>{S.tab=d.t;S.q='';S.cat='';$('dw')?.classList.remove('on');paint(true)},
  cat:d=>{S.cat=d.v;paint(true)},
  sup:()=>openWa(S.wa,'Hola, necesito soporte.'+(S.me?' Mi correo: '+S.me.email:'')),
  prod:d=>modal(V.prodM(prd(d.id))),
  buy:d=>{const p=prd(d.id);if(!p||!(S.free[p.id]||[]).length)return toast('Producto sin stock');if(S.bal<p.price)return toast('Saldo insuficiente. Recarga para continuar');modal(V.buyM(p))},
  cbuy:async d=>{
    const p=prd(d.id),cn=val('cn'),cw=wa9(val('cw'));closeM();toast('Procesando compra…');
    const r=await D.buy(p,cn,cw);
    modal(V.ordM(ord(r.oid)||{id:r.oid,sid:r.sid,pname:p.name,img:p.img,days:p.days,ren:p.ren,price:p.price,cname:cn,cwa:cw}));
  },
  show:async d=>{const o=ord(d.id);await D.fetchSec([o.sid]);modal(V.ordM(o))},
  cli:d=>modal(V.cliM(ord(d.id))),
  scli:async d=>{await D.saveCli(d.id,val('cn2'),wa9(val('cw2')));closeM();toast('Cliente actualizado')},
  copy:d=>copy(d.t),
  copyall:d=>copy(V.accMsg(ord(d.id))),
  sendcli:d=>{const n=wa9(val('wn'));if(n.length<10)return toast('Escribe el WhatsApp con código de país');openWa(n,V.accMsg(ord(d.id)))},
  rech:()=>{S.pm='yape';modal(V.rechM())},
  pm:d=>{S.pm=d.k;$('pinfo').innerHTML=V.payHTML(d.k);$('my').className=d.k==='yape'?'':'ghost';$('mb').className=d.k==='bin'?'':'ghost'},
  srech:async()=>{
    const a=parseFloat($('ra').value),r=val('rr');
    if(!(a>=MIN)||!/^[A-Za-z0-9]{3,40}$/.test(r))return toast('Monto mínimo $1 y número de operación de 3 a 40 letras o números, sin espacios');
    await D.recharge(a,r);
    lastMsg=`Nueva solicitud de recarga\nMétodo: ${S.pm==='yape'?'Yape':'Binance Pay'}\nCliente: ${S.me.email}\nMonto: $${a.toFixed(2)} (${sol(a)})\nN.º de operación: ${r}\nFecha y hora: ${new Date().toLocaleString('es-PE')}`;
    modal(V.sentM(lastMsg));
  },
  wasend:()=>openWa(S.wa,lastMsg),
  /* admin */
  decide:async d=>{await D.decide(d.id,d.ok==='1');toast(d.ok==='1'?'Recarga aprobada':'Recarga rechazada')},
  addp:async()=>{
    await D.saveProd(null,{name:val('pn'),desc:val('pd'),img:val('pi'),days:parseInt(val('pdays')),cat:val('pc'),ren:val('pr')==='1',price:parseFloat(val('pp'))});
    paint(true);toast('Producto creado. Ahora sube su stock en la lista de abajo');
  },
  editp:d=>modal(V.editPM(prd(d.id))),
  savep:async d=>{await D.saveProd(d.id,{name:val('en'),desc:val('ed'),img:val('ei'),days:parseInt(val('edy')),cat:val('ec'),ren:val('er')==='1',price:parseFloat(val('ep'))});closeM();toast('Producto actualizado')},
  delp:async d=>{if(confirm('¿Eliminar este producto?')){await D.delProd(d.id);toast('Producto eliminado')}},
  adds:async d=>{
    const all=val('st_'+d.id).split('\n').map(x=>x.trim()).filter(Boolean),ok=all.filter(l=>{const q=l.split('|');return q.length===4&&q[0].trim()&&q[1].trim()&&l.length<=400});
    if(!all.length)return toast('Pega al menos una cuenta');
    if(ok.length!==all.length)return toast('Formato inválido en '+(all.length-ok.length)+' línea(s). Usa correo|contraseña|perfil|pin');
    toast('Subiendo '+ok.length+' cuentas…');await D.addStock(d.id,ok.map(l=>l.split('|').map(x=>x.trim()).join('|')));$('st_'+d.id).value='';toast(ok.length+' cuentas agregadas');
  },
  edito:async d=>{const o=ord(d.id);await D.fetchSec([o.sid]);modal(V.editOM(o))},
  saveo:async d=>{
    const o=ord(d.id),v=[0,1,2,3].map(i=>val('e'+i));
    if(!v[0]||!v[1])return toast('El correo y la contraseña son obligatorios');
    if(v.some(x=>x.includes('|')))return toast('No uses el símbolo | en los datos');
    await D.saveAcc(o.sid,v.join('|'));S.sec[o.sid]=v.join('|');closeM();paint(true);toast('Entrega actualizada');
  },
  balm:d=>modal(V.balM(S.users.find(u=>u.id===d.id))),
  setbal:async d=>{const v=parseFloat($('bm').value);if(!(v>=0))return toast('Ingresa un monto válido');await D.setBal(S.users.find(u=>u.id===d.id),d.m,v);closeM();toast('Saldo actualizado')},
  savewa:async()=>{await D.saveWa(val('sw').replace(/\D/g,''));toast('Configuración guardada')}
});
Object.assign(I,{
  q:v=>{S.q=v;const l=V.LST[S.tab];if(l)$('lst').innerHTML=l()},
  ra:v=>{$('rs').textContent=sol(v||0)}
});
/* ---- arranque ---- */
document.body.insertAdjacentHTML('beforeend','<div id="modal"><div class="box" id="mbox"></div></div><div id="toast"></div><a class="fab" href="#" data-a="sup" aria-label="Soporte por WhatsApp"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.1.1.3 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/></svg><span>Soporte</span></a>');
document.addEventListener('click',async e=>{
  if(e.target.id==='modal')return closeM();
  const b=e.target.closest('[data-a]');if(!b)return;
  e.preventDefault();
  try{await A[b.dataset.a]?.(b.dataset,b)}catch(x){toast(err(x))}
});
document.addEventListener('input',e=>I[e.target.dataset.i]?.(e.target.value));
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.enter)A[e.target.dataset.enter]().catch(x=>toast(err(x)))});
try{localStorage.removeItem('ds_db');sessionStorage.removeItem('ds_me')}catch{}
addEventListener('unhandledrejection',e=>toast(err(e.reason)));
D.pub(()=>paint());
onAuthStateChanged(auth,async u=>{
  D.unlisten();Object.assign(S,{sec:{},orders:[],rech:[],users:[],free:{},bal:0,name:'',q:'',cat:''});
  if(!u){S.me=null;S.adm=false;S.view='home'}
  else{S.me=u;S.adm=await D.isAdmin(u);S.tab=S.adm?'pend':'catalog';D.priv(()=>paint())}
  S.ready=true;paint(true);
});

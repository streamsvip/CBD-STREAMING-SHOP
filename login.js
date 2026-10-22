import * as K from './core.js';
const {S,A,I,P,H,$,esc,usd,sol,money,ms,fd,period,vig,uname,wa9,parseAcc,PAY,toast,modal,closeM,err,db,root,R,arr,by,denied,fetchSec,set,update,push,get,increment,serverTimestamp,paint,shellPaint,start,LOGO,BURG,who,stk,em,buyer,srch,has,pimg,accMsg,two,cancel,eye,flt,cards,catBar,catOpts,ordList,recRow,ST,prodM,ordM,ord,prd,val,openWa,copy,login,register,userIssue,MIN}=K;

const EYE='<svg class="open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg><svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-7-11-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';
const landing=()=>`<div class="top">${LOGO}<div class="r"><button class="ghost out" data-a="go" data-m="login">Ingresar</button><button class="out" data-a="go" data-m="reg">Registrarme</button>${BURG}</div></div><div id="dw" class="dw"><div class="dov" data-a="tg"></div><aside class="dp"><button data-a="go" data-m="reg">Crear cuenta gratis</button><button class="ghost" data-a="go" data-m="login">Ingresar</button></aside></div>
<section class="hero"><div class="badge">Entrega inmediata · Pagos con Yape y Binance</div><h1>Tus plataformas de streaming a <span>precios increíbles</span></h1><p>Cuentas de entretenimiento con entrega automática. Recarga saldo, elige tu plataforma y recibe tus accesos en segundos.</p><div class="cta"><button data-a="go" data-m="reg">Crear cuenta gratis</button><button class="ghost" data-a="go" data-m="login">Ya tengo cuenta</button></div><div class="stats"><div><b>Inmediata</b><small>Entrega automática</small></div><div><b>Yape · Binance</b><small>Medios de pago</small></div><div><b>WhatsApp</b><small>Soporte directo</small></div></div></section>
<div class="wrap"><div class="chips">${['Netflix','Disney+','Prime Video','Max','Spotify','Crunchyroll','YouTube Premium','Paramount+'].map(x=>`<span>${x}</span>`).join('')}</div>${S.prods.length?`<div class="sec"><h3>Productos disponibles</h3><div class="grid">${S.prods.slice(0,6).map(p=>`<div class="card pc" style="cursor:pointer" data-a="prod" data-id="${p.id}">${pimg(p)}${p.cat?`<span class="tag">${esc(p.cat)}</span>`:''}<h3>${esc(p.name)}</h3><small>${esc(p.desc)}</small><div class="p">${money(p.price)}</div><div class="bar"><button data-a="go" data-m="login">Comprar</button>${eye(p.id)}</div></div>`).join('')}</div><p class="mu">Inicia sesión para comprar.</p></div>`:''}
<div class="sec"><h3>Cómo funciona</h3><div class="grid steps"><div class="card"><h3>Regístrate</h3><small>Crea tu cuenta con tu correo.</small></div><div class="card"><h3>Recarga saldo</h3><small>Paga y envía tu número de operación. Se acredita al confirmarlo.</small></div><div class="card"><h3>Compra y disfruta</h3><small>Elige tu plataforma y recibe tus accesos al momento.</small></div></div></div></div><div class="foot"><p>¿Dudas antes de comprar?</p><a class="btn" href="#" data-a="sup">Escríbenos por WhatsApp</a><p style="font-size:13px">© CBD STREAMING SHOP</p></div>`;
const authV=()=>{const l=S.mode==='login';return `<div class="auth"><div style="text-align:center">${LOGO}</div><h2 style="text-align:center;margin:16px 0 2px;font-size:20px">${l?'Bienvenido de vuelta':'Crea tu cuenta'}</h2><p class="mu" style="text-align:center;margin:0 0 4px">${l?'Ingresa para ver el catálogo y tus compras.':'Regístrate para comprar y recargar saldo.'}</p><div class="tabs"><button class="${l?'':'ghost'}" data-a="mode" data-m="login">Ingresar</button><button class="${l?'ghost':''}" data-a="mode" data-m="reg">Registrarme</button></div>${l?'':'<label>Nombre de usuario</label><input id="nm" autocomplete="nickname" maxlength="24">'}<label>Correo</label><input id="em" type="email" autocomplete="email"><label>Contraseña</label><div class="pwf"><input id="pw" type="password" autocomplete="${l?'current-password':'new-password'}" data-enter="auth"><button type="button" class="pweye" data-a="seepw" aria-label="Mostrar contraseña">${EYE}</button></div><button style="width:100%" data-a="auth">${l?'Entrar':'Crear cuenta'}</button><button class="ghost" style="width:100%;margin-top:8px" data-a="home">Volver al inicio</button></div>`};
H.paint=force=>{
  const a=$('app');if(!S.ready)return;
  if(S.view==='auth'){if(!force&&$('em'))return;a.innerHTML=authV()}else a.innerHTML=landing();
};
Object.assign(A,{
  go:d=>{S.mode=d.m;S.view='auth';paint(true);scrollTo(0,0)},
  goauth:()=>{closeM();S.mode='login';S.view='auth';paint(true);scrollTo(0,0)},
  mode:d=>{S.mode=d.m;paint(true)},
  home:()=>{S.view='home';paint(true)},
  seepw:(d,b)=>{const i=$('pw'),s=i.type==='password';i.type=s?'text':'password';b.classList.toggle('on',s);b.setAttribute('aria-label',s?'Ocultar contraseña':'Mostrar contraseña');i.focus()},
  auth:async()=>{
    if(A.auth.busy)return;
    const e=val('em').toLowerCase(),p=$('pw').value;
    if(!e||p.length<6)return toast('Ingresa un correo y una contraseña de 6 o más caracteres');
    A.auth.busy=true;
    try{
      if(S.mode==='reg'){const n=val('nm');if(n.length<2)return toast('Escribe tu nombre de usuario');await register(n,e,p)}else await login(e,p);
    }finally{A.auth.busy=false}
  },
});
start('login');

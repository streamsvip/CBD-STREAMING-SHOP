import * as K from './core.js';
const {S,A,I,P,H,$,esc,usd,sol,money,ms,fd,period,vig,uname,wa9,parseAcc,PAY,toast,modal,closeM,err,db,root,R,arr,by,denied,fetchSec,set,update,push,get,increment,serverTimestamp,paint,shellPaint,start,LOGO,BURG,who,stk,em,buyer,srch,has,pimg,accMsg,two,cancel,eye,flt,cards,catBar,catOpts,ordList,recRow,ST,prodM,ordM,ord,prd,val,openWa,copy,login,register,userIssue,MIN}=K;

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
const saveCli=(id,cn,cw)=>update(root,{['orders/'+id+'/cname']:cn,['orders/'+id+'/cwa']:cw});
const recharge=(amount,rf)=>set(R('recharges/'+S.pm+'_'+rf),{uid:S.me.uid,email:S.me.email,amount,method:S.pm,ref:rf,status:'pend',createdAt:serverTimestamp()})
  .catch(e=>{throw denied(e)?'Ese número de operación ya fue registrado o los datos no son válidos':e});
P.views={catalog:()=>catBar()+`<div id="lst">${cards(flt())}</div>`,mine:()=>`<div class="sec"><h3>Mis compras (${S.orders.length})</h3>${srch('Buscar por correo o nombre del cliente…')}<div id="lst">${ordList()}</div></div>`,rec:()=>`<div class="sec"><h3>Mis recargas</h3>${S.rech.length?S.rech.map(x=>recRow(x,`<span class="tag ${x.status}">${ST[x.status]}</span>`)).join(''):'<p class="mu">Sin recargas.</p>'}</div>`};
P.lst={catalog:()=>cards(flt()),mine:ordList};
P.tabs=()=>[['catalog','Catálogo'],['mine','Mis compras'],['rec','Mis recargas']];
const buyM=p=>`<h3>Confirmar compra</h3>${pimg(p)}<p style="margin-top:10px">${esc(p.name)}<br><small class="mu">${p.days} días · ${p.ren?'Renovable':'No renovable'}</small><br><b>${money(p.price)}</b></p><label>Nombre del cliente (opcional, lo puedes agregar después)</label><input id="cn" maxlength="40" placeholder="Para quién es esta compra"><label>WhatsApp del cliente (opcional)</label><input id="cw" inputmode="tel" maxlength="20" placeholder="51999999999">${two(`<button data-a="cbuy" data-id="${p.id}">Comprar</button>`,cancel)}`;
const cliM=o=>`<h3>Datos del cliente</h3><p class="mu">${esc(o.pname)}</p><label>Nombre del cliente</label><input id="cn2" maxlength="40" value="${esc(o.cname||'')}"><label>WhatsApp del cliente (opcional)</label><input id="cw2" inputmode="tel" maxlength="20" value="${esc(o.cwa||'')}" placeholder="51999999999">${two(`<button data-a="scli" data-id="${o.id}">Guardar</button>`,cancel)}`;
const payHTML=k=>{const p=PAY[k];return `<div class="payb"><div class="qrb" data-a="qrz" title="Toca para ampliar"><div class="qrph"><b>QR</b></div><img src="${p.qr}" alt="QR ${p.n}" onerror="this.remove()"></div><div class="payi">${p.rows.map((r,i)=>`<div class="fld" style="margin:0 0 6px"><div><small class="mu">${r[0]}</small><div class="fv">${r[1]}</div></div>${i===0?`<button class="ghost" data-a="copy" data-t="${r[1]}">Copiar</button>`:''}</div>`).join('')}<small class="mu">Toca el QR para ampliarlo</small></div></div><p class="mu" style="text-align:center;margin:6px 0">${p.note}</p>`};
const rechM=()=>`<h3>Recargar saldo</h3><div class="tabs" style="margin:8px 0"><button id="my" data-a="pm" data-k="yape">Yape</button><button id="mb" class="ghost" data-a="pm" data-k="bin">Binance</button></div><div id="pinfo">${payHTML('yape')}</div><p class="mu">Realiza el pago y envía los datos. El administrador acreditará tu saldo al confirmarlo.</p><label>Monto a recargar (USD, mínimo $1)</label><input id="ra" type="number" min="1" step="0.01" data-i="ra"><p class="mu" style="margin:-4px 0 8px">Equivale a <b id="rs">S/ 0.00</b> (cambio 3.40)</p><label>Número de operación</label><input id="rr" maxlength="40"><div style="display:flex;gap:8px"><button data-a="srech">Enviar solicitud</button><button class="ghost" data-a="closeM">Cerrar</button></div>`;
const sentM=m=>`<h3>Solicitud registrada</h3><p class="mu">Tu recarga quedó pendiente. Envía este aviso al administrador por WhatsApp para que la apruebe más rápido.</p><div class="cred">${esc(m)}</div>${two('<button data-a="wasend">Enviar por WhatsApp</button>','<button class="ghost" data-a="closeM">Cerrar</button>')}`;
let lastMsg='';
Object.assign(A,{
  buy:d=>{const p=prd(d.id);if(!p||!(S.free[p.id]||[]).length)return toast('Producto sin stock');if(S.bal<p.price)return toast('Saldo insuficiente. Recarga para continuar');modal(buyM(p))},
  cbuy:async d=>{
    const p=prd(d.id),cn=val('cn'),cw=wa9(val('cw'));closeM();toast('Procesando compra…');
    const r=await buy(p,cn,cw);
    modal(ordM(ord(r.oid)||{id:r.oid,sid:r.sid,pname:p.name,img:p.img,days:p.days,ren:p.ren,price:p.price,cname:cn,cwa:cw}));
  },
  cli:d=>modal(cliM(ord(d.id))),
  scli:async d=>{await saveCli(d.id,val('cn2'),wa9(val('cw2')));closeM();toast('Cliente actualizado')},
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
  qrz:(d,b)=>b.classList.toggle('zoom'),
});
Object.assign(I,{ra:v=>{$('rs').textContent=sol(v||0)}});
H.paint=shellPaint;
start('catalogo');

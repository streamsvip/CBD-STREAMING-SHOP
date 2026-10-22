/* ===== Capa de datos (localStorage). Para Firebase se reemplaza load()/save() y las operaciones ===== */
const K='ds_db';
const seed=()=>({users:[{id:'u0',email:'admin@digitalstore.com',pass:'admin123',role:'admin',balance:0}],products:[],recharges:[],orders:[],settings:{wa:'',pay:'Yape / Plin: 999 999 999\nTitular: Tu nombre',qr:''}});
const load=()=>{try{const d=JSON.parse(localStorage.getItem(K));if(d&&d.users)return d}catch(e){}return seed()};
let db=load(),tab='catalog',authMode='login',view='home';
let me=null;
try{const s=sessionStorage.getItem('ds_me');if(s)me=db.users.find(u=>u.id===s)||null}catch(e){}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(db))}catch(e){toast('No se pudo guardar los datos')}};
const uid=()=>Math.random().toString(36).slice(2,10);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const RATE=3.40,MIN=1;
const PAY={yape:{n:'Yape',rows:[['Número','965730677'],['Nombre','Cristhian Eddy C. A.']],qr:'yaqr.jpeg',note:'Paga el equivalente en soles.'},bin:{n:'Binance Pay',rows:[['ID de usuario','1250169311'],['Nombre','CRB TECH SHP']],qr:'binqr.jpeg',note:'Paga el monto en dólares (USDT).'}};
let pm='yape',lastMsg='',cq='',cc='',aq='',sv='',mq='';
const mf=x=>!mq||[x.pname,x.cname,String(x.account).split('|')[0],cwa(x)].join(' ').toLowerCase().includes(mq.toLowerCase());
function cliEdit(id){const o=db.orders.find(x=>x.id===id);if(!o)return;modal(`<h3>Datos del cliente</h3><p class="mu">${esc(o.pname)}</p><label>Nombre del cliente</label><input id="cn2" maxlength="40" value="${esc(o.cname||'')}" placeholder="Nombre del cliente"><label>WhatsApp del cliente (opcional)</label><input id="cw2" inputmode="tel" value="${esc(o.cwa||'')}" placeholder="51999999999"><div class="two"><button onclick="saveCli('${id}')">Guardar</button><button class="ghost" onclick="closeM()">Cancelar</button></div>`)}
function saveCli(id){const o=db.orders.find(x=>x.id===id);let w=$('cw2').value.replace(/\D/g,'');if(w.length===9)w='51'+w;o.cname=$('cn2').value.trim();o.cwa=w;save();closeM();render();toast('Cliente actualizado')}
function prodM(id){const p=db.products.find(x=>x.id===id);if(!p)return;modal(`${pimg(p,'big')}<h2 style="font-size:20px;margin:14px 0 6px">${esc(p.name)}</h2>${p.cat?`<span class="tag">${esc(p.cat)}</span>`:''}<div class="p big">${money(p.price)}</div><div class="meta" style="margin:8px 0"><span>⏱ ${p.days||30} días</span><span>${p.ren?'Renovable':'No renovable'}</span><span>Stock ${p.stock.length}</span></div><p class="desc">${esc(p.desc)||'Sin descripción.'}</p><div class="two">${me&&me.role==='client'?`<button ${p.stock.length?'':'disabled'} onclick="closeM();buy('${p.id}')">${p.stock.length?'Comprar':'Agotado'}</button>`:''}<button class="ghost" onclick="closeM()">Cerrar</button></div>`)}
function editOrd(id){const o=db.orders.find(x=>x.id===id),p=String(o.account).split('|'),g=i=>esc((p[i]||'').trim());modal(`<h3>Editar entrega</h3><p class="mu">${esc(o.pname)}. El cliente verá los datos actualizados en su panel.</p><label>Correo</label><input id="e0" value="${g(0)}"><label>Contraseña</label><input id="e1" value="${g(1)}"><div class="two"><div><label>Perfil</label><input id="e2" value="${g(2)}"></div><div><label>PIN</label><input id="e3" value="${g(3)}"></div></div><div class="two"><button onclick="saveOrd('${id}')">Guardar cambios</button><button class="ghost" onclick="closeM()">Cancelar</button></div>`)}
function saveOrd(id){const o=db.orders.find(x=>x.id===id),v=[0,1,2,3].map(i=>$('e'+i).value.trim());if(!v[0]||!v[1])return toast('El correo y la contraseña son obligatorios');if(v.some(x=>x.includes('|')))return toast('No uses el símbolo | en los datos');o.account=v.join('|');o.edited=Date.now();save();closeM();render();toast('Entrega actualizada')}
const cwa=o=>o.cwa||'';
const accMsg=o=>{const p=String(o.account).split('|'),L=['Correo','Contraseña','Perfil','PIN'],f=p.length<2?['Cuenta: '+o.account]:L.map((l,i)=>(p[i]||'').trim()?l+': '+p[i].trim():'').filter(Boolean);return '*'+o.pname+'*\n'+f.join('\n')+(o.end?'\nVigencia: '+period(o)+' ('+(o.days||30)+' días, '+(o.ren?'renovable':'no renovable')+')':'')+'\n\n¡Gracias por tu compra en CBD STREAMING SHOP!'};
function copyTxt(t){try{navigator.clipboard.writeText(t).then(()=>toast('Copiado'),()=>toast('Selecciona y copia manualmente'))}catch(e){toast('Selecciona y copia manualmente')}}
function cpAll(id){copyTxt(accMsg(db.orders.find(x=>x.id===id)))}
function sendCli(e,id){const o=db.orders.find(x=>x.id===id);let n=($('wn').value||'').replace(/\D/g,'');if(n.length===9)n='51'+n;if(n.length<10){e.preventDefault();return toast('Escribe el WhatsApp del cliente con código de país')}e.currentTarget.href='https://wa.me/'+n+'?text='+encodeURIComponent(accMsg(o))}
const flt=()=>{const q=cq.toLowerCase();return db.products.filter(p=>(!cc||p.cat===cc)&&(!q||(p.name+' '+p.desc+' '+(p.cat||'')).toLowerCase().includes(q)))};
function refreshList(){$('clist').innerHTML=catalog2(flt())}
const catBar=()=>{const c=[...new Set(db.products.map(p=>p.cat).filter(Boolean))];return `<div class="cbar"><input class="srch" placeholder="Buscar producto…" value="${esc(cq)}" oninput="cq=this.value;refreshList()"><div class="chips2"><button class="${cc?'ghost':''}" onclick="cc='';render()">Todas</button>${c.map(x=>`<button class="${cc===x?'':'ghost'}" data-c="${esc(x)}" onclick="cc=this.dataset.c;render()">${esc(x)}</button>`).join('')}</div></div>`};
const catOpts=()=>[...new Set(db.products.map(p=>p.cat).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join('');
const pf=p=>!aq||(p.name+' '+(p.cat||'')+' '+p.desc).toLowerCase().includes(aq.toLowerCase());
const sf=x=>{if(!sv)return true;const u=db.users.find(u=>u.id===x.uid)||{};return [x.pname,u.name,u.email,String(x.account).split('|')[0]].join(' ').toLowerCase().includes(sv.toLowerCase())};
function sq(id,v){if(id==='aq')aq=v;else if(id==='mq')mq=v;else sv=v;render();const i=$(id);i.focus();i.setSelectionRange(v.length,v.length)}
const fd=t=>new Date(t).toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'});
const left=o=>Math.ceil((o.end-Date.now())/864e5);
const vig=o=>{if(!o.end)return '';const l=left(o);return l>0?`<span class="tag ok">Vigente · ${l} día${l===1?'':'s'}</span>`:'<span class="tag no">Vencido</span>'};
const period=o=>o.end?`Del ${fd(o.start)} al ${fd(o.end)}`:'';
const uname=u=>u.name||(u.role==='admin'?'Administrador':u.email.split('@')[0]);
const BURG='<button class="burger" onclick="tg()" aria-label="Menú"><svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></button>';
const payHTML=k=>{const p=PAY[k];return `<div class="qrb"><div class="qrph"><b>QR de ${p.n}</b><small>${p.qr}</small></div><img src="${p.qr}" alt="QR ${p.n}" onerror="this.remove()"></div><div class="cred" style="white-space:normal">${p.rows.map((r,i)=>`<div class="fld" style="margin:0 0 6px"><div><small class="mu">${r[0]}</small><div class="fv">${r[1]}</div></div>${i===0?`<button class="ghost" onclick="copyTxt('${r[1]}')">Copiar</button>`:''}</div>`).join('')}</div><p class="mu" style="text-align:center">${p.note}</p>`};
function payM(k){pm=k;$('pinfo').innerHTML=payHTML(k);$('my').className=k==='yape'?'':'ghost';$('mb').className=k==='bin'?'':'ghost'}
const waLink=(m,w)=>{w=(w||db.settings.wa||'').replace(/\D/g,'');return w?'https://wa.me/'+w+'?text='+encodeURIComponent(m):''};
function wa(e,m){const l=waLink(m);if(!l){e.preventDefault();toast('Falta configurar el WhatsApp del administrador')}else e.currentTarget.href=l}
const usd=n=>'$'+Number(n).toFixed(2);
const sol=n=>'S/ '+(Number(n)*RATE).toFixed(2);
const money=n=>`${usd(n)} <small class="mu">(${sol(n)})</small>`;
const LOGO=`<span class="logo"><img src="logo.jpeg" alt="CBD STREAMING SHOP" onerror="this.parentNode.innerHTML='<b>CBD STREAMING</b> <span>SHOP</span>'"></span>`;
const pimg=(p,c='')=>`<div class="pw ${c}"><div class="ph">${esc((p.name||'?').trim()[0]||'?')}</div>${p.img?`<img src="${esc(p.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:''}</div>`;
const fmtAcc=a=>{const p=String(a).split('|');if(p.length<2)return a;return ['Correo','Contraseña','Perfil','PIN'].map((l,i)=>p[i]&&p[i].trim()?l+': '+p[i].trim():'').filter(Boolean).join('\n')};
const devLink=()=>'https://wa.me/51916252754?text='+encodeURIComponent('Hola Impulso Project, vi la web de CBD STREAMING SHOP y quiero información.');
const fresh=()=>{me=db.users.find(u=>u.id===me?.id)||null};
function toast(t){const e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2600)}
function modal(h){$('mbox').innerHTML=h;$('modal').classList.add('on')}
function closeM(){$('modal').classList.remove('on')}
$('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeM()});

/* ===== Autenticación ===== */
function auth(){
  const email=$('em').value.trim().toLowerCase(),pass=$('pw').value;
  if(!email||pass.length<6)return toast('Ingresa un correo y una contraseña de 6 o más caracteres');
  if(authMode==='reg'){
    const nm=$('nm').value.trim();if(nm.length<2)return toast('Escribe tu nombre de usuario');
    if(db.users.some(u=>u.email===email))return toast('Ese correo ya está registrado');
    const u={id:uid(),name:nm,email,pass,role:'client',balance:0};db.users.push(u);save();me=u;
  }else{
    const u=db.users.find(u=>u.email===email&&u.pass===pass);
    if(!u)return toast('Correo o contraseña incorrectos');me=u;
  }
  try{sessionStorage.setItem('ds_me',me.id)}catch(e){}
  tab=me.role==='admin'?'pend':'catalog';render();
}
function logout(){me=null;view='home';try{sessionStorage.removeItem('ds_me')}catch(e){}render()}
function setMode(m){authMode=m;render()}
function go(m){authMode=m;view='auth';render();window.scrollTo(0,0)}


/* ===== Cliente ===== */
function buy(pid){
  fresh();const p=db.products.find(x=>x.id===pid);
  if(!p||!p.stock.length)return toast('Producto sin stock');
  if(me.balance<p.price)return toast('Saldo insuficiente. Recarga para continuar');
  modal(`<h3>Confirmar compra</h3>${pimg(p)}<p style="margin-top:10px">${esc(p.name)}<br><small class="mu">${p.days||30} días · ${p.ren?'Renovable':'No renovable'}</small><br><b>${money(p.price)}</b></p><label>Nombre del cliente (opcional, lo puedes agregar después en Mis compras)</label><input id="cn" maxlength="40" placeholder="Para quién es esta compra"><label>WhatsApp del cliente (opcional)</label><input id="cw" inputmode="tel" placeholder="51999999999"><div style="display:flex;gap:8px"><button onclick="confirmBuy('${pid}')">Comprar</button><button class="ghost" onclick="closeM()">Cancelar</button></div>`);
}
function confirmBuy(pid){
  const cn=$('cn').value.trim();let cw=$('cw').value.replace(/\D/g,'');if(cw.length===9)cw='51'+cw;
  fresh();const p=db.products.find(x=>x.id===pid);
  if(!p||!p.stock.length||me.balance<p.price){closeM();return toast('No se pudo completar la compra')}
  const acc=p.stock.shift();me.balance-=p.price;
  const o={id:uid(),uid:me.id,pname:p.name,account:acc,img:p.img||'',ren:!!p.ren,cname:cn,cwa:cw,price:p.price,days:p.days||30,start:Date.now(),end:Date.now()+(p.days||30)*864e5,date:new Date().toLocaleString('es-PE')};
  db.orders.unshift(o);save();render();showOrder(o.id);
}
function showOrder(id){
  const o=db.orders.find(x=>x.id===id);if(!o)return;
  modal(delivery(o));
}
function cp(id){const t=$(id).textContent;try{navigator.clipboard.writeText(t).then(()=>toast('Copiado'),()=>toast('Selecciona y copia manualmente'))}catch(e){toast('Selecciona y copia manualmente')}}
function delivery(o){
  const ro=me&&me.role==='admin';
  const p=String(o.account).split('|'),L=['Correo','Contraseña','Perfil','PIN'];
  const f=p.length<2?[['Cuenta',o.account]]:L.map((l,i)=>[l,(p[i]||'').trim()]).filter(x=>x[1]);
  return `<div style="text-align:center"><div class="ck">✓</div><h3>${ro?'Datos entregados':'¡Compra exitosa!'}</h3><p class="mu" style="margin:4px 0 14px">Estos son los accesos de tu cuenta${o.edited?' · actualizados el '+fd(o.edited):''}</p></div>
  <div class="dprod dp2">${pimg({name:o.pname,img:o.img},'sm2')}<div><b>${esc(o.pname)}</b><br><small class="mu">${esc(period(o))}${o.end?' · '+(o.ren?'Renovable':'No renovable'):''}</small><br>${vig(o)}</div></div>
  ${f.map((x,i)=>`<div class="fld"><div><small class="mu">${x[0]}</small><div class="fv" id="f${i}">${esc(x[1])}</div></div>${ro?'':`<button class="ghost" onclick="cp('f${i}')">Copiar</button>`}</div>`).join('')}
  <p class="mu" style="font-size:12px;margin:12px 0">Recomendaciones: no cambies la contraseña ni el PIN, usa solo tu perfil asignado y guarda estos datos. Si tienes algún problema, escríbenos por soporte.</p>
  ${ro?'':`<button class="ghost" style="width:100%;margin-bottom:8px" onclick="cpAll('${o.id}')">Copiar todo</button>
  <div class="wbox"><label>WhatsApp del cliente (con código de país)</label><input id="wn" inputmode="tel" value="${esc(cwa(o))}" placeholder="51999999999"><a class="btn" style="display:block" href="#" target="_blank" rel="noopener" onclick="sendCli(event,'${o.id}')">Enviar por WhatsApp</a></div>`}
  <button style="width:100%;margin-top:8px" onclick="closeM()">Entendido</button>`}
function rechargeM(){pm='yape';
  const s=db.settings;
  modal(`<h3>Recargar saldo</h3><div class="tabs" style="margin:8px 0"><button id="my" onclick="payM('yape')">Yape</button><button id="mb" class="ghost" onclick="payM('bin')">Binance</button></div><div id="pinfo">${payHTML('yape')}</div>
  <p class="mu">Realiza el pago y envía los datos. El administrador acreditará tu saldo al confirmarlo.</p>
  <label>Monto a recargar (USD, mínimo $1)</label><input id="ra" type="number" min="1" step="0.01" oninput="$('rs').textContent=sol(this.value||0)"><p class="mu" style="margin:-4px 0 8px">Equivale a <b id="rs">S/ 0.00</b> (cambio 3.40)</p>
  <label>Número de operación</label><input id="rr">
  <div style="display:flex;gap:8px"><button onclick="sendRecharge()">Enviar solicitud</button><button class="ghost" onclick="closeM()">Cerrar</button></div>`);
}
function sendRecharge(){
  const a=parseFloat($('ra').value),r=$('rr').value.trim();
  if(!(a>=MIN)||!r)return toast('El monto mínimo es $1 y debes ingresar el número de operación');
  const d=new Date().toLocaleString('es-PE');
  db.recharges.unshift({id:uid(),uid:me.id,email:me.email,amount:a,ref:r,method:pm,status:'pend',date:d});
  save();if(tab==='mine')render();
  lastMsg=`Nueva solicitud de recarga\nMétodo: ${PAY[pm].n}\nCliente: ${me.email}\nMonto: ${usd(a)} (${sol(a)})\nN.º de operación: ${r}\nFecha y hora: ${d}`;
  modal(`<h3>Solicitud registrada</h3><p class="mu">Tu recarga quedó pendiente. Envía este aviso al administrador por WhatsApp para que la apruebe más rápido.</p><div class="cred">${esc(lastMsg)}</div><div class="two"><a class="btn" href="#" target="_blank" rel="noopener" onclick="wa(event,lastMsg)">Enviar por WhatsApp</a><button class="ghost" onclick="closeM()">Cerrar</button></div>`);
}
function supMsg(){return 'Hola, necesito soporte.'+(me?' Mi correo: '+me.email:'')}

/* ===== Administrador ===== */
function addProduct(){
  const n=$('pn').value.trim(),d=$('pd').value.trim(),pr=parseFloat($('pp').value),im=$('pi').value.trim(),dy=parseInt($('pdays').value),cat=$('pc').value.trim(),rn=$('pr').value==='1';
  if(!n||!(pr>0))return toast('Escribe el nombre y un precio válido');
  db.products.push({id:uid(),name:n,desc:d,img:im,days:dy>0?dy:30,cat,ren:rn,price:pr,stock:[]});save();render();toast('Producto creado. Ahora sube su stock en la lista de abajo');
}
function addStock(pid){
  const all=$('st_'+pid).value.split('\n').map(x=>x.trim()).filter(Boolean);
  const t=all.filter(l=>{const q=l.split('|');return q.length===4&&q[0].trim()&&q[1].trim()});
  if(!all.length)return toast('Pega al menos una cuenta');
  if(t.length!==all.length)return toast('Formato inválido en '+(all.length-t.length)+' línea(s). Usa correo|contraseña|perfil|pin');
  db.products.find(p=>p.id===pid).stock.push(...t.map(l=>l.split('|').map(x=>x.trim()).join('|')));save();render();toast(t.length+' cuentas agregadas');
}
function delProduct(pid){if(confirm('¿Eliminar este producto y su stock?')){db.products=db.products.filter(p=>p.id!==pid);save();render()}}
function decide(id,ok){
  const r=db.recharges.find(x=>x.id===id);if(!r||r.status!=='pend')return;
  if(ok){const u=db.users.find(x=>x.id===r.uid);if(u)u.balance+=r.amount}
  r.status=ok?'ok':'no';save();render();toast(ok?'Recarga aprobada':'Recarga rechazada');
}
function saveSettings(){db.settings.wa=$('sw').value.trim();save();toast('Configuración guardada')}

/* ===== Vistas ===== */
function catalog(){
  return catBar()+`<div id="clist">${catalog2(flt())}</div>`;
}
function catalog2(list){
  if(!list.length)return `<p class="mu">No hay productos para mostrar.</p>`;
  return `<div class="grid">${list.map(p=>`<div class="card pc" style="cursor:pointer" onclick="prodM('${p.id}')">${pimg(p)}${p.cat?`<span class="tag">${esc(p.cat)}</span>`:''}<h3>${esc(p.name)}</h3><small>${esc(p.desc)}</small><div class="p">${money(p.price)}</div><div class="meta"><span>⏱ ${p.days||30} días</span><span>${p.ren?'Renovable':'No renovable'}</span><span>Stock ${p.stock.length}</span></div>${me.role==='client'?`<button ${p.stock.length?'':'disabled'} onclick="event.stopPropagation();buy('${p.id}')">${p.stock.length?'Comprar':'Agotado'}</button>`:''}</div>`).join('')}</div>`;
}
function mine(k=0){
  const o=db.orders.filter(x=>x.uid===me.id&&mf(x)),r=db.recharges.filter(x=>x.uid===me.id);
  const L={pend:'Pendiente',ok:'Aprobada',no:'Rechazada'};
  return [`<div class="sec"><h3>Mis compras (${o.length})</h3><input id="mq" class="srch" placeholder="Buscar por correo o nombre del cliente…" value="${esc(mq)}" oninput="sq('mq',this.value)">${o.length?o.map(x=>`<div class="ord"><span class="av ${x.cname?'':'na'}">${x.cname?esc(x.cname.trim()[0].toUpperCase()):'?'}</span><div class="oi"><div class="cn">${x.cname?esc(x.cname):'<i class="mu">Sin nombre de cliente</i>'}</div><div>${esc(x.pname)} · <small class="mu">${money(x.price)}</small></div><small class="mu">${esc(String(x.account).split('|')[0])}${cwa(x)?' · '+esc(cwa(x)):''}<br>${esc(period(x)||x.date)}</small> ${vig(x)}</div><span class="oa"><button class="ghost" onclick="showOrder('${x.id}')">Ver cuenta</button><button onclick="cliEdit('${x.id}')">${x.cname?'Editar cliente':'Agregar cliente'}</button></span></div>`).join(''):'<p class="mu">Todavía no compraste nada.</p>'}</div>`,`<div class="sec"><h3>Mis recargas</h3>${r.length?r.map(x=>`<div class="row"><span>${money(x.amount)} · op. ${esc(x.ref)}<br><small class="mu">${esc(x.date)}</small></span><span class="tag ${x.status}">${L[x.status]}</span></div>`).join(''):'<p class="mu">Sin recargas.</p>'}</div>`][k];
}
function panel(k){
  const pend=db.recharges.filter(r=>r.status==='pend'),s=db.settings;
  return [`<div class="sec"><h3>Recargas pendientes (${pend.length})</h3>${pend.length?pend.map(r=>`<div class="row"><span>${esc(r.email)}<br><small class="mu">${r.method?PAY[r.method].n+' · ':''}${money(r.amount)} · op. ${esc(r.ref)} · ${esc(r.date)}</small></span><span style="display:flex;gap:6px"><button class="ok" onclick="decide('${r.id}',true)">Aceptar</button><button class="no" onclick="decide('${r.id}',false)">Rechazar</button></span></div>`).join(''):'<p class="mu">No hay recargas por revisar.</p>'}</div>`,`<div class="sec card"><h3>Crear producto</h3>
    <div class="two"><div><label>Nombre</label><input id="pn"></div><div><label>Precio (USD)</label><input id="pp" type="number" min="0" step="0.01"></div></div>
    <label>Descripción</label><textarea id="pd" rows="3"></textarea>
    <div class="two"><div><label>Categoría</label><input id="pc" list="cl" placeholder="Streaming, Música…"><datalist id="cl">${catOpts()}</datalist></div><div><label>¿Renovable?</label><select id="pr"><option value="1">Sí, renovable</option><option value="0">No renovable</option></select></div></div>
    <div class="two"><div><label>Duración (días)</label><input id="pdays" type="number" min="1" value="30"></div><div><label>Link de la imagen (opcional)</label><input id="pi" placeholder="https://..."></div></div>
    <button onclick="addProduct()">Crear producto</button></div>
  <div class="sec"><h3>Productos y stock (${db.products.length})</h3><input id="aq" class="srch" placeholder="Buscar producto o categoría…" value="${esc(aq)}" oninput="sq('aq',this.value)">${db.products.length?db.products.filter(pf).map(p=>`<div class="card" style="margin-bottom:10px">${pimg(p,'sm')}<div class="row" style="border:0;padding:0"><b>${esc(p.name)} · ${money(p.price)} · ${p.days||30} días · ${p.ren?'Renovable':'No renovable'}${p.cat?' · '+esc(p.cat):''}</b><span><span class="tag">Stock ${p.stock.length}</span> <button class="ghost" onclick="editM('${p.id}')">Editar</button> <button class="no" onclick="delProduct('${p.id}')">Eliminar</button></span></div><label>Subir stock: una cuenta por línea con el formato correo|contraseña|perfil|pin</label><textarea id="st_${p.id}" rows="3" placeholder="correo@mail.com|clave123|Perfil 1|1234"></textarea><button class="ghost" onclick="addStock('${p.id}')">Agregar cuentas</button></div>`).join(''):'<p class="mu">Crea tu primer producto arriba.</p>'}</div>`,`<div class="sec card"><h3>Configuración</h3>
    <label>WhatsApp del soporte (con código de país, por ejemplo 51999999999)</label><input id="sw" value="${esc(s.wa)}">
    
    
    <button onclick="saveSettings()" style="margin-top:10px">Guardar configuración</button></div>`][k];
}
function landing(){
  const feat=db.products.slice(0,6);
  return `<div class="top">${LOGO}<div class="r"><button class="ghost out" onclick="go('login')">Ingresar</button><button class="out" onclick="go('reg')">Registrarme</button>${BURG}</div></div><div id="dw" class="dw"><div class="dov" onclick="tg()"></div><aside class="dp"><button onclick="go('reg')">Crear cuenta gratis</button><button class="ghost" onclick="go('login')">Ingresar</button></aside></div>
  <section class="hero"><div class="badge">Entrega inmediata · Pagos con Yape y Binance</div><h1>Tus plataformas de streaming a <span>precios increíbles</span></h1><p>Cuentas de entretenimiento con entrega automática. Recarga saldo, elige tu plataforma y recibe tus accesos en segundos.</p><div class="cta"><button onclick="go('reg')">Crear cuenta gratis</button><button class="ghost" onclick="go('login')">Ya tengo cuenta</button></div><div class="stats"><div><b>Inmediata</b><small>Entrega automática</small></div><div><b>Yape · Binance</b><small>Medios de pago</small></div><div><b>WhatsApp</b><small>Soporte directo</small></div></div></section>
  <div class="wrap"><div class="chips"><span>Netflix</span><span>Disney+</span><span>Prime Video</span><span>Max</span><span>Spotify</span><span>Crunchyroll</span><span>YouTube Premium</span><span>Paramount+</span></div>
  <p class="mu" style="text-align:center;margin:0 0 30px">Consulta disponibilidad y precios dentro del catálogo.</p>
  ${feat.length?`<div class="sec"><h3>Productos disponibles</h3><div class="grid">${feat.map(p=>`<div class="card">${pimg(p)}<h3>${esc(p.name)}</h3><small>${esc(p.desc)}</small><div class="p">${money(p.price)}</div><small>${p.stock.length?'Disponible':'Agotado'}</small></div>`).join('')}</div><p class="mu">Inicia sesión para comprar.</p></div>`:''}
  <div class="sec"><h3>Por qué comprar con nosotros</h3><div class="grid"><div class="card"><h3>Entrega inmediata</h3><small>Compras y ves tu cuenta al instante, sin esperar a nadie.</small></div><div class="card"><h3>Precios bajos</h3><small>Plataformas populares a una fracción del precio oficial.</small></div><div class="card"><h3>Soporte por WhatsApp</h3><small>Si algo falla, te atendemos directamente.</small></div></div></div>
  <div class="sec"><h3>Cómo funciona</h3><div class="grid steps"><div class="card"><h3>Regístrate</h3><small>Crea tu cuenta con tu correo.</small></div><div class="card"><h3>Recarga saldo</h3><small>Paga y envía tu número de operación. Se acredita al confirmarlo.</small></div><div class="card"><h3>Compra y disfruta</h3><small>Elige tu plataforma y recibe tus accesos al momento.</small></div></div></div></div>
  <div class="foot"><p>¿Dudas antes de comprar?</p><a class="btn" href="#" target="_blank" rel="noopener" onclick="wa(event,'Hola, quiero información sobre CBD STREAMING SHOP')">Escríbenos por WhatsApp</a><p style="font-size:13px">© CBD STREAMING SHOP</p><a class="dev" href="${devLink()}" target="_blank" rel="noopener">Desarrollado por Impulso project</a></div>`;
}
function drawer(tabs,ad){return `<div id="dw" class="dw"><div class="dov" onclick="tg()"></div><aside class="dp"><div class="usr big"><span class="av">${esc(uname(me)[0].toUpperCase())}</span><span><b>${esc(uname(me))}</b><br><small class="mu">${esc(me.email)}</small></span></div>${ad?'':`<p class="bal" id="bal2" style="text-align:center;margin:0"></p><button onclick="tg();rechargeM()">Recargar saldo</button>`}<div class="dn" id="dn"></div><button class="ghost" onclick="logout()">Cerrar sesión</button></aside></div>`}
function tg(){$('dw').classList.toggle('on')}
function cliM(id){const u=db.users.find(x=>x.id===id),o=db.orders.filter(x=>x.uid===id);modal(`<h3>${esc(uname(u))}</h3><p class="mu">${esc(u.email)}</p><h3 style="font-size:15px;margin:10px 0 4px">Compras (${o.length})</h3>${o.length?o.map(x=>`<div class="row"><span>${esc(x.pname)}<br><small class="mu">${esc(period(x)||x.date)}</small></span>${vig(x)}</div>`).join(''):'<p class="mu">Sin compras todavía.</p>'}<button class="ghost" style="width:100%;margin-top:10px" onclick="closeM()">Cerrar</button>`)}
function adminView(){
  if(tab==='pend')return panel(0)+rhist();
  if(tab==='prod')return panel(1);
  if(tab==='conf')return panel(2);
  if(tab==='cli')return clients();
  if(tab==='sales')return sales();
  return catalog();
}
function rhist(){const h=db.recharges.filter(r=>r.status!=='pend'),L={ok:'Aprobada',no:'Rechazada'};return `<div class="sec"><h3>Historial de recargas</h3>${h.length?h.map(r=>`<div class="row"><span>${esc(r.email)}<br><small class="mu">${r.method?PAY[r.method].n+' · ':''}${money(r.amount)} · ${esc(r.date)}</small></span><span class="tag ${r.status}">${L[r.status]}</span></div>`).join(''):'<p class="mu">Sin movimientos todavía.</p>'}</div>`}
function clients(){const c=db.users.filter(u=>u.role==='client');return `<div class="sec"><h3>Clientes (${c.length})</h3>${c.length?c.map(u=>`<div class="row"><span><b>${esc(uname(u))}</b> · ${esc(u.email)}<br><small class="mu">${u.wa?'WhatsApp '+esc(u.wa)+' · ':''}Saldo: ${money(u.balance)}</small></span><span style="display:flex;gap:6px"><button class="ghost" onclick="cliM('${u.id}')">Ver compras</button><button class="ghost" onclick="balM('${u.id}')">Gestionar saldo</button></span></div>`).join(''):'<p class="mu">Aún no hay clientes registrados.</p>'}</div>`}
function balM(id){const u=db.users.find(x=>x.id===id);modal(`<h3>Saldo del cliente</h3><p>${esc(u.email)}<br><b>Actual: ${money(u.balance)}</b></p><label>Monto (USD)</label><input id="bm" type="number" min="0" step="0.01"><div class="two"><button class="ok" onclick="setBal('${id}','add')">Agregar</button><button onclick="setBal('${id}','set')">Establecer saldo</button></div><button class="ghost" style="width:100%;margin-top:8px" onclick="closeM()">Cancelar</button>`)}
function setBal(id,m){const v=parseFloat($('bm').value);if(!(v>=0))return toast('Ingresa un monto válido');const u=db.users.find(x=>x.id===id);u.balance=m==='add'?u.balance+v:v;save();closeM();render();toast('Saldo actualizado')}
function sales(){const o=db.orders.filter(sf),em=id=>(db.users.find(u=>u.id===id)||{}).email||'—';return `<div class="sec"><h3>Historial de compras (${o.length})</h3><input id="sv" class="srch" placeholder="Buscar por correo, nombre o producto…" value="${esc(sv)}" oninput="sq('sv',this.value)"><p class="mu">Total vendido: <b>${money(o.reduce((s,x)=>s+x.price,0))}</b></p>${o.length?o.map(x=>`<div class="row"><span>${esc(x.pname)}<br><small class="mu">Comprador: ${esc(uname(db.users.find(u=>u.id===x.uid)||{email:'—'}))} · ${esc(em(x.uid))}<br>${esc(period(x)||x.date)}</small> ${vig(x)}</span><span style="display:flex;gap:6px;align-items:center"><b>${money(x.price)}</b><button class="ghost" onclick="showOrder('${x.id}')">Ver</button><button class="ghost" onclick="editOrd('${x.id}')">Editar</button></span></div>`).join(''):'<p class="mu">Todavía no hay ventas.</p>'}</div>`}
function editM(id){const p=db.products.find(x=>x.id===id);modal(`<h3>Editar producto</h3><label>Nombre</label><input id="en" value="${esc(p.name)}"><label>Precio (USD)</label><input id="ep" type="number" min="0" step="0.01" value="${p.price}"><label>Descripción</label><textarea id="ed" rows="4">${esc(p.desc)}</textarea><label>Categoría</label><input id="ec" list="cl2" value="${esc(p.cat||'')}"><datalist id="cl2">${catOpts()}</datalist><label>¿Renovable?</label><select id="er"><option value="1" ${p.ren?'selected':''}>Sí, renovable</option><option value="0" ${p.ren?'':'selected'}>No renovable</option></select><label>Duración (días)</label><input id="edy" type="number" min="1" value="${p.days||30}"><label>Link de la imagen</label><input id="ei" value="${esc(p.img||'')}"><div class="two"><button onclick="saveEdit('${id}')">Guardar cambios</button><button class="ghost" onclick="closeM()">Cancelar</button></div>`)}
function saveEdit(id){const p=db.products.find(x=>x.id===id),n=$('en').value.trim(),pr=parseFloat($('ep').value);if(!n||!(pr>0))return toast('El nombre y un precio válido son obligatorios');Object.assign(p,{name:n,price:pr,desc:$('ed').value.trim(),img:$('ei').value.trim(),days:parseInt($('edy').value)||30,cat:$('ec').value.trim(),ren:$('er').value==='1'});save();closeM();render();toast('Producto actualizado')}
let shellFor=null;
function setTab(t){tab=t;const d=$('dw');if(d)d.classList.remove('on');render(true)}
function navPaint(tabs){const h=tabs.map(t=>`<button class="${tab===t[0]?'':'ghost'}" onclick="setTab('${t[0]}')">${t[1]}</button>`).join('');$('nav').innerHTML=h;$('dn').innerHTML=h}
function render(anim){
  const a=$('app');
  if(!me&&view==='home'){shellFor=null;a.innerHTML=landing();return}
  if(!me){
    shellFor=null;a.innerHTML=`<div class="auth"><div style="text-align:center">${LOGO}</div><h2 style="text-align:center;margin:16px 0 2px;font-size:20px">${authMode==='login'?'Bienvenido de vuelta':'Crea tu cuenta'}</h2><p class="mu" style="text-align:center;margin:0 0 4px">${authMode==='login'?'Ingresa para ver el catálogo y tus compras.':'Regístrate para comprar y recargar saldo.'}</p>
    <div class="tabs"><button class="${authMode==='login'?'':'ghost'}" onclick="setMode('login')">Ingresar</button><button class="${authMode==='reg'?'':'ghost'}" onclick="setMode('reg')">Registrarme</button></div>
    ${authMode==='reg'?'<label>Nombre de usuario</label><input id="nm" autocomplete="nickname" maxlength="24">':''}<label>Correo</label><input id="em" type="email" autocomplete="email"><label>Contraseña</label><input id="pw" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')auth()">
    <button style="width:100%" onclick="auth()">${authMode==='login'?'Entrar':'Crear cuenta'}</button><button class="ghost" style="width:100%;margin-top:8px" onclick="view='home';render()">Volver al inicio</button>${authMode==='login'?'<p class="mu" style="font-size:12px;text-align:center">Demo admin: admin@digitalstore.com / admin123</p>':''}<div style="text-align:center;margin-top:10px"><a class="dev" href="${devLink()}" target="_blank" rel="noopener">Desarrollado por Impulso project</a></div></div>`;return;
  }
  fresh();const ad=me.role==='admin';
  const tabs=ad?[['pend','Recargas'],['prod','Productos'],['cli','Clientes'],['sales','Ventas'],['conf','Config'],['catalog','Catálogo']]:[['catalog','Catálogo'],['mine','Mis compras'],['rec','Mis recargas']];
  if(shellFor!==me.id||!$('view')){
    shellFor=me.id;anim=true;
    a.innerHTML=`<div class="top">${LOGO}<div class="r">${ad?'':`<span class="bal" id="bal1"></span><button class="rc" onclick="rechargeM()">Recargar</button>`}<span class="usr"><span class="av">${esc(uname(me)[0].toUpperCase())}</span><span class="un">${esc(uname(me))}</span></span><button class="ghost out" onclick="logout()">Salir</button>${BURG}</div></div>${drawer(tabs,ad)}<div class="wrap"><div class="tabs nav" id="nav"></div><div id="view"></div></div>`;
  }
  navPaint(tabs);
  ['bal1','bal2'].forEach(i=>{const e=$(i);if(e)e.innerHTML='Saldo: '+money(me.balance)});
  const v=$('view');
  v.innerHTML=ad?adminView():tab==='mine'?mine():tab==='rec'?mine(1):catalog();
  if(anim){v.classList.remove('in');void v.offsetWidth;v.classList.add('in');window.scrollTo(0,0)}
}
render();

import {auth,db,collection,doc,getDoc,setDoc,addDoc,updateDoc,deleteDoc,writeBatch,onSnapshot,query,where,serverTimestamp as ts,increment,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut} from './firebase.js';
import {S,ms} from './core.js';
let subs=[];
const on=(q,f)=>subs.push(onSnapshot(q,f,e=>console.warn('Firestore:',e.code)));
const arr=s=>s.docs.map(d=>({id:d.id,...d.data()}));
const by=a=>a.sort((x,y)=>ms(y.createdAt)-ms(x.createdAt));
/* ---- escuchas en tiempo real ---- */
export function pub(r){
  onSnapshot(collection(db,'products'),s=>{S.prods=arr(s);r()},()=>{});
  onSnapshot(doc(db,'settings','main'),s=>{S.wa=s.data()?.wa||'';r()},()=>{});
}
export const unlisten=()=>{subs.splice(0).forEach(f=>f())};
export function priv(r){
  const u=S.me.uid,c=n=>S.adm?collection(db,n):query(collection(db,n),where('uid','==',u));
  on(doc(db,'users',u),s=>{S.bal=s.data()?.balance||0;S.name=s.data()?.name||'';r()});
  on(query(collection(db,'stock'),where('sold','==',false)),s=>{S.free={};s.docs.forEach(d=>(S.free[d.data().pid]??=[]).push(d.id));r()});
  on(c('orders'),s=>{S.orders=by(arr(s));r();if(!S.adm)fetchSec(S.orders.slice(0,40).map(o=>o.sid)).then(r)});
  on(c('recharges'),s=>{S.rech=by(arr(s));r()});
  if(S.adm){
    on(collection(db,'users'),s=>{S.users=arr(s);r()});
    on(collection(db,'secrets'),s=>{S.sec={};s.docs.forEach(d=>S.sec[d.id]=d.data().account);r()});
  }
}
export async function fetchSec(ids){
  await Promise.all(ids.filter(i=>i&&!(i in S.sec)).map(async i=>{try{S.sec[i]=(await getDoc(doc(db,'secrets',i))).data()?.account||''}catch{}}));
}
/* ---- autenticación ---- */
export const login=(e,p)=>signInWithEmailAndPassword(auth,e,p);
export const logout=()=>signOut(auth);
export async function register(name,e,p){
  const c=await createUserWithEmailAndPassword(auth,e,p);
  await setDoc(doc(db,'users',c.user.uid),{name,email:c.user.email,role:'client',balance:0,createdAt:ts()});
}
export const isAdmin=async u=>{try{return (await getDoc(doc(db,'admins',u.uid))).exists()}catch{return false}};
/* ---- cliente ---- */
export async function buy(p,cname,cwa){
  const ids=[...(S.free[p.id]||[])];
  if(!ids.length)throw 'Producto sin stock';
  if(S.bal<p.price)throw 'Saldo insuficiente. Recarga para continuar';
  for(let t=0;t<3&&ids.length;t++){
    const sid=ids.splice(Math.random()*ids.length|0,1)[0],o=doc(collection(db,'orders')),b=writeBatch(db);
    b.set(o,{uid:S.me.uid,pid:p.id,sid,pname:p.name,price:p.price,days:p.days,ren:p.ren,img:p.img||'',cname,cwa,createdAt:ts()});
    b.update(doc(db,'stock',sid),{sold:true,buyer:S.me.uid,order:o.id});
    b.update(doc(db,'users',S.me.uid),{balance:increment(-p.price),lastOrder:o.id});
    try{await b.commit();await fetchSec([sid]);return {oid:o.id,sid}}catch(e){if(e.code!=='permission-denied')throw e}
  }
  throw 'No se pudo completar la compra, intenta de nuevo';
}
export const saveCli=(id,cname,cwa)=>updateDoc(doc(db,'orders',id),{cname,cwa});
export const recharge=(amount,ref)=>setDoc(doc(db,'recharges',S.pm+'_'+ref),{uid:S.me.uid,email:S.me.email,amount,method:S.pm,ref,status:'pend',createdAt:ts()})
  .catch(e=>{throw e.code==='permission-denied'?'Ese número de operación ya fue registrado o los datos no son válidos':e});
/* ---- administrador ---- */
export async function decide(id,ok){
  const r=S.rech.find(x=>x.id===id);if(!r||r.status!=='pend')return;
  const b=writeBatch(db);
  b.update(doc(db,'recharges',id),{status:ok?'ok':'no',reviewedAt:ts(),reviewedBy:S.me.uid});
  if(ok)b.update(doc(db,'users',r.uid),{balance:increment(r.amount)});
  await b.commit();
}
export async function saveProd(id,p){
  if(!p.name||p.name.length>80||!(p.price>0&&p.price<=1000)||!(p.days>=1&&p.days<=3650))throw 'Revisa: nombre (máx 80), precio (0 a 1000) y días (1 a 3650)';
  if(p.desc.length>2000||p.cat.length>40||p.img.length>500)throw 'Descripción máx 2000, categoría máx 40 e imagen máx 500 caracteres';
  id?await updateDoc(doc(db,'products',id),p):await addDoc(collection(db,'products'),p);
}
export const delProd=id=>deleteDoc(doc(db,'products',id));
export async function addStock(pid,lines){
  for(let i=0;i<lines.length;i+=8){
    const b=writeBatch(db);
    lines.slice(i,i+8).forEach(l=>{const s=doc(collection(db,'stock'));b.set(s,{pid,sold:false,buyer:null,order:null});b.set(doc(db,'secrets',s.id),{account:l})});
    await b.commit();
  }
}
export const saveAcc=(sid,account)=>setDoc(doc(db,'secrets',sid),{account});
export async function setBal(u,mode,v){
  const nv=mode==='add'?u.balance+v:v,b=writeBatch(db);
  b.update(doc(db,'users',u.id),{balance:nv});
  b.set(doc(collection(db,'balanceLogs')),{uid:u.id,by:S.me.uid,mode,amount:v,before:u.balance,after:nv,createdAt:ts()});
  await b.commit();
}
export const saveWa=wa=>setDoc(doc(db,'settings','main'),{wa});

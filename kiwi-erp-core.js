/* KIWI ERP CORE - additive layer for the existing Firebase/Firestore project.
 * Does not replace legacy collections. It adds ERP collections and idempotent posting.
 */
(function(g){
'use strict';
const CFG={
  collections:{inventory:'inventory',recipes:'recipes',suppliers:'suppliers',purchases:'purchases',purchaseItems:'purchase_items',
    stock:'stock_movements',accounts:'accounts',journals:'journal_entries',postings:'erp_postings',audit:'audit_logs',
    roles:'erp_roles',staff:'staff_roles',shifts:'cash_shifts',offline:'erp_offline_queue',settings:'erp_settings'},
  accounts:{cash:'1100',bank:'1200',inventory:'1300',sales:'4100',cogs:'5100',expenses:'6000',payables:'2100'}
};
let _db=null;
if(g.firebase&&g.firebase.auth){g.firebase.auth().signInAnonymously().catch(e=>console.warn('KIWI ERP auth',e));}
function db(){ if(_db) return _db; if(g.db) return (_db=g.db); if(g.firebase&&firebase.apps&&firebase.apps.length) return (_db=firebase.firestore()); throw new Error('Firebase/Firestore غير مهيأ'); }
function n(v){const x=Number(v);return Number.isFinite(x)?x:0;}
function clean(v){return String(v??'').trim();}
function now(){return new Date().toISOString();}
function serverTS(){return firebase.firestore.FieldValue.serverTimestamp();}
function uuid(){return (crypto&&crypto.randomUUID)?crypto.randomUUID():'erp-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
async function hashPin(pin){const data=new TextEncoder().encode(String(pin));const h=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function verifyPin(pin,hash){return (await hashPin(pin))===String(hash||'');}
function idb(){return new Promise((resolve,reject)=>{const r=indexedDB.open('kiwi-erp-offline-v1',1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('queue'))d.createObjectStore('queue',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function queueOffline(type,payload){try{const d=await idb();await new Promise((res,rej)=>{const tx=d.transaction('queue','readwrite');tx.objectStore('queue').put({id:uuid(),type,payload,createdAt:now()});tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}catch(e){console.warn('offline queue failed',e);}}
async function drainOffline(){if(!navigator.onLine)return;let d;try{d=await idb();}catch{return;}const rows=await new Promise((res,rej)=>{const tx=d.transaction('queue','readonly');const q=tx.objectStore('queue').getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error);});for(const row of rows){try{if(row.type==='invoice')await processInvoice(row.payload);await new Promise((res,rej)=>{const tx=d.transaction('queue','readwrite');tx.objectStore('queue').delete(row.id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}catch(e){console.warn('ERP sync deferred',e);break;}}}
window.addEventListener('online',drainOffline);

async function audit(action,entity,entityId,data){try{await db().collection(CFG.collections.audit).add({action,entity,entityId:String(entityId||''),data:data||{},createdAt:serverTS(),createdAtClient:now(),source:'kiwi-erp'});}catch(e){console.warn('audit',e);}}
function money(v){return n(v).toLocaleString('en-US')+' د.ع';}
function itemsOf(o){return Array.isArray(o?.items)?o.items:Array.isArray(o?.orderItems)?o.orderItems:[];}
function orderTotal(o){return n(o?.total) || itemsOf(o).reduce((s,x)=>s+n(x.qty)*n(x.price),0);}
async function getInventoryMap(){const s=await db().collection(CFG.collections.inventory).get();const m=new Map();s.docs.forEach(d=>m.set(d.id,{id:d.id,...d.data()}));return m;}
async function findRecipe(menuItem, recipeCache){const name=clean(menuItem.name||menuItem.title||menuItem.item||''); if(!name)return null; if(recipeCache.has(name))return recipeCache.get(name);let q=await db().collection(CFG.collections.recipes).where('menuName','==',name).limit(1).get();let r=q.empty?null:{id:q.docs[0].id,...q.docs[0].data()};if(!r){q=await db().collection(CFG.collections.recipes).where('name','==',name).limit(1).get();r=q.empty?null:{id:q.docs[0].id,...q.docs[0].data()};}recipeCache.set(name,r);return r;}
async function validateInvoice(input){
 const orders=Array.isArray(input.orders)?input.orders:[];
 const inventory=await getInventoryMap(),recipeCache=new Map(),need=new Map();
 for(const o of orders){for(const it of (o.items||[])){const qty=Math.max(0,n(it.qty||it.quantity||0));if(!qty)continue;const recipe=await findRecipe(it,recipeCache);if(!recipe||!Array.isArray(recipe.items))continue;for(const ri of recipe.items){const iid=clean(ri.inventoryId||ri.stockId||ri.itemId),rq=n(ri.qty);if(!iid||rq<=0)continue;need.set(iid,(need.get(iid)||0)+qty*rq);}}}
 const shortages=[];for(const [iid,q] of need){const x=inventory.get(iid);if(!x)shortages.push('مادة غير موجودة: '+iid);else if(n(x.qty)-q<0&&x.allowNegative!==true)shortages.push((x.name||iid)+' — المتوفر '+n(x.qty)+' والمطلوب '+q);}
 if(shortages.length)throw new Error('المخزون غير كافٍ: '+shortages.join('، '));
 return{ok:true,requirements:[...need.entries()]};
}
async function processInvoice(input){
 const inv=input.invoiceNumber||input.id||('INV-'+Date.now());
 const invoice={invoiceNumber:inv,total:n(input.total),orders:Array.isArray(input.orders)?input.orders:[],table:clean(input.table||input.invoiceTable||'—'),paymentMethod:clean(input.paymentMethod||'cash'),createdAt:input.createdAt||null};
 if(!invoice.orders.length&&input.order)invoice.orders=[{orderId:input.order.id||input.orderId,total:orderTotal(input.order),items:itemsOf(input.order)}];
 try{
  const d=db(),postingRef=d.collection(CFG.collections.postings).doc(inv);
  const existing=await postingRef.get();if(existing.exists&&existing.data().status==='posted')return{ok:true,duplicate:true,posting:existing.data()};
  const inventory=await getInventoryMap(),recipeCache=new Map(),stockDeltas=new Map();let cogs=0;
  for(const o of invoice.orders){for(const it of(o.items||[])){
    const qty=Math.max(0,n(it.qty));if(!qty)continue;const recipe=await findRecipe(it,recipeCache);if(!recipe||!Array.isArray(recipe.items))continue;
    for(const ri of recipe.items){const iid=clean(ri.inventoryId||ri.stockId||ri.itemId),rq=n(ri.qty);if(!iid||rq<=0)continue;const invItem=inventory.get(iid);if(!invItem)continue;const delta=qty*rq,prev=stockDeltas.get(iid)||{qty:0,cost:0,item:invItem};prev.qty+=delta;prev.cost+=delta*n(invItem.cost??invItem.price);stockDeltas.set(iid,prev);cogs+=delta*n(invItem.cost??invItem.price);}
  }}
  const lines=[{account:invoice.paymentMethod==='bank'?CFG.accounts.bank:CFG.accounts.cash,debit:invoice.total,credit:0},{account:CFG.accounts.sales,debit:0,credit:invoice.total}];
  if(cogs>0)lines.push({account:CFG.accounts.cogs,debit:cogs,credit:0},{account:CFG.accounts.inventory,debit:0,credit:cogs});
  const result=await d.runTransaction(async tx=>{
    const pSnap=await tx.get(postingRef);if(pSnap.exists&&pSnap.data().status==='posted')return{duplicate:true,posting:pSnap.data()};
    const refs=[...stockDeltas.keys()].map(iid=>d.collection(CFG.collections.inventory).doc(iid));
    const snaps=[];for(const ref of refs)snaps.push(await tx.get(ref));
    const batchValues=[];for(let i=0;i<refs.length;i++){const iid=refs[i].id,x=stockDeltas.get(iid),snap=snaps[i];if(!snap.exists)continue;const current=n(snap.data().qty),next=current-x.qty;if(next<0&&snap.data().allowNegative!==true)throw new Error('المخزون غير كافٍ للصنف: '+(snap.data().name||iid));batchValues.push({ref,iid,x,current,next});}
    tx.set(postingRef,{invoiceNumber:inv,total:invoice.total,table:invoice.table,paymentMethod:invoice.paymentMethod,cogs,stockItemCount:stockDeltas.size,status:'posted',createdAt:serverTS(),createdAtClient:now(),source:'kiwi-erp'},{merge:true});
    for(const x of batchValues){tx.update(x.ref,{qty:x.next,updatedAt:serverTS(),erpLastInvoice:inv});const sm=d.collection(CFG.collections.stock).doc();tx.set(sm,{type:'sale',referenceId:inv,inventoryId:x.iid,quantity:-x.x.qty,beforeQty:x.current,afterQty:x.next,unitCost:n(x.x.item.cost??x.x.item.price),value:x.x.cost,createdAt:serverTS(),createdAtClient:now(),source:'kiwi-erp'});}
    const jref=d.collection(CFG.collections.journals).doc(inv);const debit=lines.reduce((s,x)=>s+n(x.debit),0),credit=lines.reduce((s,x)=>s+n(x.credit),0);if(Math.abs(debit-credit)>0.0001)throw new Error('القيد المحاسبي غير متوازن');tx.set(jref,{referenceType:'sale',referenceId:inv,lines,totalDebit:debit,totalCredit:credit,createdAt:serverTS(),createdAtClient:now()},{merge:true});
    if(invoice.paymentMethod!=='bank'){const cref=d.collection('cash_movements').doc('SALE-'+inv);tx.set(cref,{type:'sale',amount:invoice.total,note:'بيع / فاتورة '+inv,invoiceNumber:inv,table:invoice.table,createdAt:serverTS(),source:'kiwi-erp-sale'},{merge:true});}
    return{duplicate:false};
  });
  if(result.duplicate)return{ok:true,duplicate:true};await audit('post_sale','invoice',inv,{total:invoice.total,cogs,stockItems:stockDeltas.size});return{ok:true,duplicate:false,cogs};
 }catch(e){if(!navigator.onLine){await queueOffline('invoice',input);return{ok:false,queued:true,error:e.message};}console.error('KIWI ERP invoice',e);return{ok:false,error:e.message};}
}
async function postExpense(x){const id=x.id||uuid(),amount=n(x.amount);if(amount<=0)throw new Error('مبلغ المصروف غير صالح');const ref=db().collection('erp_expense_postings').doc(id);if((await ref.get()).exists)return;const cash=x.pay==='تحويل'||x.pay==='بطاقة'?CFG.accounts.bank:CFG.accounts.cash;const lines=[{account:CFG.accounts.expenses,debit:amount,credit:0},{account:cash,debit:0,credit:amount}];await db().collection(CFG.collections.journals).doc('EXP-'+id).set({referenceType:'expense',referenceId:id,lines,totalDebit:amount,totalCredit:amount,createdAt:serverTS(),createdAtClient:now()});await ref.set({expenseId:id,amount,createdAt:serverTS()});await audit('post_expense','expense',id,x);}
async function postPurchase(x){const id=x.id||uuid(),amount=n(x.total||x.amount);if(amount<=0)throw new Error('مبلغ الشراء غير صالح');const ref=db().collection('erp_purchase_postings').doc(id);if((await ref.get()).exists)return;const lines=[{account:CFG.accounts.inventory,debit:amount,credit:0},{account:x.paid?CFG.accounts.cash:CFG.accounts.payables,debit:0,credit:amount}];await db().collection(CFG.collections.journals).doc('PUR-'+id).set({referenceType:'purchase',referenceId:id,lines,totalDebit:amount,totalCredit:amount,createdAt:serverTS(),createdAtClient:now()});await ref.set({purchaseId:id,amount,createdAt:serverTS()});await audit('post_purchase','purchase',id,x);}
async function openShift(staffId,openingCash){const ref=db().collection(CFG.collections.shifts).doc();await ref.set({staffId:clean(staffId),openingCash:n(openingCash),status:'open',openedAt:serverTS(),createdAtClient:now()});return ref.id;}
async function closeShift(id,actualCash){const ref=db().collection(CFG.collections.shifts).doc(id);const s=await ref.get();if(!s.exists)throw new Error('الشفت غير موجود');const x=s.data();await ref.update({actualCash:n(actualCash),status:'closed',closedAt:serverTS(),difference:n(actualCash)-n(x.openingCash)});await audit('close_shift','cash_shift',id,{actualCash});}
async function backup(names){const out={version:1,createdAt:now(),collections:{}};for(const name of names||Object.values(CFG.collections)){try{const s=await db().collection(name).get();out.collections[name]=s.docs.map(d=>({id:d.id,data:d.data()}));}catch(e){out.collections[name]=[];}}const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kiwi-erp-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);return out;}
async function report(){const [inv,exp,jou,pur]=await Promise.all([db().collection('invoices').get(),db().collection('expenses').get(),db().collection(CFG.collections.journals).get(),db().collection('purchases').get()]);let sales=0,cogs=0;inv.forEach(d=>sales+=n(d.data().total));jou.forEach(d=>{const x=d.data();if(x.referenceType==='sale')x.lines?.forEach(l=>{if(l.account===CFG.accounts.cogs)cogs+=n(l.debit);});});let expenses=0;exp.forEach(d=>expenses+=n(d.data().amount));let purchases=0;pur.forEach(d=>purchases+=n(d.data().total||d.data().amount));return {sales,cogs,expenses,purchases,grossProfit:sales-cogs,netProfit:sales-cogs-expenses};}
g.KIWI_ERP={CFG,db,hashPin,verifyPin,audit,validateInvoice,processInvoice,postExpense,postPurchase,openShift,closeShift,backup,report,drainOffline,money,orderTotal,itemsOf};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',drainOffline);else drainOffline();
})(window);

/* KIWI Enhancements v2026.09.26 — additive compatibility layer */
(function(){
'use strict';
const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const isCustomer=page==='index.html'||page==='';
const isCaptain=page.includes('captain');
const isCashier=page==='cashier.html';
const isAdmin=page==='admin.html';
const db=()=>window.kiwiDB||(window.firebase&&firebase.firestore?firebase.firestore():null);
const ready=()=>window.kiwiReady&&typeof window.kiwiReady.then==='function'?window.kiwiReady:Promise.resolve();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function css(){
 if(document.getElementById('kiwi-enhancements-style'))return;
 const st=document.createElement('style');st.id='kiwi-enhancements-style';
 st.textContent=`
 .kiwi-overlay{position:fixed;inset:0;background:#0009;z-index:100000;display:none;align-items:center;justify-content:center;padding:15px;direction:rtl}
 .kiwi-overlay.show{display:flex}.kiwi-box{width:min(520px,100%);background:#fffdf8;border:1px solid #c9a45b;border-radius:22px;padding:20px;box-shadow:0 25px 80px #0005}
 .kiwi-box h3{margin:0 0 12px;color:#173f2b}.kiwi-box input,.kiwi-box select,.kiwi-box textarea{width:100%;box-sizing:border-box;padding:11px;border:1px solid #d7cfbf;border-radius:11px;margin:5px 0 10px;font:inherit}
 .kiwi-box .row{display:flex;gap:8px}.kiwi-box button{border:0;border-radius:11px;padding:10px 14px;font-weight:900;cursor:pointer}
 .kiwi-service-page{display:none}.kiwi-service-page.active{display:block}
 .kiwi-service-list{display:grid;gap:9px}.kiwi-service-card{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;border:2px solid #c9a45b;border-radius:14px;padding:11px;box-shadow:0 7px 24px #0002}
 .kiwi-service-card button{border:0;border-radius:10px;background:#173f2b;color:#fff;padding:8px 12px;font-weight:900;cursor:pointer}
 .kiwi-small-action{border:0!important;border-radius:10px!important;padding:8px 11px!important;font-weight:900!important;cursor:pointer!important}
 .kiwi-discount-action{background:#f0d58c!important;color:#17130b!important}.kiwi-cancel-action{background:#9b2c2c!important;color:#fff!important}
 .kiwi-admin-discount{margin-top:7px;width:100%;background:#f0d58c;color:#17130b;border:0;border-radius:9px;padding:8px;font-weight:900;cursor:pointer}
 .kiwi-takeaway-alert{position:fixed;top:64px;left:10px;right:10px;z-index:10001;display:none;background:#9b2c2c;color:#fff;border-radius:14px;padding:12px;text-align:center;font-weight:900;box-shadow:0 12px 35px #0004}
 .kiwi-takeaway-alert.show{display:block}.kiwi-takeaway-alert button{margin-right:8px;border:0;border-radius:9px;padding:7px 11px;font-weight:900;cursor:pointer}
 .dark-mode .kiwi-box{background:#151a16;color:#f4f0e6;border-color:#596457}.dark-mode .kiwi-box h3{color:#f0d58c}.dark-mode .kiwi-box input,.dark-mode .kiwi-box select,.dark-mode .kiwi-box textarea{background:#0d110e;color:#f4f0e6;border-color:#596457}
 `;
 document.head.appendChild(st);
}
function money(n){return Number(n||0).toLocaleString('en-US')+' IQD'}

function staffOverlay(){
 let wrap=document.getElementById('kiwiStaffOverlay');
 if(wrap)return wrap;
 wrap=document.createElement('div');wrap.className='kiwi-overlay';wrap.id='kiwiStaffOverlay';
 wrap.innerHTML=`<div class="kiwi-box"><h3 id="kiwiStaffTitle">إدارة الفاتورة</h3><div id="kiwiStaffBody"></div><div class="row"><button id="kiwiStaffSave" style="background:#173f2b;color:#fff">حفظ</button><button id="kiwiStaffClose" style="background:#eee">إغلاق</button></div></div>`;
 document.body.appendChild(wrap);wrap.querySelector('#kiwiStaffClose').onclick=()=>wrap.classList.remove('show');
 return wrap;
}
async function getOrdersForTable(table){
 const local=Array.isArray(window.kiwiAllOrders)?window.kiwiAllOrders:[];
 const localRows=local.filter(o=>String(o.table??o.table_number??o.tableNumber??'')===String(table)&&!['billed','cancelled'].includes(String(o.status||'')));
 if(localRows.length)return localRows;
 await ready();const x=db();if(!x)return[];
 const seen=new Map();
 try{const s=await x.collection('orders').where('table_number','==',Number(table)).get();s.docs.forEach(d=>seen.set(d.id,{id:d.id,...d.data()}))}catch(e){}
 try{const s=await x.collection('orders').where('table','==',String(table)).get();s.docs.forEach(d=>seen.set(d.id,{id:d.id,...d.data()}))}catch(e){}
 return [...seen.values()].filter(o=>!['billed','cancelled'].includes(String(o.status||'')));
}
async function applyDiscount(ids,type,value,actor){
 await ready();const x=db();if(!x)throw Error('Firebase غير جاهز');
 const refs=[];let baseTotal=0;
 for(const id of ids){const snap=await x.collection('orders').doc(id).get();if(!snap.exists)continue;const o=snap.data()||{};const base=Number(o.originalTotal??o.total??0);baseTotal+=Math.max(0,base);refs.push({id,base})}
 if(!refs.length)throw Error('ماكو طلبات مفتوحة لهذه الطاولة');
 value=Math.max(0,Number(value||0));if(!Number.isFinite(value))throw Error('قيمة الخصم غير صحيحة');
 const totalDiscount=type==='percent'?Math.min(baseTotal,baseTotal*value/100):Math.min(baseTotal,value);
 let allocated=0;const batch=x.batch();
 refs.forEach((r,i)=>{
  const alloc=i===refs.length-1?Math.max(0,totalDiscount-allocated):Math.round(totalDiscount*(r.base/baseTotal));
  allocated+=alloc;
  batch.update(x.collection('orders').doc(r.id),{
   originalTotal:r.base,
   discount:alloc,
   discountType:type,
   discountValue:value,
   billDiscount:alloc,
   billDiscountType:type,
   finalTotal:Math.max(0,r.base-alloc),
   billDiscountTotal:totalDiscount,
   discountAppliedBy:actor,
   discountAppliedAt:firebase.firestore.FieldValue.serverTimestamp(),
   updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  });
 });
 await batch.commit();
 return {baseTotal,totalDiscount,finalTotal:Math.max(0,baseTotal-totalDiscount)};
}
window.kiwiOpenDiscountForTable=async function(table){
 const orders=await getOrdersForTable(table);
 if(!orders.length){alert('ماكو طلبات مفتوحة بهذه الطاولة.');return}
 const ov=staffOverlay();
 ov.querySelector('#kiwiStaffTitle').textContent='🏷️ خصم — طاولة '+table;
 const current=orders.reduce((s,o)=>s+Number(o.finalTotal??o.total??0),0);
 ov.querySelector('#kiwiStaffBody').innerHTML=`<div style="font-weight:900;margin-bottom:8px">المجموع الحالي: ${money(current)}</div>
 <label>نوع الخصم</label><select id="kiwiDiscountType"><option value="percent">نسبة مئوية %</option><option value="amount">مبلغ ثابت د.ع</option></select>
 <label>قيمة الخصم</label><input id="kiwiDiscountValue" type="number" min="0" step="0.01" placeholder="مثلاً 10 أو 5000">
 <small style="display:block;color:#777">يُطبق قبل إصدار الفاتورة، وتظهر قيمته بالفاتورة المطبوعة.</small>`;
 ov.querySelector('#kiwiStaffSave').onclick=async()=>{
  try{
   const type=ov.querySelector('#kiwiDiscountType').value,value=Number(ov.querySelector('#kiwiDiscountValue').value||0);
   const r=await applyDiscount(orders.map(o=>o.id),type,value,isCaptain?'captain':isCashier?'cashier':'admin');
   ov.classList.remove('show');alert(`تم تطبيق الخصم ${money(r.totalDiscount)}. المجموع بعد الخصم ${money(r.finalTotal)} ✅`);
   if(typeof window.renderAll==='function')window.renderAll();
   if(typeof window.renderTableModal==='function')window.renderTableModal();
  }catch(e){alert(e.message||'تعذر تطبيق الخصم')}
 };
 ov.classList.add('show');
};
window.kiwiOpenDiscountForOrder=async function(id){
 const ov=staffOverlay();await ready();const x=db();if(!x)return;
 const snap=await x.collection('orders').doc(id).get();if(!snap.exists){alert('الطلب غير موجود');return}
 const o={id,...snap.data()},base=Number(o.originalTotal??o.total??0);if(['billed','cancelled'].includes(String(o.status||''))){alert('الخصم متاح قبل إصدار الفاتورة فقط.');return}
 ov.querySelector('#kiwiStaffTitle').textContent='🏷️ خصم — الطلب #'+id.slice(-6);
 ov.querySelector('#kiwiStaffBody').innerHTML=`<div style="font-weight:900;margin-bottom:8px">المجموع: ${money(base)}</div><label>نوع الخصم</label><select id="kiwiDiscountType"><option value="percent">نسبة مئوية %</option><option value="amount">مبلغ ثابت د.ع</option></select><label>قيمة الخصم</label><input id="kiwiDiscountValue" type="number" min="0" step="0.01">`;
 ov.querySelector('#kiwiStaffSave').onclick=async()=>{try{const r=await applyDiscount([id],ov.querySelector('#kiwiDiscountType').value,Number(ov.querySelector('#kiwiDiscountValue').value||0),isAdmin?'admin':isCashier?'cashier':'captain');ov.classList.remove('show');alert(`تم تطبيق الخصم ${money(r.totalDiscount)} ✅`);if(typeof window.dashboard==='function')window.dashboard();}catch(e){alert(e.message||'تعذر تطبيق الخصم')}};
 ov.classList.add('show');
};
window.kiwiCancelOrder=async function(id,role='captain'){
 const reason=prompt('اكتب سبب إلغاء الطلب:');if(!reason||!reason.trim())return;
 try{await ready();const x=db();await x.collection('orders').doc(id).update({status:'cancelled',cancelReason:reason.trim(),cancelledBy:role,cancelledAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});if(typeof window.renderAll==='function')window.renderAll();if(typeof window.renderTableModal==='function')window.renderTableModal();}catch(e){alert('تعذر إلغاء الطلب: '+(e.message||'خطأ'))}
};

function serviceRequests(){
 if(!isCaptain)return;
 const ensurePage=(id,title,kind)=>{
  let sec=document.getElementById(id);
  if(!sec){
   sec=document.createElement('section');sec.id=id;sec.className='captain-panel kiwi-service-page';
   sec.innerHTML=`<div class="section-title">${title}</div><div class="kiwi-service-list"></div>`;
   document.querySelector('main')?.appendChild(sec);
  }
  return sec.querySelector('.kiwi-service-list');
 };
 const helpList=ensurePage('serviceHelpPanel','🙋 الطاولات التي تحتاجك','help');
 const billList=ensurePage('serviceBillPanel','🧾 الطاولات التي تطلب الحساب','bill');
 function show(kind){
  const id=kind==='help'?'serviceHelpPanel':'serviceBillPanel';
  if(typeof window.showCaptainPanel==='function')window.showCaptainPanel(id);
  else{document.querySelectorAll('.captain-panel').forEach(x=>x.classList.remove('active'));document.getElementById(id)?.classList.add('active')}
 }
 window.kiwiOpenServicePage=show;
 async function handle(id,col){
  try{await ready();const x=db();await x.collection(col).doc(id).update({status:'handled',handledAt:firebase.firestore.FieldValue.serverTimestamp()});}catch(e){console.warn(e)}
 }
 function render(rows){
  const help=rows.filter(r=>r.requestType!=='bill'),bill=rows.filter(r=>r.requestType==='bill');
  helpList.innerHTML=help.length?help.map(r=>`<div class="kiwi-service-card"><div><b>🙋 طاولة ${esc(r.table||r.table_number||'—')}</b><small style="display:block;color:#777">طلب مساعدة</small></div><button data-id="${esc(r.id)}" data-col="${esc(r._collection)}">تم التعامل</button></div>`).join(''):'<div class="empty">ماكو طاولات تحتاجك حالياً.</div>';
  billList.innerHTML=bill.length?bill.map(r=>`<div class="kiwi-service-card"><div><b>🧾 طاولة ${esc(r.table||r.table_number||'—')}</b><small style="display:block;color:#777">تطلب الحساب</small></div><button data-id="${esc(r.id)}" data-col="${esc(r._collection)}">تم التعامل</button></div>`).join(''):'<div class="empty">ماكو طاولات تطلب الحساب حالياً.</div>';
  document.querySelectorAll('#serviceHelpPanel [data-id],#serviceBillPanel [data-id]').forEach(b=>b.onclick=async()=>{await handle(b.dataset.id,b.dataset.col);b.closest('.kiwi-service-card')?.remove()});
 }
 let seen=new Set(),first=true;
 ready().then(()=>{
  const x=db();if(!x)return;
  const merge=()=>{
   x.collection('service_requests').where('status','==','new').onSnapshot(s=>{
    const rows=s.docs.map(d=>({id:d.id,...d.data(),_collection:'service_requests'})).filter(r=>r.table||r.table_number);
    const fresh=rows.filter(r=>!seen.has(r.id));if(!first&&fresh.length){const r=fresh[0];window.kiwiAlertCustom?.(r.requestType==='bill'?'🧾 طاولة تطلب الحساب':'🙋 طاولة تحتاجك',`طاولة ${r.table||r.table_number||'—'}`,'service',20000,'service-'+r.id)}fresh.forEach(r=>seen.add(r.id));window.__kiwiServiceRows=rows;render(rows.concat(window.__kiwiServiceOrders||[]));
   },()=>{});
   x.collection('orders').where('status','==','service_new').onSnapshot(s=>{
    const rows=s.docs.map(d=>({id:d.id,...d.data(),_collection:'orders'})).filter(r=>r.isServiceRequest&&(r.table||r.table_number));
    const fresh=rows.filter(r=>!seen.has(r.id));if(!first&&fresh.length){const r=fresh[0];window.kiwiAlertCustom?.(r.requestType==='bill'?'🧾 طاولة تطلب الحساب':'🙋 طاولة تحتاجك',`طاولة ${r.table||r.table_number||'—'}`,'service',20000,'service-'+r.id)}fresh.forEach(r=>seen.add(r.id));window.__kiwiServiceOrders=rows;render((window.__kiwiServiceRows||[]).concat(rows));
   },()=>{});
  };merge();setTimeout(()=>first=false,1800);
 });
}
function takeawaySound(){
 if(!isCashier)return;
 let banner=document.getElementById('kiwiTakeawayAlert');
 if(!banner){banner=document.createElement('div');banner.id='kiwiTakeawayAlert';banner.className='kiwi-takeaway-alert';banner.innerHTML='🚚 طلب سفري جديد وصل للكاشير <button type="button">تم الاستلام</button>';document.body.appendChild(banner);banner.querySelector('button').onclick=()=>{banner.classList.remove('show');window.kiwiStopAlert?.('takeaway-ui')}}
 let first=true,seen=new Set();
 ready().then(()=>{const x=db();if(!x)return;x.collection('orders').where('status','==','pending').onSnapshot(s=>{
  const rows=s.docs.map(d=>({id:d.id,...d.data()})).filter(o=>{const t=String(o.table??o.table_number??'').trim();return !t||t==='—'||t.toLowerCase()==='takeaway'||t==='سفري'});
  const fresh=rows.filter(o=>!seen.has(o.id));
  if(!first&&fresh.length){banner.classList.add('show');window.kiwiAlertCustom?.('🚚 طلب سفري جديد','وصل طلب سفري جديد للكاشير','takeaway',20000,'takeaway-ui');}
  seen=new Set(rows.map(o=>o.id));first=false;
 },()=>{});
 });
}
function adminTools(){
 if(!isAdmin)return;
 setTimeout(()=>{
  const tools=document.getElementById('adminTools');if(tools&&!document.getElementById('kiwiResetMonth')){
   const b=document.createElement('button');b.id='kiwiResetMonth';b.className='danger';b.textContent='🗓️ تصفير مبيعات الشهر';
   b.onclick=async()=>{if(!confirm('تسجيل نقطة تصفير مبيعات الشهر؟ الطلبات القديمة لن تُحذف.'))return;try{await ready();await db().collection('system_settings').doc('sales_reset').set({monthResetAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});alert('تم تصفير مبيعات الشهر في اللوحة.');if(typeof window.dashboard==='function')window.dashboard()}catch(e){alert('تعذر تصفير الشهر: '+e.message)}};
   const day=[...tools.querySelectorAll('button')].find(x=>x.textContent.includes('تصفير مبيعات اليوم'));day?.after(b);
  }
 },800);
}
function adminDiscountButtons(){
 if(!isAdmin)return;
 const mo=new MutationObserver(()=>{
  document.querySelectorAll('#adminOrdersBox .order-card').forEach(card=>{
   if(card.querySelector('.kiwi-admin-discount'))return;
   const m=card.querySelector('.order-number')?.textContent?.match(/#([A-Za-z0-9_-]+)/);if(!m)return;
   const found=(window.realtimeOrders||[]).find(o=>String(o.id).endsWith(m[1]));const id=found?.id;
   if(!id||['billed','cancelled'].includes(String(found.status||'')))return;
   const b=document.createElement('button');b.className='kiwi-admin-discount';b.textContent='🏷️ خصم قبل الفاتورة';b.onclick=()=>window.kiwiOpenDiscountForOrder(id);
   card.appendChild(b);
  });
  document.querySelectorAll('#tableMonitor .table-box.busy').forEach(card=>{
   if(card.querySelector('.kiwi-admin-discount'))return;
   const n=card.querySelector('b')?.textContent?.match(/\d+/)?.[0];if(!n)return;
   const b=document.createElement('button');b.className='kiwi-admin-discount';b.textContent='🏷️ خصم الطاولة';b.onclick=()=>window.kiwiOpenDiscountForTable(n);card.appendChild(b);
  });
 });
 mo.observe(document.body,{childList:true,subtree:true});
}
function adminFeedbackReset(){
 if(!isAdmin)return;
 const mo=new MutationObserver(()=>{
  document.querySelectorAll('.section').forEach(sec=>{
   const h=sec.querySelector('h3');if(!h||h.textContent.trim()!=='⭐ آراء الزبائن'||sec.querySelector('#kiwiResetFeedback'))return;
   const b=document.createElement('button');b.id='kiwiResetFeedback';b.className='danger';b.textContent='🗑️ تصفير آراء الزبائن';b.style.cssText='margin-bottom:10px;width:100%;border:0;border-radius:10px;padding:9px;font-weight:900;cursor:pointer';
   b.onclick=async()=>{if(!confirm('تصفير جميع آراء الزبائن من Firebase ومن الجهاز؟'))return;try{await ready();const x=db();const s=await x.collection('feedback').limit(500).get();const batch=x.batch();s.docs.forEach(d=>batch.delete(d.ref));await batch.commit();localStorage.removeItem('kiwi_feedback_v1');alert('تم تصفير آراء الزبائن.');if(typeof window.dashboard==='function')window.dashboard()}catch(e){alert('تعذر تصفير الآراء: '+(e.message||'خطأ'))}};
   h.after(b);
  });
 });
 mo.observe(document.body,{childList:true,subtree:true});
}
function customerPolish(){
 if(!isCustomer)return;
 const st=document.createElement('style');st.id='kiwi-customer-polish';
 st.textContent=`
  body:not(.dark-mode) .smart-results-box{background:#fffdf8;color:#182019;border-color:#c9a45b}
  body:not(.dark-mode) .cart-bar{background:#173f2b;color:#fff;border-color:#c9a45b}.cart-open{background:#f0d58c;color:#17130b}
  body:not(.dark-mode) .lang-toggle{background:#173f2b;color:#f0d58c}
  body.dark-mode .contact{background:#0d110e!important;color:#fff!important}.dark-mode .contact-card{background:linear-gradient(135deg,#111811,#182019)!important;color:#fff!important;border-color:#6c765f!important}
  body.dark-mode .welcome-strip .inner{background:linear-gradient(135deg,#151a16,#0f140f)!important;color:#fff!important;border-color:#596457!important}.dark-mode .welcome-strip h3,.dark-mode .welcome-strip p{color:#fff!important}
  body.dark-mode .section-promo{background:linear-gradient(135deg,#171d18,#101510)!important;color:#fff!important;border-color:#596457!important}.dark-mode .section-promo-kicker,.dark-mode .section-promo p{color:#fff!important}
  body.dark-mode .promo-banner .box,.dark-mode .grill-top-box{border-color:#596457!important}
  body:not(.dark-mode) .contact-card{box-shadow:0 18px 55px #0002}.dark-mode .contact-card{box-shadow:0 18px 55px #0008}
  body:not(.dark-mode) .smart-result{background:#fff;color:#182019;border:1px solid #e4d7bf}
  body:not(.dark-mode) .smart-result button{background:#173f2b;color:#f0d58c}
  body.dark-mode .search input{color:#fff!important;background:#0c120f!important;border-color:#6c765f!important}
  body.dark-mode .search input::placeholder{color:#d7d4ca!important}
  body.dark-mode .smart-results-box{background:#101510!important;color:#fff!important;border-color:#6c765f!important}
  body.dark-mode .smart-result{background:#171d18!important;color:#fff!important;border-color:#596457!important}
  body.dark-mode .smart-result b,body.dark-mode .smart-result small{color:#fff!important}
  body.dark-mode .smart-result .sr-price{color:#f0d58c!important}
  body.dark-mode .smart-result button{background:#f0d58c!important;color:#17130b!important}
  body.dark-mode .cart-bar{background:#0a1710!important;border-color:#f0d58c!important;color:#fff!important}
  body.dark-mode .cart-summary,.dark-mode .cart-total{color:#fff!important}.dark-mode .cart-open{background:#f0d58c!important;color:#17130b!important}
  body.dark-mode .theme-toggle{background:#f0d58c!important;color:#17130b!important}
  body.dark-mode .kiwi-feedback-launch{background:#f0d58c!important;color:#17130b!important}
  body.dark-mode .kiwi-service-button,.dark-mode .contact,.dark-mode .contact-box{background:#182019!important;color:#fff!important}
  body.dark-mode footer,.dark-mode .contact-section{color:#fff!important}
  body.dark-mode .kiwi-mood,.dark-mode #kiwiMoodWrap,.dark-mode .mood-box,.dark-mode .mood-card{background:#171d18!important;color:#fff!important;border-color:#596457!important}
  body.dark-mode .kiwi-mood *,.dark-mode #kiwiMoodWrap *{color:#fff!important}
  body.dark-mode .kiwi-mood button,.dark-mode #kiwiMoodWrap button{background:#f0d58c!important;color:#17130b!important}
  .smart-result{display:flex;align-items:center;justify-content:space-between;gap:9px;padding:10px;border-radius:13px;margin:6px 0}
  .smart-result>div{flex:1;min-width:0}.smart-result button{border:0;border-radius:9px;padding:7px 10px;font-weight:900;cursor:pointer;white-space:nowrap}
  .kiwi-delivery-choice{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.kiwi-delivery-choice button{border:0;border-radius:13px;padding:12px;font-weight:900;cursor:pointer}
  .kiwi-whatsapp{background:#8baa55;color:#fff}.kiwi-direct{background:#53633a;color:#fff}
 `;
 document.head.appendChild(st);
}
css();customerPolish();serviceRequests();takeawaySound();adminTools();adminDiscountButtons();adminFeedbackReset();
})();

/* KIWI Enhancements v2026.09 — additive realtime layer */
(function(){
'use strict';
const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const isCustomer=page==='index.html'||page==='';
const isCaptain=page.includes('captain');
const isCashier=page==='cashier.html';
const isAdmin=page==='admin.html';
const isDept=page==='department.html'||['kitchen.html','barista.html','grills.html','appetizers.html','hookah.html'].includes(page);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const db=()=>window.kiwiDB||(window.firebase&&firebase.firestore?firebase.firestore():null);
const ready=()=>window.kiwiReady&&typeof window.kiwiReady.then==='function'?window.kiwiReady:Promise.resolve();

function css(){
 const st=document.createElement('style'); st.id='kiwi-enhancements-style';
 st.textContent=`
 .kiwi-timer{font-size:12px;font-weight:900;color:#53633a;background:#eef2e7;border-radius:999px;padding:4px 8px;display:inline-block;margin:4px 0}
 .kiwi-priority{display:inline-block;padding:4px 8px;border-radius:999px;background:#f0d58c;color:#17130b;font-weight:900;font-size:11px}
 .kiwi-vip{background:#5d3b80;color:#fff}.kiwi-urgent{background:#9b2c2c;color:#fff}.kiwi-normal{background:#e9eee8;color:#38513d}
 .kiwi-service-panel{position:fixed;top:78px;left:10px;right:10px;z-index:9997;display:none;gap:8px;flex-wrap:wrap;justify-content:center;direction:rtl}
 .kiwi-service-panel.show{display:flex}.kiwi-service-item{background:#fff;border:2px solid #c9a45b;border-radius:14px;padding:10px 12px;box-shadow:0 7px 24px #0002;font:900 12px Arial;color:#222;cursor:pointer}
 .kiwi-service-item small{display:block;color:#777;margin-top:3px}
 .kiwi-discount-btn{position:fixed;bottom:14px;left:14px;z-index:9996;border:0;border-radius:14px;background:#173f2b;color:#fff;padding:11px 14px;font-weight:900;box-shadow:0 8px 22px #0003;cursor:pointer}
 .kiwi-overlay{position:fixed;inset:0;background:#0009;z-index:100000;display:none;align-items:center;justify-content:center;padding:15px;direction:rtl}
 .kiwi-overlay.show{display:flex}.kiwi-box{width:min(520px,100%);background:#fffdf8;border:1px solid #c9a45b;border-radius:22px;padding:20px;box-shadow:0 25px 80px #0005}
 .kiwi-box h3{margin:0 0 12px;color:#173f2b}.kiwi-box input,.kiwi-box select,.kiwi-box textarea{width:100%;box-sizing:border-box;padding:11px;border:1px solid #d7cfbf;border-radius:11px;margin:5px 0 10px;font:inherit}
 .kiwi-box .row{display:flex;gap:8px}.kiwi-box button{border:0;border-radius:11px;padding:10px 14px;font-weight:900;cursor:pointer}
 .kiwi-closed-banner{position:fixed;top:0;left:0;right:0;z-index:99999;background:#9b2c2c;color:#fff;text-align:center;padding:10px;font-weight:900;display:none}
 .kiwi-closed-banner.show{display:block}
 .all-table.busy,.table-card.has-orders{border-color:#c9a45b!important;background:#fff9e8!important}
 .all-table.busy.kiwi-ready-table,.table-card.has-orders.kiwi-ready-table{border-color:#2f8f4e!important;background:#eaf7ed!important}
 .all-table.kiwi-priority-table,.table-card.kiwi-priority-table{box-shadow:0 0 0 3px #9b2c2c55}
 `;
 document.head.appendChild(st);
}
function money(n){return Number(n||0).toLocaleString('en-US')+' IQD'}

function dedupeMenu(){
 if(!isCustomer)return;
 const seen=new Map();
 document.querySelectorAll('.dish-item').forEach(el=>{
   const key=(String(el.dataset.name||el.querySelector('.ar')?.textContent||'').trim().replace(/\s+/g,' ')+'|'+String(el.dataset.price||'')).toLowerCase();
   if(!key||key==='|')return;
   if(seen.has(key)){el.remove();return}
   seen.set(key,el);
 });
}
function addCustomerFeatures(){
 if(!isCustomer)return;
 const banner=document.createElement('div');banner.className='kiwi-closed-banner';banner.id='kiwiClosedBanner';banner.textContent='🚫 المطعم مغلق حالياً — لا يمكن استقبال الطلبات';document.body.appendChild(banner);
 let open=true;
 const apply=()=>{document.querySelectorAll('.add-cart,#invoiceBtn,#cartOpen').forEach(b=>{if(!b)return;b.disabled=!open;b.style.opacity=open?'':'0.55'});banner.classList.toggle('show',!open)};
 ready().then(()=>{const x=db();if(!x)return;const ref=x.collection('system_settings').doc('general');ref.onSnapshot(s=>{open=s.exists?s.data().restaurantOpen!==false:true;apply()},()=>{});});
 dedupeMenu();
 setTimeout(dedupeMenu,1200);
 new MutationObserver(()=>dedupeMenu()).observe(document.body,{childList:true,subtree:true});
 // Google Maps location + note in takeaway dialog
 const obs=new MutationObserver(()=>{
   const inp=document.getElementById('kiwiDeliveryLocation'), row=inp?.parentElement;
   if(inp&&row&&!document.getElementById('kiwiMapsBtn')){
     const b=document.createElement('button');b.id='kiwiMapsBtn';b.type='button';b.className='kiwi-location-btn';b.textContent='📍 Google Maps';
     b.onclick=()=>{if(navigator.geolocation){navigator.geolocation.getCurrentPosition(pos=>{const q='https://www.google.com/maps?q='+pos.coords.latitude+','+pos.coords.longitude;inp.value=q;},()=>{const q=prompt('الصق رابط موقعك من Google Maps أو اكتب عنوانك:');if(q)inp.value=q.slice(0,300)},{enableHighAccuracy:true,timeout:8000});}else{const q=prompt('الصق رابط موقعك من Google Maps أو اكتب عنوانك:');if(q)inp.value=q.slice(0,300)}};
     row.appendChild(b);
   }
 });
 obs.observe(document.body,{childList:true,subtree:true});
}
function priorityBadge(o){
 const p=o.priority||'normal'; const label=p==='vip'?'👑 VIP':p==='urgent'?'🚨 مستعجل':'عادي';
 return `<span class="kiwi-priority ${p==='vip'?'kiwi-vip':p==='urgent'?'kiwi-urgent':'kiwi-normal'}">${label}</span>`;
}
const timerMap=new Map();
function timerFor(id,created){
 const el=document.querySelector(`[data-kiwi-timer="${CSS.escape(String(id))}"]`);if(!el)return;
 const c=timerMap.get(String(id))||created;
 const ms=Math.max(0,Date.now()-(Number(c)||Date.now()));const sec=Math.floor(ms/1000),m=Math.floor(sec/60),s=sec%60;el.textContent='⏱️ '+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function injectTimers(){
 if(!(isCaptain||isCashier||isDept))return;
 document.querySelectorAll('[data-order-id]').forEach(card=>{
   const id=card.dataset.orderId;if(!id)return;
   if(!card.querySelector('[data-kiwi-timer]')){const e=document.createElement('span');e.className='kiwi-timer';e.dataset.kiwiTimer=id;card.insertBefore(e,card.firstChild)}
 });
}
function realtimeTimers(){
 ready().then(()=>{const x=db();if(!x)return;x.collection('orders').where('status','in',['pending','approved','preparing','ready','served']).onSnapshot(s=>s.docs.forEach(d=>{const o=d.data()||{},c=o.createdAt?.toMillis?o.createdAt.toMillis():Date.parse(o.created_at||'');if(c)timerMap.set(d.id,c)}));});
 setInterval(()=>document.querySelectorAll('[data-kiwi-timer]').forEach(el=>timerFor(el.dataset.kiwiTimer)),1000);
}
async function updateOrder(id,data){await ready();const x=db();if(!x)throw Error('Firebase غير جاهز');await x.collection('orders').doc(id).update({...data,updatedAt:firebase.firestore.FieldValue.serverTimestamp()})}

function staffOverlay(){
 const wrap=document.createElement('div');wrap.className='kiwi-overlay';wrap.id='kiwiStaffOverlay';
 wrap.innerHTML=`<div class="kiwi-box"><h3 id="kiwiStaffTitle">إدارة الطلب</h3><div id="kiwiStaffBody"></div><div class="row"><button id="kiwiStaffSave" style="background:#173f2b;color:#fff">حفظ</button><button id="kiwiStaffClose" style="background:#eee">إغلاق</button></div></div>`;
 document.body.appendChild(wrap);wrap.querySelector('#kiwiStaffClose').onclick=()=>wrap.classList.remove('show');return wrap;
}
function addOrderControls(){
 if(!(isCaptain||isCashier||isAdmin))return;
 const ov=staffOverlay();
 const make=(id,kind)=>{
   const title=kind==='discount'?'🏷️ خصم على الفاتورة':kind==='priority'?'⭐ أولوية الطلب':'إلغاء الطلب';
   ov.querySelector('#kiwiStaffTitle').textContent=title;
   ov.querySelector('#kiwiStaffBody').innerHTML=kind==='discount'
    ?`<label>رقم الطلب</label><input id="kiwiOrderId" value="${esc(id)}"><label>الخصم (IQD)</label><input id="kiwiDiscount" type="number" min="0" placeholder="مثلاً 5000"><small>الخصم يظهر للادمن والكاشير والكابتن ويُحسب ضمن الفاتورة.</small>`
    :kind==='priority'
    ?`<label>الأولوية</label><select id="kiwiPriority"><option value="normal">عادي</option><option value="urgent">🚨 مستعجل</option><option value="vip">👑 VIP</option></select><input id="kiwiOrderId" value="${esc(id)}">`
    :`<label>سبب الإلغاء — إلزامي</label><textarea id="kiwiCancelReason" maxlength="300" placeholder="اكتب سبب الإلغاء"></textarea><input id="kiwiOrderId" value="${esc(id)}">`;
   ov.querySelector('#kiwiStaffSave').onclick=async()=>{try{
     const oid=ov.querySelector('#kiwiOrderId').value.trim();if(!oid)throw Error('رقم الطلب مطلوب');
     if(kind==='discount'){const d=Math.max(0,Number(ov.querySelector('#kiwiDiscount').value||0));const x=db();const snap=await x.collection('orders').doc(oid).get();if(!snap.exists)throw Error('الطلب غير موجود');const o=snap.data();const base=Number(o.subtotal??o.total??0);await updateOrder(oid,{discount:d,total:Math.max(0,base-d)});}
     else if(kind==='priority')await updateOrder(oid,{priority:ov.querySelector('#kiwiPriority').value});
     else {const reason=ov.querySelector('#kiwiCancelReason').value.trim();if(!reason)throw Error('سبب الإلغاء إجباري');await updateOrder(oid,{status:'cancelled',cancelReason:reason,cancelledBy:isCaptain?'captain':isAdmin?'admin':'cashier',cancelledAt:firebase.firestore.FieldValue.serverTimestamp()});}
     ov.classList.remove('show');alert('تم الحفظ ✅');
   }catch(e){alert(e.message||'تعذر الحفظ')}}
   ov.classList.add('show');
 };
 const btn=document.createElement('button');btn.className='kiwi-discount-btn';btn.textContent='🏷️ خصم / إدارة';btn.onclick=()=>make('', 'discount');document.body.appendChild(btn);
 // add a small admin/staff toolbar button for priority/cancel
 const bar=document.createElement('div');bar.style.cssText='position:fixed;bottom:14px;right:14px;z-index:9995;display:flex;gap:6px';
 [['⭐ أولوية','priority'],['🛑 إلغاء','cancel']].forEach(([txt,k])=>{const b=document.createElement('button');b.textContent=txt;b.style.cssText='border:0;border-radius:12px;padding:10px;background:#fff;color:#222;font-weight:900;box-shadow:0 6px 20px #0003';b.onclick=()=>make(prompt('اكتب رقم الطلب')||'',k);bar.appendChild(b)});document.body.appendChild(bar);
}
function serviceRequests(){
 if(!isCaptain)return;
 const p=document.createElement('div');p.className='kiwi-service-panel';p.id='kiwiServicePanel';p.style.position='fixed';p.style.top='78px';const quick=document.createElement('div');quick.style.cssText='position:fixed;top:10px;right:10px;z-index:9998;display:flex;gap:6px;direction:rtl';[['🙋 طاولة تحتاجك','help'],['🧾 طاولات تطلب الفاتورة','bill']].forEach(([t,k])=>{const b=document.createElement('button');b.textContent=t;b.className='kiwi-service-item';b.onclick=()=>{p.classList.add('show');p.querySelectorAll('.kiwi-service-item').forEach(x=>x.style.display=(k==='bill'&&x.textContent.includes('الحساب'))||(k==='help'&&x.textContent.includes('تحتاجك'))?'':'none')};quick.appendChild(b)});document.body.appendChild(quick);document.body.appendChild(p);
 ready().then(()=>{const x=db();if(!x)return;x.collection('service_requests').where('status','==','new').onSnapshot(s=>{
   const rows=s.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.table);
   p.innerHTML=rows.map(r=>`<button class="kiwi-service-item" data-id="${esc(r.id)}">${r.requestType==='bill'?'🧾 طاولة تطلب الحساب':'🙋 طاولة تحتاجك'}<small>طاولة ${esc(r.table)}</small></button>`).join('');
   p.classList.toggle('show',rows.length>0);
   p.querySelectorAll('button').forEach(b=>b.onclick=async()=>{await x.collection('service_requests').doc(b.dataset.id).update({status:'handled',handledAt:firebase.firestore.FieldValue.serverTimestamp()});});
   if(rows.length) try{new AudioContext().resume()}catch(e){}
 },()=>{});});
}
function takeawaySound(){
 if(!isCashier)return;
 let first=true,seen=new Set();
 ready().then(()=>{const x=db();if(!x)return;x.collection('orders').where('status','==','pending').onSnapshot(s=>{
   const rows=s.docs.map(d=>({id:d.id,...d.data()})).filter(o=>!String(o.table||o.table_number||'').trim());
   if(!first&&rows.some(o=>!seen.has(o.id))){try{const C=window.AudioContext||window.webkitAudioContext,ctx=new C(),osc=ctx.createOscillator(),g=ctx.createGain();osc.frequency.value=880;g.gain.value=.18;osc.connect(g);g.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.7);}catch(e){} try{speechSynthesis.speak(new SpeechSynthesisUtterance('طلب سفري جديد عند الكاشير'));}catch(e){}}
   seen=new Set(rows.map(o=>o.id));first=false;
 });});
}
function addPriorityToCards(){
 if(!(isCaptain||isCashier))return;
 const mo=new MutationObserver(()=>{document.querySelectorAll('.ready-card,.new-card,.hall-card,.order-card').forEach(card=>{
   if(card.querySelector('.kiwi-card-actions'))return;
   const txt=card.textContent||'';const m=txt.match(/#([A-Za-z0-9_-]{6,})/);if(!m)return;
   const b=document.createElement('button');b.textContent='⭐ أولوية';b.style.cssText='border:0;border-radius:9px;padding:7px;background:#eee;font-weight:900;margin-top:6px';b.onclick=()=>{const id=prompt('رقم الطلب',m[1]);if(id){document.querySelector('.kiwi-discount-btn')?.click();}};const wrap=document.createElement('div');wrap.className='kiwi-card-actions';wrap.appendChild(b);card.appendChild(wrap);
 });injectTimers()});mo.observe(document.body,{childList:true,subtree:true});
}
function adminResetMonth(){
 if(!isAdmin)return;
 setTimeout(()=>{
   const tools=document.getElementById('adminTools');if(!tools||document.getElementById('kiwiResetMonth'))return;
   const b=document.createElement('button');b.id='kiwiResetMonth';b.className='danger';b.textContent='🗓️ تصفير مبيعات الشهر';b.onclick=async()=>{if(!confirm('تصفير مبيعات الشهر؟ لا يمكن التراجع عن العملية.'))return;await ready();const x=db();await x.collection('system_settings').doc('sales_reset').set({monthResetAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});alert('تم تسجيل نقطة تصفير الشهر. الطلبات التاريخية بقيت محفوظة.');};tools.appendChild(b);
 },1200);
}
function enhanceDept(){
 if(!isDept)return;
 // Hide an order from a department as soon as this department marks it ready.
 const oldRender=window.render;
 if(typeof oldRender==='function'){ /* source page owns render; CSS/filter patch below */ }
 const mo=new MutationObserver(()=>document.querySelectorAll('.order').forEach(card=>{const badge=card.querySelector('.badge');if(badge?.textContent.includes('جاهز'))card.style.display='none';}));
 mo.observe(document.body,{childList:true,subtree:true});
}
css();addCustomerFeatures();serviceRequests();takeawaySound();addOrderControls();addPriorityToCards();adminResetMonth();enhanceDept();
if(isCaptain||isCashier||isDept){setInterval(injectTimers,1200);realtimeTimers()}
})();

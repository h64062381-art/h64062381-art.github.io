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
 const titleFor=kind=>kind==='discount'?'🏷️ خصم على الفاتورة':kind==='priority'?'⭐ أولوية الفاتورة':'🛑 إلغاء الفاتورة';
 const openAction=(group,kind)=>{
   const ids=Array.isArray(group.ids)?group.ids.filter(Boolean):[];
   if(!ids.length)return;
   ov.querySelector('#kiwiStaffTitle').textContent=titleFor(kind);
   const target=group.label==='سفري'?'🛍️ سفري':`🪑 ${group.label}`;
   ov.querySelector('#kiwiStaffBody').innerHTML = kind==='discount'
     ? `<div style="font-weight:900;margin-bottom:8px">${target}</div>
        <label>نوع الخصم</label><select id="kiwiDiscountType"><option value="percent">نسبة مئوية %</option><option value="amount">مبلغ ثابت د.ع</option></select>
        <label>قيمة الخصم</label><input id="kiwiDiscountValue" type="number" min="0" step="0.01" placeholder="مثلاً 10 أو 5000">
        <small>الخصم مرتبط بالفاتورة نفسها، وليس برقم طلب.</small>`
     : kind==='priority'
     ? `<div style="font-weight:900;margin-bottom:8px">${target}</div>
        <label>الأولوية</label><select id="kiwiPriority"><option value="normal">عادي</option><option value="urgent">🚨 مستعجل</option><option value="vip">👑 VIP</option></select>`
     : `<div style="font-weight:900;margin-bottom:8px">${target}</div>
        <label>سبب الإلغاء — إلزامي</label><textarea id="kiwiCancelReason" maxlength="300" placeholder="اكتب سبب الإلغاء"></textarea>`;
   ov.querySelector('#kiwiStaffSave').onclick=async()=>{
     try{
       const x=db(); if(!x)throw Error('Firebase غير جاهز');
       if(kind==='priority'){
         const value=ov.querySelector('#kiwiPriority').value;
         await Promise.all(ids.map(id=>updateOrder(id,{priority:value,billPriority:value})));
       }else if(kind==='cancel'){
         const reason=ov.querySelector('#kiwiCancelReason').value.trim();
         if(!reason)throw Error('سبب الإلغاء إجباري');
         const who=isCaptain?'captain':isAdmin?'admin':'cashier';
         await Promise.all(ids.map(id=>updateOrder(id,{status:'cancelled',cancelReason:reason,cancelledBy:who,cancelledAt:firebase.firestore.FieldValue.serverTimestamp(),billCancelled:true})));
       }else{
         const type=ov.querySelector('#kiwiDiscountType').value;
         const value=Math.max(0,Number(ov.querySelector('#kiwiDiscountValue').value||0));
         if(!Number.isFinite(value))throw Error('قيمة الخصم غير صحيحة');
         const total=Number(group.total||0);
         const discount=type==='percent'?Math.min(total,total*value/100):Math.min(total,value);
         const invoiceNumber=group.invoiceNumber||'';
         if(invoiceNumber){
           const ref=x.collection('invoices').doc(invoiceNumber);
           const snap=await ref.get();
           if(snap.exists){
             const inv=snap.data()||{};
             const base=Number(inv.subtotal??inv.total??total)||total;
             await ref.set({discount,discountType:type,discountValue:value,total:Math.max(0,base-discount),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
           }
         }
         await Promise.all(ids.map(id=>updateOrder(id,{discount:discount,discountType:type,discountValue:value,billDiscount:discount,billDiscountType:type})));
       }
       ov.classList.remove('show');
       alert('تم الحفظ ✅');
     }catch(e){alert(e.message||'تعذر الحفظ')}
   };
   ov.classList.add('show');
 };

 // تظهر إدارة الأولوية/الخصم/الإلغاء فقط للفواتير التي تم إصدارها.
 const host=document.createElement('div');
 host.id='kiwiBilledManager';
 host.style.cssText='position:relative;z-index:9994;margin:12px auto;max-width:1100px;display:none;direction:rtl';
 host.innerHTML=`<div style="background:#fffdf8;border:2px solid #c9a45b;border-radius:18px;padding:12px;box-shadow:0 10px 30px #0002"><div style="font-weight:1000;font-size:17px;color:#173f2b;margin-bottom:9px">🧾 فواتير مرفوعة — إدارة الطاولة / السفري</div><div id="kiwiBilledList" style="display:grid;gap:9px"></div></div>`;
 document.body.prepend(host);
 const list=host.querySelector('#kiwiBilledList');
 const render=(groups)=>{
   if(!groups.length){host.style.display='none';list.innerHTML='';return;}
   host.style.display='block';
   list.innerHTML=groups.map((g,i)=>`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#f7f4ea;border-radius:14px;padding:10px">
     <div style="min-width:160px;flex:1"><b>${g.label==='سفري'?'🛍️ سفري':'🪑 '+esc(g.label)}</b><small style="display:block;color:#777;margin-top:3px">فاتورة مرفوعة • ${money(g.total)}</small></div>
     <button data-billed-action="priority" data-group="${i}" style="border:0;border-radius:10px;padding:9px 12px;background:#fff;font-weight:900;cursor:pointer">⭐ أولوية</button>
     <button data-billed-action="discount" data-group="${i}" style="border:0;border-radius:10px;padding:9px 12px;background:#f0d58c;font-weight:900;cursor:pointer">🏷️ خصم</button>
     <button data-billed-action="cancel" data-group="${i}" style="border:0;border-radius:10px;padding:9px 12px;background:#9b2c2c;color:#fff;font-weight:900;cursor:pointer">🛑 إلغاء</button>
   </div>`).join('');
   list.querySelectorAll('[data-billed-action]').forEach(b=>b.onclick=()=>openAction(groups[Number(b.dataset.group)],b.dataset.billedAction));
 };
 let lastGroups=[];
 ready().then(()=>{
   const x=db();if(!x)return;
   x.collection('orders').where('status','==','billed').onSnapshot(s=>{
     const map=new Map();
     s.docs.forEach(d=>{
       const o={id:d.id,...d.data()};
       const raw=String(o.table??o.table_number??o.tableNumber??'').trim();
       const label=raw&&raw!=='—'&&raw.toLowerCase()!=='takeaway'&&raw!=='سفري'?raw:'سفري';
       if(!map.has(label))map.set(label,{label,ids:[],total:0,invoiceNumber:o.invoiceNumber||''});
       const g=map.get(label);g.ids.push(o.id);g.total+=Number(o.total||0);if(!g.invoiceNumber&&o.invoiceNumber)g.invoiceNumber=o.invoiceNumber;
     });
     lastGroups=Array.from(map.values());render(lastGroups);
   },()=>render([]));
 });
}

function serviceRequests(){
 if(!isCaptain)return;
 const p=document.createElement('div');p.className='kiwi-service-panel';p.id='kiwiServicePanel';
 p.style.cssText='position:fixed;top:132px;left:10px;right:10px;z-index:9997;display:none;gap:10px;flex-wrap:wrap;justify-content:center;direction:rtl';
 const quick=document.createElement('div');quick.style.cssText='position:fixed;top:10px;right:10px;left:10px;z-index:9998;display:flex;gap:8px;justify-content:center;direction:rtl';
 [['🙋 طاولة تحتاجك','help'],['🧾 طاولات تطلب الحساب','bill']].forEach(([t,k])=>{const b=document.createElement('button');b.textContent=t;b.className='kiwi-service-item';b.style.cssText='background:#fff;border:3px solid #c9a45b;border-radius:14px;padding:12px 16px;box-shadow:0 8px 28px #0003;font:900 14px Arial;color:#222;cursor:pointer';b.onclick=()=>{p.classList.add('show');p.querySelectorAll('[data-request-type]').forEach(x=>x.style.display=x.dataset.requestType===k?'':'none')};quick.appendChild(b)});
 document.body.appendChild(quick);document.body.appendChild(p);
 let seen=new Set();let initialLoad=true;setTimeout(()=>{initialLoad=false},1500);
 function ring(text){
   try{const C=window.AudioContext||window.webkitAudioContext;if(C){const ctx=new C();const now=ctx.currentTime;[0,.35,.7,1.05].forEach((delay,i)=>{const osc=ctx.createOscillator(),g=ctx.createGain();osc.type='sine';osc.frequency.value=i%2?740:980;g.gain.setValueAtTime(.0001,now+delay);g.gain.exponentialRampToValueAtTime(.22,now+delay+.03);g.gain.exponentialRampToValueAtTime(.0001,now+delay+.22);osc.connect(g);g.connect(ctx.destination);osc.start(now+delay);osc.stop(now+delay+.24)});ctx.resume?.();}}
   catch(e){}
   try{if('speechSynthesis' in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(text||'طاولة تحتاج الكابتن'))}}catch(e){}
 }
 function render(rows){
   const unique=[];const ids=new Set();rows.forEach(r=>{if(!ids.has(r.id)){ids.add(r.id);unique.push(r)}});
   p.innerHTML=unique.map(r=>`<button class="kiwi-service-item" data-id="${esc(r.id)}" data-collection="${esc(r._collection||'service_requests')}" data-request-type="${r.requestType==='bill'?'bill':'help'}"><b>${r.requestType==='bill'?'🧾 طاولة تطلب الحساب':'🙋 طاولة تحتاجك'}</b><small>طاولة ${esc(r.table||r.table_number||'—')}</small></button>`).join('');
   p.classList.toggle('show',unique.length>0);
   p.querySelectorAll('[data-id]').forEach(b=>b.onclick=async()=>{try{const col=b.dataset.collection||'service_requests';await db().collection(col).doc(b.dataset.id).update({status:'handled',handledAt:firebase.firestore.FieldValue.serverTimestamp()});b.remove();if(!p.children.length)p.classList.remove('show')}catch(e){console.error(e)}});
 }
 ready().then(()=>{const x=db();if(!x)return;
   const merge=()=>{
     Promise.all([
       x.collection('service_requests').where('status','==','new').onSnapshot(s=>{const rows=s.docs.map(d=>({id:d.id,...d.data(),_collection:'service_requests'})).filter(r=>r.table||r.table_number);const fresh=rows.filter(r=>!seen.has(r.id));if(!initialLoad&&fresh.length)ring(fresh[0].requestType==='bill'?'طاولة تطلب الحساب':'طاولة تحتاج الكابتن');fresh.forEach(r=>seen.add(r.id));render(rows.concat(window.__kiwiServiceOrders||[]));window.__kiwiServiceRows=rows},()=>{}),
       x.collection('orders').where('status','==','service_new').onSnapshot(s=>{const rows=s.docs.map(d=>({id:d.id,...d.data(),_collection:'orders'})).filter(r=>r.isServiceRequest&&(r.table||r.table_number));const fresh=rows.filter(r=>!seen.has(r.id));if(!initialLoad&&fresh.length)ring(fresh[0].requestType==='bill'?'طاولة تطلب الحساب':'طاولة تحتاج الكابتن');fresh.forEach(r=>seen.add(r.id));window.__kiwiServiceOrders=rows;render((window.__kiwiServiceRows||[]).concat(rows))},()=>{})
     ]).catch(()=>{});
   }; merge();
 });
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

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
 .kiwi-captain-service-bar{background:#fffdf5;border:3px solid #c9a45b;border-radius:18px;padding:12px;margin:12px auto;max-width:1000px;box-shadow:0 8px 28px #0002;direction:rtl}.kiwi-captain-service-title{text-align:center;font-size:18px;font-weight:1000;color:#173f2b;margin-bottom:9px}.kiwi-captain-service-buttons{display:grid;grid-template-columns:1fr 1fr;gap:10px}.kiwi-captain-service-buttons button{background:#173f2b;color:#fff;border:0;border-radius:14px;padding:15px;font-weight:1000;font-size:16px;cursor:pointer}.kiwi-captain-service-buttons button:last-child{background:#c9a45b;color:#111}.kiwi-service-request-card{background:#fff;border:2px solid #c9a45b;border-radius:16px;padding:10px;margin:8px 0}.kiwi-service-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:7px}.kiwi-service-actions button{border:0;border-radius:10px;padding:9px 5px;font-weight:900;background:#f5f0df;cursor:pointer}
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
 const getDb=()=>db();
 const loadTargets=async(table,id)=>{
   const x=getDb(); if(!x) throw Error('Firebase غير جاهز');
   if(id){const snap=await x.collection('orders').doc(id).get(); if(!snap.exists)throw Error('الطلب غير موجود'); return [{id:snap.id,...snap.data()}]}
   const all=[];
   const snap=await x.collection('orders').where('status','in',['pending','approved','preparing','ready','served']).get();
   snap.forEach(d=>{const o={id:d.id,...d.data()};const t=String(o.table??o.table_number??o.tableNumber??'').trim();if(t&&t===String(table))all.push(o)});
   return all.sort((a,b)=>String(b.id).localeCompare(String(a.id)));
 };
 const make=async(id,kind,table)=>{
   ov.querySelector('#kiwiStaffTitle').textContent=kind==='discount'?'🏷️ خصم على الفاتورة':kind==='priority'?'⭐ أولوية الطلب':'🛑 إلغاء الطلب';
   ov.querySelector('#kiwiStaffBody').innerHTML='<div style="text-align:center;padding:12px">جاري تحميل الطلب…</div>';
   ov.classList.add('show');
   try{
     const targets=await loadTargets(table,id);
     if(!targets.length)throw Error(table?'ماكو طلبات فعالة لهذه الطاولة':'الطلب غير موجود');
     const options=targets.map(o=>`<option value="${esc(o.id)}">طلب #${esc(o.id)} — ${money(o.total??o.subtotal??0)}</option>`).join('');
     ov.querySelector('#kiwiStaffBody').innerHTML=kind==='discount'
       ?`<label>الطلب</label><select id="kiwiOrderId">${options}</select><label>نوع الخصم</label><select id="kiwiDiscountType"><option value="percent">نسبة مئوية %</option><option value="amount">مبلغ ثابت د.ع</option></select><label>قيمة الخصم</label><input id="kiwiDiscount" type="number" min="0" step="0.01" placeholder="مثلاً 10 أو 5000"><small>الخصم يظهر للأدمن والكاشير والكابتن ويُحسب مباشرة ضمن الفاتورة.</small>`
       :kind==='priority'
       ?`<label>الطلب</label><select id="kiwiOrderId">${options}</select><label>الأولوية</label><select id="kiwiPriority"><option value="normal">عادي</option><option value="urgent">🚨 مستعجل</option><option value="vip">👑 VIP</option></select>`
       :`<label>الطلب</label><select id="kiwiOrderId">${options}</select><label>سبب الإلغاء — إلزامي</label><textarea id="kiwiCancelReason" maxlength="300" placeholder="اكتب سبب الإلغاء"></textarea>`;
     ov.querySelector('#kiwiStaffSave').onclick=async()=>{try{
       const oid=ov.querySelector('#kiwiOrderId').value.trim(); if(!oid)throw Error('الطلب مطلوب');
       if(kind==='discount'){
         const value=Math.max(0,Number(ov.querySelector('#kiwiDiscount').value||0));
         const type=ov.querySelector('#kiwiDiscountType').value;
         const x=getDb(); const snap=await x.collection('orders').doc(oid).get(); if(!snap.exists)throw Error('الطلب غير موجود');
         const o=snap.data(); const base=Math.max(0,Number(o.subtotal??(Number(o.total||0)+Number(o.discount||0))));
         const d=type==='percent'?Math.min(base,base*value/100):Math.min(base,value);
         await updateOrder(oid,{discount:d,discountType:type,discountValue:value,total:Math.max(0,base-d)});
       }else if(kind==='priority') await updateOrder(oid,{priority:ov.querySelector('#kiwiPriority').value});
       else {const reason=ov.querySelector('#kiwiCancelReason').value.trim();if(!reason)throw Error('سبب الإلغاء إجباري');await updateOrder(oid,{status:'cancelled',cancelReason:reason,cancelledBy:isCaptain?'captain':isAdmin?'admin':'cashier',cancelledAt:firebase.firestore.FieldValue.serverTimestamp()});}
       ov.classList.remove('show'); alert('تم الحفظ ✅');
     }catch(e){alert(e.message||'تعذر الحفظ')}};
   }catch(e){ov.querySelector('#kiwiStaffBody').innerHTML=`<div style="padding:12px;text-align:center;color:#9b2c2c;font-weight:900">${esc(e.message||'تعذر تحميل الطلب')}</div>`;}
 };
 const btn=document.createElement('button');btn.className='kiwi-discount-btn';btn.textContent='🏷️ خصم / إدارة';btn.onclick=()=>make('', 'discount');document.body.appendChild(btn);
 const bar=document.createElement('div');bar.style.cssText='position:fixed;bottom:14px;right:14px;z-index:9995;display:flex;gap:6px;flex-wrap:wrap;max-width:55vw';
 [['⭐ أولوية','priority'],['🛑 إلغاء','cancel']].forEach(([txt,k])=>{const b=document.createElement('button');b.textContent=txt;b.style.cssText='border:0;border-radius:12px;padding:10px;background:#fff;color:#222;font-weight:900;box-shadow:0 6px 20px #0003';b.onclick=()=>make('',k);bar.appendChild(b)});document.body.appendChild(bar);
 window.kiwiOpenOrderManage=(id,kind,table)=>make(id,kind,table);
 window.kiwiAttachCardActions=function(root){
   if(!root||root.dataset.kiwiManaged==='1')return;
   const text=root.textContent||''; const m=text.match(/#([A-Za-z0-9_-]{6,})/); const id=root.dataset.orderId||m?.[1]||'';
   const table=(root.dataset.table||((text.match(/طاولة\s+([0-9]{1,3})/)||[])[1]||''));
   if(!id&&!table)return;
   const row=document.createElement('div');row.className='kiwi-card-actions';row.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:9px';
   [['🏷️ خصم','discount'],['⭐ أولوية','priority'],['🛑 إلغاء','cancel']].forEach(([label,k])=>{const b=document.createElement('button');b.textContent=label;b.style.cssText='border:0;border-radius:10px;padding:9px 6px;font-weight:900;background:#f5f0df;color:#222;cursor:pointer';b.onclick=()=>window.kiwiOpenOrderManage(id,k,table);row.appendChild(b)});
   root.appendChild(row);root.dataset.kiwiManaged='1';
 };
}
function prominentCaptainServices(){
 if(!isCaptain)return;
 const inject=()=>{
   const nav=document.querySelector('.captain-nav'); if(!nav)return;
   if(document.getElementById('kiwiCaptainServiceBar'))return;
   const bar=document.createElement('div');bar.id='kiwiCaptainServiceBar';bar.innerHTML=`<div class="kiwi-captain-service-title">🔔 خدمات الطاولات</div><div class="kiwi-captain-service-buttons"><button data-service-filter="help">🙋 طاولات تحتاجك <span id="kiwiHelpCount"></span></button><button data-service-filter="bill">🧾 طاولات تطلب الفاتورة <span id="kiwiBillCount"></span></button></div>`;
   nav.parentNode.insertBefore(bar,nav.nextSibling);
   bar.querySelectorAll('button').forEach(b=>b.onclick=()=>window.kiwiShowServiceFilter?.(b.dataset.serviceFilter));
 };
 inject(); setTimeout(inject,700);
}
function serviceRequests(){
 if(!isCaptain)return;
 const p=document.createElement('div');p.className='kiwi-service-panel';p.id='kiwiServicePanel';
 const quick=document.createElement('div');quick.id='kiwiServiceQuick';
 const show=(kind)=>{p.classList.add('show');p.dataset.filter=kind;render()};
 window.kiwiShowServiceFilter=show;
 document.body.appendChild(quick);document.body.appendChild(p);
 let cache=[];
 const render=()=>{
   const kind=p.dataset.filter||''; const rows=kind?cache.filter(r=>r.requestType===kind):cache;
   const h=cache.filter(r=>r.requestType==='help').length,b=cache.filter(r=>r.requestType==='bill').length;
   const hc=document.getElementById('kiwiHelpCount'),bc=document.getElementById('kiwiBillCount');if(hc)hc.textContent=h?`(${h})`:'';if(bc)bc.textContent=b?`(${b})`:'';
   p.innerHTML=rows.length?rows.map(r=>`<div class="kiwi-service-request-card"><button class="kiwi-service-item" data-id="${esc(r.id)}">${r.requestType==='bill'?'🧾 طاولة تطلب الفاتورة':'🙋 طاولة تحتاجك'}<small>طاولة ${esc(r.table||r.table_number||'—')}</small></button><div class="kiwi-service-actions"><button data-k="discount" data-t="${esc(r.table||r.table_number||'')}" data-id="">🏷️ خصم</button><button data-k="priority" data-t="${esc(r.table||r.table_number||'')}" data-id="">⭐ أولوية</button><button data-k="cancel" data-t="${esc(r.table||r.table_number||'')}" data-id="">🛑 إلغاء</button></div></div>`).join(''):'<div class="empty">ماكو طلبات حالياً</div>';
   p.querySelectorAll('.kiwi-service-item[data-id]').forEach(b=>b.onclick=async()=>{try{await db().collection('service_requests').doc(b.dataset.id).update({status:'handled',handledAt:firebase.firestore.FieldValue.serverTimestamp()});}catch(e){alert('تعذر تحديث الطلب')}});
   p.querySelectorAll('.kiwi-service-actions button').forEach(b=>b.onclick=()=>window.kiwiOpenOrderManage('',b.dataset.k,b.dataset.t));
 };
 ready().then(()=>{const x=db();if(!x)return;x.collection('service_requests').where('status','==','new').onSnapshot(s=>{cache=s.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.table||r.table_number);render();},()=>{});});
}
function takeawaySound(){
 if(!isCashier)return;
 let first=true,seen=new Set(),ringing=false;
 const ring20=()=>{
   if(ringing)return; ringing=true;
   try{
     const C=window.AudioContext||window.webkitAudioContext; if(!C)throw Error('no audio'); const ctx=new C(); ctx.resume?.();
     const start=ctx.currentTime, end=start+20;
     for(let t=start;t<end;t+=0.72){
       const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime((Math.floor((t-start)/0.72)%2)?660:880,t);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.18,t+0.025);g.gain.exponentialRampToValueAtTime(0.0001,t+0.32);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(Math.min(t+0.34,end));
     }
     setTimeout(()=>{try{ctx.close()}catch(e){} ringing=false},20500);
   }catch(e){ringing=false;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance('تنبيه، طلب سفري جديد عند الكاشير');u.lang='ar-IQ';u.rate=.85;u.volume=1;speechSynthesis.speak(u)}catch(_){} }
 };
 ready().then(()=>{const x=db();if(!x)return;x.collection('orders').where('status','==','pending').onSnapshot(s=>{
   const rows=s.docs.map(d=>({id:d.id,...d.data()})).filter(o=>!String(o.table||o.table_number||'').trim());
   if(!first&&rows.some(o=>!seen.has(o.id)))ring20();
   seen=new Set(rows.map(o=>o.id));first=false;
 });});
 window.addEventListener('click',()=>{}, {once:true});
}
function patchCustomerService(){
 if(!isCustomer)return;
 const send=async(type)=>{try{await ready();const x=db();if(!x)throw Error('Firebase غير جاهز');const table=(new URLSearchParams(location.search).get('table')||localStorage.getItem('kiwi_current_table')||'').trim();if(!/^\d{1,3}$/.test(table))throw Error('رقم الطاولة غير معروف');await x.collection('service_requests').add({table_number:Number(table),table,requestType:type,status:'new',createdAt:firebase.firestore.FieldValue.serverTimestamp(),source:'customer_menu'});return true}catch(e){console.error(e);return false}};
 window.kiwiSendServiceRequest=send;
 document.querySelectorAll('#kiwiServiceBar button').forEach((b,i)=>{const type=i===0?'help':'bill';const label=b.textContent;b.onclick=async()=>{b.disabled=true;const ok=await send(type);b.textContent=ok?'✓ تم إرسال الطلب':'❌ تعذر الإرسال';setTimeout(()=>{b.disabled=false;b.textContent=label},4000)}});
}
function patchBillArea(){
 if(!(isCaptain||isCashier))return;
 const run=()=>{const box=document.getElementById('billArea');if(!box||box.querySelector('.kiwi-bill-actions'))return;const title=document.getElementById('tableTitle')?.textContent||document.getElementById('invoiceTitle')?.textContent||'';const m=title.match(/طاولة\s*([0-9]{1,3})/);if(!m)return;const table=m[1];const row=document.createElement('div');row.className='kiwi-bill-actions';row.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:9px';[['🏷️ خصم','discount'],['⭐ أولوية','priority'],['🛑 إلغاء','cancel']].forEach(([t,k])=>{const b=document.createElement('button');b.textContent=t;b.onclick=()=>window.kiwiOpenOrderManage('',k,table);row.appendChild(b)});box.appendChild(row)};
 new MutationObserver(run).observe(document.body,{childList:true,subtree:true});setInterval(run,1200);
}
function cashierReadyFix(){
 if(!isCashier)return;
 const run=()=>{
   const fn=window.renderReady; if(typeof fn!=='function'||fn.__kiwiFixed)return;
   const fixed=function(){
     const sec=document.getElementById('readySection'),box=document.getElementById('readyOrders'),count=document.getElementById('readyCount');if(!sec||!box)return;
     const rows=(window.kiwiAllOrders||[]).flatMap(o=>{const ds=o.departmentStatus||{};return Object.keys(DEPT_LABELS||{}).filter(d=>ds[d]==='ready').map(dept=>({o,dept,label:(DEPT_LABELS||{})[dept]}))});
     if(count)count.textContent=rows.length?`(${rows.length})`:'';
     if(!rows.length){box.innerHTML='<div class="empty">ماكو طلبات جاهزة من الأقسام حالياً</div>';return;}
     sec.style.display='block';
     box.innerHTML=rows.map(({o,dept,label})=>{const received=!!(o.cashierReceivedDepartments||{})[dept];const items=(Array.isArray(o.items)?o.items:[]).filter(x=>String(x.department||'').toLowerCase()===dept || String(x.sectionId||'').toLowerCase()===dept);return `<div class="ready-card" data-order-id="${esc(o.id)}"><div class="ready-place">${label}</div><div class="ready-order">${isTakeawayOrderSafe(o)?'🛍️ سفري':'🪑 طاولة '+esc(tableOfSafe(o))} — الطلب <b>#${esc(o.id)}</b></div><div class="row"><span class="badge ready">🍽️ جاهز من القسم</span></div><div class="items">${items.length?items.map(x=>`${esc(x.name||'صنف')} × ${esc(x.qty||x.quantity||1)}`).join('<br>'):esc(itemTextSafe(o))}</div>${received?'<button class="green" disabled>✓ تم استلام إشعار القسم</button>':`<button class="green" onclick="acknowledgeDepartmentReady('${esc(o.id)}','${esc(dept)}',this)">استلام إشعار الجاهزية</button>`}</div>`}).join('');
   };
   fixed.__kiwiFixed=true;window.renderReady=fixed;
 };
 const isTakeawayOrderSafe=o=>!String(o?.table??o?.table_number??o?.tableNumber??'').trim();
 const tableOfSafe=o=>String(o?.table??o?.table_number??o?.tableNumber??'—');
 const itemTextSafe=o=>Array.isArray(o?.items)?o.items.map(x=>`${x.name||x.title||'صنف'} × ${x.qty||x.quantity||1}`).join(' | '):'';
 setTimeout(run,50);setInterval(run,1500);
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
css();addCustomerFeatures();patchCustomerService();serviceRequests();prominentCaptainServices();takeawaySound();addOrderControls();addPriorityToCards();patchBillArea();cashierReadyFix();adminResetMonth();enhanceDept();
if(isCaptain||isCashier||isDept){setInterval(injectTimers,1200);realtimeTimers()}
})();

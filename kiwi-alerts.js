/* KIWI Live Alerts — realtime sound + browser notifications */
(function(){
'use strict';
const ROLE=(document.body&&document.body.dataset&&document.body.dataset.kiwiRole)||location.pathname.split('/').pop().replace(/\.html?$/,'')||'page';
const DEPT=(document.body&&document.body.dataset&&document.body.dataset.kiwiDept)||'';
const CONFIG={apiKey:'AIzaSyAQ9WanobYNjUbozWQrhDBCT82-RqMMU4',authDomain:'kiwiresturant-30ff4.firebaseapp.com',projectId:'kiwiresturant-30ff4',storageBucket:'kiwiresturant-30ff4.firebasestorage.app',messagingSenderId:'329950339210',appId:'1:329950339210:web:bd072d9d7171a2d6ec4d73',measurementId:'G-K916WX9ZH8'};
let audioCtx=null,unlocked=false,first=true,stop=null,last={},customLoops=new Map();
const deptNames={kitchen:'المطبخ',barista:'الباريستا',appetizers:'المقبلات',grills:'المشاوي',hookah:'الأراكيل'};
const icon={kitchen:'🍳',barista:'☕',appetizers:'🥗',grills:'🔥',hookah:'💨'};

function beep(kind){
 if(!unlocked)return false;
 try{
  audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();
  const now=audioCtx.currentTime;
  const pattern=kind==='ready'?[880,1046,1318]:kind==='takeaway'?[740,988,740,988]:kind==='service'?[660,880,660]:[660,880];
  pattern.forEach((f,i)=>{
   const o=audioCtx.createOscillator(),g=audioCtx.createGain();
   o.type='sine';o.frequency.value=f;
   g.gain.setValueAtTime(.0001,now+i*.14);
   g.gain.exponentialRampToValueAtTime(.18,now+i*.14+.02);
   g.gain.exponentialRampToValueAtTime(.0001,now+i*.14+.12);
   o.connect(g);g.connect(audioCtx.destination);o.start(now+i*.14);o.stop(now+i*.14+.14);
  });
  return true;
 }catch(e){return false}
}
function notify(title,body,kind){
 beep(kind);
 if('Notification' in window&&Notification.permission==='granted'){
  try{new Notification(title,{body,tag:'kiwi-'+ROLE+'-'+kind,renotify:true,icon:'kiwi-icon-192.png',badge:'kiwi-icon-192.png'})}catch(e){}
 }
 try{navigator.vibrate&&navigator.vibrate(kind==='ready'?[180,80,180]:[250,80,250])}catch(e){}
}
function ringFor(key,kind,title,body,duration=20000){
 const old=customLoops.get(key);if(old)clearInterval(old.timer);
 const until=Date.now()+duration;
 notify(title,body,kind);
 const timer=setInterval(()=>{
  if(Date.now()>=until){clearInterval(timer);customLoops.delete(key);return}
  beep(kind);
 },1500);
 customLoops.set(key,{timer});
}
function stopRing(key){const x=customLoops.get(key);if(x){clearInterval(x.timer);customLoops.delete(key)}}
function unlock(){
 unlocked=true;
 try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();beep('test')}catch(e){}
 const b=document.getElementById('kiwiSoundBtn');if(b){b.textContent='🔊 الصوت مفعّل';b.classList.add('on')}
 localStorage.setItem('kiwi_sound_enabled','1');
}
async function enableNotifications(){
 if(!('Notification'in window)){alert('هذا المتصفح لا يدعم إشعارات الموقع.');return}
 try{
  const p=await Notification.requestPermission();
  const b=document.getElementById('kiwiNotifyBtn');
  if(b)b.textContent=p==='granted'?'🔔 الإشعارات مفعّلة':p==='denied'?'🚫 الإشعارات مرفوضة':'🔔 تفعيل الإشعارات';
  if(p==='granted')notify('KIWI','تم تفعيل إشعارات الطلبات','new');
 }catch(e){}
}
function toolbar(){
 if(document.getElementById('kiwiAlertsBar'))return;
 const bar=document.createElement('div');bar.id='kiwiAlertsBar';
 bar.innerHTML='<button id="kiwiSoundBtn">🔇 تفعيل صوت الطلبات</button><button id="kiwiNotifyBtn">🔔 تفعيل الإشعارات</button><span id="kiwiAlertStatus">تنبيهات مباشرة</span>';
 Object.assign(bar.style,{position:'sticky',top:'0',zIndex:'9999',display:'flex',gap:'7px',alignItems:'center',justifyContent:'center',flexWrap:'wrap',padding:'7px 9px',background:'#173f2b',color:'#fff',fontFamily:'inherit',boxShadow:'0 3px 12px #0003'});
 bar.querySelectorAll('button').forEach(x=>Object.assign(x.style,{border:0,borderRadius:'10px',padding:'8px 11px',fontWeight:'900',cursor:'pointer'}));
 bar.querySelector('#kiwiSoundBtn').onclick=unlock;bar.querySelector('#kiwiNotifyBtn').onclick=enableNotifications;
 const main=document.body.firstElementChild;document.body.insertBefore(bar,main||document.body.firstChild);
 if(localStorage.getItem('kiwi_sound_enabled')==='1'){
  setTimeout(()=>{try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();unlocked=true;const b=document.getElementById('kiwiSoundBtn');if(b){b.textContent='🔊 الصوت مفعّل';b.classList.add('on')}}catch(e){}},0);
 }
 if('Notification'in window&&Notification.permission==='granted'){const b=document.getElementById('kiwiNotifyBtn');if(b)b.textContent='🔔 الإشعارات مفعّلة'}
}
function items(o){return Array.isArray(o.items)?o.items:(Array.isArray(o.orderItems)?o.orderItems:[])}
function deptOf(x){const d=String(x&&x.department||'').toLowerCase(),s=String(x&&x.sectionId||'').toLowerCase();if(['grills','kitchen','barista','appetizers','hookah'].includes(d))return d;if(s==='grills')return'grills';if(['cold-app','hot-app'].includes(s))return'appetizers';if(['fresh','natural','soft','water','mojito','cold','milkshake','ice','hot','coffee','desserts'].includes(s))return'barista';if(['hookah','hookah-luxury','hookah-natural'].includes(s))return'hookah';return'kitchen'}
function takeaway(o){const t=String(o.table??o.table_number??o.tableNumber??'').trim();return !t||t==='—'||t.toLowerCase()==='takeaway'||t==='سفري'}
function relevant(o){
 const st=String(o.status||'');
 if(ROLE==='cashier')return ['pending','approved','preparing','ready','served'].includes(st);
 if(ROLE.startsWith('captain'))return !takeaway(o)&&!!(o.departmentStatus&&Object.values(o.departmentStatus).some(v=>v==='ready'));
 if(['kitchen','barista','appetizers','grills','hookah'].includes(ROLE))return ['approved','preparing','ready'].includes(st)&&items(o).some(x=>deptOf(x)===ROLE);
 return false;
}
function eventFor(o,prev){
 if(ROLE==='cashier'){
  if(!prev)return takeaway(o)?{k:'takeaway',t:'🚚 سفري جديد',b:'وصل طلب سفري جديد للكاشير'}:{k:'new',t:'🧾 طلب جديد',b:'وصل طلب جديد للكاشير'};
  const p=prev&&prev.departmentStatus||{},n=o.departmentStatus||{};
  for(const d of Object.keys(n))if(n[d]==='ready'&&p[d]!=='ready')return{k:'ready',t:'🔔 قسم جاهز',b:icon[d]+' '+deptNames[d]+' جهز الطلب'};
 }
 if(['kitchen','barista','appetizers','grills','hookah'].includes(ROLE)){
  if(!prev)return{k:'new',t:icon[ROLE]+' طلب جديد',b:'وصل طلب جديد إلى قسم '+deptNames[ROLE]};
  const a=(prev.departmentStatus||{})[ROLE],b=(o.departmentStatus||{})[ROLE];
  if(a!==b&&b==='ready')return{k:'ready',t:'✅ جاهز',b:'تم تجهيز الطلب في '+deptNames[ROLE]};
 }
 if(ROLE.startsWith('captain')){
  const p=prev&&prev.departmentStatus||{},n=o.departmentStatus||{};
  for(const d of Object.keys(n))if(n[d]==='ready'&&p[d]!=='ready')return{k:'ready',t:'🔔 قسم جاهز',b:icon[d]+' '+deptNames[d]+' جهز الطلب'};
 }
 return null;
}
async function start(){
 if(!window.firebase)return;
 try{
  if(!firebase.apps.length)firebase.initializeApp(CONFIG);
  try{await firebase.auth().signInAnonymously()}catch(e){}
  const db=firebase.firestore();let q=db.collection('orders');
  if(ROLE==='cashier')q=q.where('status','in',['pending','approved','preparing','ready','served']);
  else if(['kitchen','barista','appetizers','grills','hookah'].includes(ROLE))q=q.where('status','in',['approved','preparing','ready']);
  else if(ROLE.startsWith('captain'))q=q.where('status','in',['approved','preparing','ready','served']);
  stop=q.onSnapshot(snap=>{
   const docs=snap.docs.map(d=>({id:d.id,...d.data()}));
   docs.forEach(o=>{
    if(!relevant(o))return;
    const key=o.id,prev=last[key],ev=eventFor(o,prev);last[key]=o;
    if(first)return;
    if(ev){
     if(ev.k==='takeaway')ringFor('takeaway-'+key,'takeaway',ev.t,ev.b,20000);
     else notify(ev.t,ev.b,ev.k);
    }
   });
   first=false;const s=document.getElementById('kiwiAlertStatus');if(s)s.textContent='🟢 متصل — تنبيهات مباشرة';
  },err=>{const s=document.getElementById('kiwiAlertStatus');if(s)s.textContent='🟠 التنبيهات غير متصلة';console.warn('KIWI alerts',err)});
 }catch(e){console.warn(e)}
}
window.kiwiAlertCustom=function(title,body,kind='service',duration=20000,key='custom'){
 ringFor(key,kind,title,body,duration);
};
window.kiwiStopAlert=function(key){stopRing(key)};
toolbar();
window.addEventListener('pointerdown',function(){if(localStorage.getItem('kiwi_sound_enabled')==='1'&&!unlocked)unlock()},{once:true});
setTimeout(start,500);
})();

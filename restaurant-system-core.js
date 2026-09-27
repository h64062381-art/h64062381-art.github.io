(function(){
  const KEY='KIWI_RESTAURANT_SYSTEM_V1';
  function state(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}}
  function save(s){localStorage.setItem(KEY,JSON.stringify(s));return s}
  function list(k){const s=state();return Array.isArray(s[k])?s[k]:[]}
  function setList(k,v){const s=state();s[k]=v;save(s);return v}
  function add(k,row){const a=list(k);row.id=row.id||Date.now().toString(36)+Math.random().toString(36).slice(2,7);row.createdAt=row.createdAt||new Date().toISOString();a.unshift(row);setList(k,a);return row}
  function update(k,id,patch){const a=list(k).map(x=>x.id===id?Object.assign({},x,patch,{updatedAt:new Date().toISOString()}):x);setList(k,a);return a.find(x=>x.id===id)}
  function remove(k,id){setList(k,list(k).filter(x=>x.id!==id))}
  function money(v){return Number(v||0).toLocaleString('ar-IQ',{minimumFractionDigits:0,maximumFractionDigits:2})+' د.ع'}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function toast(t){let e=document.getElementById('toast');if(!e){e=document.createElement('div');e.id='toast';document.body.appendChild(e)}e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)}
  function log(action,module,details){add('audit',{action,module,details:details||'',at:new Date().toISOString()})}
  function backup(){const blob=new Blob([JSON.stringify(state(),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kiwi-restaurant-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
  window.KRS={state,list,setList,add,update,remove,money,esc,toast,log,backup,KEY};
})();

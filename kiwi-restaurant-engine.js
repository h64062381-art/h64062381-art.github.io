/* KIWI Restaurant ERP additive engine - does not replace existing app data */
(function(){
  const NS='KIWI_RESTAURANT_ERP_V2_';
  const keys=['items','suppliers','warehouses','purchases','recipes','recipeLines','waste','cash','journal','customers','settings','stockMoves','audit'];
  function read(k){try{return JSON.parse(localStorage.getItem(NS+k)||'[]')}catch(e){return []}}
  function write(k,v){localStorage.setItem(NS+k,JSON.stringify(v));return v}
  function uid(p){return p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
  function add(k,obj){obj={id:obj.id||uid(k),createdAt:obj.createdAt||new Date().toISOString(),...obj};let a=read(k);a.push(obj);write(k,a);return obj}
  function update(k,id,patch){let a=read(k);let i=a.findIndex(x=>x.id===id);if(i<0)return null;a[i]={...a[i],...patch,updatedAt:new Date().toISOString()};write(k,a);return a[i]}
  function remove(k,id){write(k,read(k).filter(x=>x.id!==id))}
  function money(n){return Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2})+' د.ع'}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function audit(action,module,details){add('audit',{action,module,details})}
  function stockMove(itemId,qty,type,ref,unitCost){let item=read('items').find(x=>x.id===itemId);if(!item)return;let before=Number(item.qty||0),after=before+Number(qty||0);update('items',itemId,{qty:after});add('stockMoves',{itemId,qty:Number(qty||0),type,reference:ref||'',unitCost:Number(unitCost||0),beforeQty:before,afterQty:after});audit(type,'inventory',{itemId,qty,reference:ref})}
  function purchase(p){let total=Number(p.qty||0)*Number(p.unitCost||0);let x=add('purchases',{...p,total});stockMove(p.itemId,Number(p.qty||0),'purchase',x.id,p.unitCost);add('journal',{date:new Date().toISOString(),type:'purchase',ref:x.id,debit:'inventory',credit:p.paid?'cash':'supplier',amount:total,note:'فاتورة شراء'});audit('purchase','purchases',x);return x}
  function saleConsumption(recipeId,qty,ref){let r=read('recipes').find(x=>x.id===recipeId);if(!r)return;read('recipeLines').filter(x=>x.recipeId===recipeId).forEach(l=>stockMove(l.itemId,-Number(l.qty||0)*Number(qty||0),'sale-consumption',ref,0));audit('consume_recipe','recipes',{recipeId,qty,reference:ref})}
  function init(){if(!localStorage.getItem(NS+'settings'))write('settings',[{id:'main',restaurantName:'KIWI Restaurant',currency:'د.ع',vat:0,lowStock:1}]);if(!read('warehouses').length)add('warehouses',{name:'المخزن الرئيسي',code:'MAIN',active:true});}
  window.KIWI_ERP_V2={NS,read,write,add,update,remove,uid,money,esc,audit,stockMove,purchase,saleConsumption,init,summary:function(){return {items:read('items').length,suppliers:read('suppliers').length,purchases:read('purchases').length,waste:read('waste').length,journal:read('journal').length,cash:read('cash').length,recipes:read('recipes').length}}};
  init();
})();

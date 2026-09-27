function setupCRUD({key,title,subtitle,fields,columns,extraRow}){
 document.title=title+' | سستم المطعم';
 const form=document.getElementById('form'),rows=document.getElementById('rows'),search=document.getElementById('search');
 form.innerHTML=fields.map(f=>`<div class="${f.wide?'wide':''}"><label>${f.label}</label>${f.type==='select'?`<select id="f_${f.key}">${(f.options||[]).map(o=>`<option>${o}</option>`).join('')}</select>`:f.type==='textarea'?`<textarea id="f_${f.key}"></textarea>`:`<input id="f_${f.key}" type="${f.type||'text'}" ${f.placeholder?'placeholder="'+f.placeholder+'"':''}>`}</div>`).join('')+'<div><label>&nbsp;</label><button class="btn" id="save">💾 حفظ</button></div>';
 let editing=null;
 function val(f){return document.getElementById('f_'+f.key).value}
 function clear(){editing=null;fields.forEach(f=>document.getElementById('f_'+f.key).value=f.type==='select'?(f.options||[])[0]:'');document.getElementById('save').textContent='💾 حفظ'}
 function render(){let data=KRS.list(key);let q=(search?.value||'').toLowerCase();data=data.filter(x=>!q||Object.values(x).some(v=>String(v??'').toLowerCase().includes(q)));rows.innerHTML=data.map(x=>`<tr>${columns.map(c=>`<td>${c.render?c.render(x):KRS.esc(x[c.key])}</td>`).join('')}<td><div class="row"><button class="btn gold" onclick="editRow('${x.id}')">تعديل</button><button class="btn red" onclick="deleteRow('${x.id}')">حذف</button></div></td></tr>`).join('')||`<tr><td colspan="${columns.length+1}">لا توجد بيانات</td></tr>`}
 window.editRow=id=>{let x=KRS.list(key).find(a=>a.id===id);if(!x)return;editing=id;fields.forEach(f=>document.getElementById('f_'+f.key).value=x[f.key]??'');document.getElementById('save').textContent='تحديث'};
 window.deleteRow=id=>{if(confirm('تأكيد الحذف؟')){KRS.remove(key,id);KRS.log('delete',key,id);KRS.toast('تم الحذف');render()}};
 document.getElementById('save').onclick=()=>{let row={};fields.forEach(f=>row[f.key]=val(f));if(!Object.values(row).some(Boolean))return KRS.toast('أدخل البيانات المطلوبة');if(editing){KRS.update(key,editing,row);KRS.log('update',key,editing)}else{KRS.add(key,row);KRS.log('create',key,JSON.stringify(row))}KRS.toast('تم الحفظ بنجاح');clear();render()};search?.addEventListener('input',render);clear();render();
}

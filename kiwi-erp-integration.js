/* KIWI ERP final integration — keeps the existing cashier UI and posts every issued invoice to ERP. */
(function(g){'use strict';
function ready(){return g.KIWI_ERP&&g.db&&typeof g.issueInvoice==='function';}
async function post(payload){
  if(!g.KIWI_ERP)return;
  if(g.KIWI_ERP.validateInvoice) await g.KIWI_ERP.validateInvoice(payload);
  const r=await g.KIWI_ERP.processInvoice(payload);
  if(!r.ok) throw new Error(r.error||'تعذر ترحيل الفاتورة إلى ERP');
  console.info('KIWI ERP sale posted',payload.invoiceNumber,r);
  return r;
}
function install(){
 if(!ready())return setTimeout(install,250);
 if(g.__kiwiERPFinalWrapped)return; g.__kiwiERPFinalWrapped=true;
 const legacyIssue=g.issueInvoice;
 g.issueInvoice=async function(table,invoiceNumber){
   const orders=(g.allOrders||[]).filter(o=>String(g.tableOf?g.tableOf(o):o.table)===String(table));
   if(!orders.length)return legacyIssue(table,invoiceNumber);
   const payload={invoiceNumber,total:orders.reduce((s,o)=>s+g.KIWI_ERP.orderTotal(o),0),table:String(table),orders:orders.map(o=>({orderId:o.id,total:g.KIWI_ERP.orderTotal(o),items:g.KIWI_ERP.itemsOf(o),status:o.status})),paymentMethod:'cash'};
   try{await g.KIWI_ERP.validateInvoice?.(payload);}catch(e){alert(e.message||'المخزون غير كافٍ');return;}
   await legacyIssue(table,invoiceNumber);
   try{await post(payload);}catch(e){console.error(e);alert('تم إصدار الفاتورة، لكن تعذر ترحيلها إلى ERP: '+(e.message||'خطأ'));}
 };
 if(typeof g.issueTakeawayInvoice==='function'){
  const legacyTake=g.issueTakeawayInvoice;
  g.issueTakeawayInvoice=async function(id,invoiceNumber){
    const o=(g.allOrders||[]).find(x=>x.id===id); if(!o)return legacyTake(id,invoiceNumber);
    const payload={invoiceNumber,total:g.KIWI_ERP.orderTotal(o),table:'سفري',orders:[{orderId:o.id,total:g.KIWI_ERP.orderTotal(o),items:g.KIWI_ERP.itemsOf(o),status:o.status}],paymentMethod:'cash'};
    try{await g.KIWI_ERP.validateInvoice?.(payload);}catch(e){alert(e.message||'المخزون غير كافٍ');return;}
    await legacyTake(id,invoiceNumber);
    try{await post(payload);}catch(e){console.error(e);alert('تم إصدار فاتورة السفري، لكن تعذر ترحيلها إلى ERP: '+(e.message||'خطأ'));}
  };
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,300));else setTimeout(install,300);
})(window);

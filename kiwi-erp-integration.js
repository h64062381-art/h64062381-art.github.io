/* KIWI ERP integration: wraps legacy cashier invoice functions without replacing UI. */
(function(g){'use strict';
function wait(){if(!g.KIWI_ERP||!g.db||typeof g.issueInvoice!=='function')return setTimeout(wait,250); if(g.__kiwiERPWrapped)return;g.__kiwiERPWrapped=true;
 const legacyIssue=g.issueInvoice;
 g.issueInvoice=async function(table,invoiceNumber){
   const before=(g.allOrders||[]).filter(o=>String(g.tableOf?g.tableOf(o):o.table)===String(table));
   const total=before.reduce((s,o)=>s+g.KIWI_ERP.orderTotal(o),0);
   await legacyIssue(table,invoiceNumber);
   try{
     const orders=before.map(o=>({orderId:o.id,total:g.KIWI_ERP.orderTotal(o),items:g.KIWI_ERP.itemsOf(o),status:o.status}));
     const r=await g.KIWI_ERP.processInvoice({invoiceNumber,total,table:String(table),orders,paymentMethod:'cash'});
     if(r.queued) console.warn('KIWI ERP: invoice queued offline');
     if(r.ok) console.info('KIWI ERP: invoice posted',invoiceNumber,r);
   }catch(e){console.error('KIWI ERP integration failed after legacy invoice',e);}
 };
 if(typeof g.issueTakeawayInvoice==='function'){
   const legacyTake=g.issueTakeawayInvoice;
   g.issueTakeawayInvoice=async function(id,invoiceNumber){
     const o=(g.allOrders||[]).find(x=>x.id===id); const total=o?g.KIWI_ERP.orderTotal(o):0;
     await legacyTake(id,invoiceNumber);
     if(o){try{await g.KIWI_ERP.processInvoice({invoiceNumber,total,table:'سفري',orders:[{orderId:o.id,total,items:g.KIWI_ERP.itemsOf(o),status:o.status}],paymentMethod:'cash'});}catch(e){console.error(e);}}
   };
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(wait,200));else setTimeout(wait,200);
})(window);

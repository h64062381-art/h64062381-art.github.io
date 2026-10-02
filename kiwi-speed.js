/* KIWI SPEED PACK v1
   Safe performance layer for Firebase/Firestore pages.
   - Enables Firestore offline persistence with multi-tab support when available.
   - Uses unlimited local cache to avoid repeatedly downloading active data.
   - Keeps the live onSnapshot flow; it does not change order/status logic.
*/
(function(){
  'use strict';
  window.KIWI_SPEED_SETUP = function(db){
    if(!db || typeof db.enablePersistence !== 'function') return Promise.resolve(false);
    try{
      if(firebase && firebase.firestore && firebase.firestore.CACHE_SIZE_UNLIMITED){
        try{ db.settings({cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED}); }catch(e){}
      }
    }catch(e){}
    try{
      return db.enablePersistence({synchronizeTabs:true})
        .then(function(){ window.__KIWI_OFFLINE_CACHE__=true; return true; })
        .catch(function(){
          /* Another tab/browser may already own persistence. The live listener still works. */
          window.__KIWI_OFFLINE_CACHE__=false;
          return false;
        });
    }catch(e){
      return Promise.resolve(false);
    }
  };
})();

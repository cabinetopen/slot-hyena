const HistoryManager = {
  STORAGE_KEY:'slot_hyena_history_v2', MAX_ENTRIES:50,
  init(){if(!localStorage.getItem(this.STORAGE_KEY))localStorage.setItem(this.STORAGE_KEY,JSON.stringify([]))},
  getHistory(){try{const d=localStorage.getItem(this.STORAGE_KEY);return d?JSON.parse(d):[]}catch(e){return[]}},
  addEntry(entry){const h=this.getHistory();h.unshift({id:Date.now().toString(),timestamp:new Date().toISOString(),...entry});if(h.length>this.MAX_ENTRIES)h.pop();localStorage.setItem(this.STORAGE_KEY,JSON.stringify(h))},
  clearHistory(){localStorage.setItem(this.STORAGE_KEY,JSON.stringify([]))}
};

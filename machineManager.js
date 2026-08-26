const MachineManager = {
  machinesIndex:[], currentMachine:null,
  async init(){
    try{
      const res=await fetch('index.json');if(!res.ok)throw new Error('index.json HTTP '+res.status);
      this.machinesIndex=await res.json();
      const saved=localStorage.getItem('slot_selected_machine_id'),target=saved||(this.machinesIndex[0]?.id);
      if(target)await this.loadMachine(target);
    }catch(err){console.error('機種インデックス読み込みエラー:',err)}
  },
  getMachineList(){return this.machinesIndex},
  async loadMachine(id){
    const info=this.machinesIndex.find(m=>m.id===id);if(!info)return null;
    try{const res=await fetch(info.file);if(!res.ok)throw new Error('machine HTTP '+res.status);this.currentMachine=await res.json();localStorage.setItem('slot_selected_machine_id',id);return this.currentMachine}
    catch(err){console.error(`機種データ(${id})読み込みエラー:`,err);return null}
  },
  getCurrentMachine(){return this.currentMachine}
};

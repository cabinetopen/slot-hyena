const OcrService = {
  async analyzeImage(imageFile){
    if(typeof Tesseract==='undefined') return {currentG:{value:null,confidence:'低'},czThrough:{value:null,confidence:'低'},atG:{value:null,confidence:'低'},error:true,message:'OCRライブラリが読み込まれていません。手入力をご利用ください。'};
    try{
      const worker=await Tesseract.createWorker('eng');
      await worker.setParameters({tessedit_char_whitelist:'0123456789G'});
      const ret=await worker.recognize(imageFile);
      await worker.terminate();
      return this.parseOcrText(ret.data.text,ret.data.confidence);
    }catch(err){
      console.error('OCR Error:',err);
      return {currentG:{value:null,confidence:'低'},czThrough:{value:null,confidence:'低'},atG:{value:null,confidence:'低'}};
    }
  },
  parseOcrText(rawText,globalConfidence){
    const nums=[];(rawText||'').split('\n').map(x=>x.trim()).filter(Boolean).forEach(line=>(line.match(/\d+/g)||[]).forEach(m=>{const v=parseInt(m,10);if(!Number.isNaN(v))nums.push(v)}));
    const grade=globalConfidence>80?'高':globalConfidence>50?'中':'低';
    return {currentG:nums[0]!==undefined?{value:nums[0],confidence:grade}:{value:null,confidence:'低'},czThrough:nums[1]!==undefined&&nums[1]<15?{value:nums[1],confidence:grade}:{value:null,confidence:'低'},atG:nums[2]!==undefined?{value:nums[2],confidence:grade}:{value:null,confidence:'低'}};
  }
};

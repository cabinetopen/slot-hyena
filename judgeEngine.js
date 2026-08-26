const JudgeEngine = {
  judge(machine,input){
    const warnings=[],matchedRules=[];
    if(input.atG===null||input.atG===undefined||Number.isNaN(input.atG)) warnings.push('AT間ゲーム数が不明のため、AT間ハマリ条件は評価していません。');
    if(input.currentG===null&&input.czThrough===null&&input.atG===null){
      return {status:'UNKNOWN',title:'⚪ 判定不能',target:'情報不足',reasons:['判定に必要な数値（ゲーム数やスルー回数）が入力されていません。'],stopCondition:'確認後に再度入力してください',warnings:['ゲーム数またはスルー回数を入力してください。']};
    }
    for(const rule of (machine.rules||[])){const e=this.evaluateRule(rule,input);if(e.isMatched)matchedRules.push({rule,matchedReasons:e.reasons})}
    const priority={S:4,A:3,B:2,C:1};matchedRules.sort((a,b)=>(priority[b.rule.rank]||0)-(priority[a.rule.rank]||0));
    if(!matchedRules.length)return {status:'SKIP',title:'🔴 打たない',target:'なし',reasons:['現在の台状況は狙い目ライン（ボーダー）に達していません。'],stopCondition:'即やめ（または未練打ちせず移動）',warnings};
    const top=matchedRules[0].rule;
    return {status:top.status,title:this.getStatusTitle(top.status,top.name),target:top.target||'条件達成まで',reasons:matchedRules.map(m=>`[${m.rule.rank}ランク] ${m.rule.name}: ${m.matchedReasons.join(', ')}`),stopCondition:top.stopCondition||'当選後状態確認してやめ',warnings};
  },
  evaluateRule(rule,input){
    const c=rule.conditions||{},reasons=[];
    if(c.isReset!==undefined&&c.isReset!==null){if(input.isReset!==c.isReset)return{isMatched:false};reasons.push(input.isReset?'リセット状態':'据え置き/通常')}
    if(c.czThroughMin!==undefined){if(input.czThrough===null||input.czThrough<c.czThroughMin)return{isMatched:false};reasons.push(`CZスルー ${input.czThrough}回 (ボーダー: ${c.czThroughMin}回以上)`)}
    if(c.currentGMin!==undefined){if(input.currentG===null||input.currentG<c.currentGMin)return{isMatched:false};reasons.push(`現在 ${input.currentG}G (ボーダー: ${c.currentGMin}G以上)`)}
    if(c.currentGMax!==undefined){if(input.currentG===null||input.currentG>c.currentGMax)return{isMatched:false};reasons.push(`現在 ${input.currentG}G (上限: ${c.currentGMax}G以下)`)}
    if(c.atGMin!==undefined){if(input.atG===null||input.atG<c.atGMin)return{isMatched:false};reasons.push(`AT間 ${input.atG}G (ボーダー: ${c.atGMin}G以上)`)}
    if(c.specialEffects)for(const [key,expected] of Object.entries(c.specialEffects)){const user=input.specialEffects?.[key]??null;if(expected===true&&user!==true)return{isMatched:false};if(expected===false&&user!==false)return{isMatched:false};reasons.push(`特殊演出条件適合: ${key}`)}
    return {isMatched:true,reasons}
  },
  getStatusTitle(status,name){return status==='GO'?`🟢 打つ (${name})`:status==='TENGOKU'?`🔵 天国確認 (${name})`:status==='SKIP'?`🔴 打たない (${name})`:`⚪ 判定不能 (${name})`}
};

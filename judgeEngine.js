const JudgeEngine = {
  judge(machine, input) {
    const warnings = [];
    const matchedRules = [];
    // 入力値の初期化
    const data = {
      isReset: input.isReset ?? null,
      currentG: input.currentG ?? null,
      czThrough: input.czThrough ?? null,
      atG: input.atG ?? null,
      currentCycle: input.currentCycle ?? null,
      currentPoint: input.currentPoint ?? null,
      previousPoint: input.previousPoint ?? null,
      diffMedals: input.diffMedals ?? null,
      runThrough: input.runThrough ?? null,
      notRunThrough: input.notRunThrough ?? null,
      upperAfter: input.upperAfter ?? null,
      aoshimaVsHatanofailed: input.aoshimaVsHatanofailed ?? null,
      rivalMode: input.rivalMode ?? null,
      stage: input.stage ?? null,
      item: input.item ?? null,
      helmet: input.helmet ?? null,
      specialEffects: input.specialEffects || {}
    };
    // 入力不足チェック
    if (
      data.currentG === null &&
      data.currentCycle === null &&
      data.currentPoint === null &&
      data.atG === null &&
      data.czThrough === null
    ) {
      return {
        status: 'UNKNOWN',
        title: '⚪ 判定不能',
        target: '情報不足',
        reasons: [
          '判定に必要なゲーム数・周期・ポイントなどが入力されていません。'
        ],
        stopCondition: '必要な情報を確認して再度判定してください。',
        warnings: [
          'ゲーム数、周期、ポイントなどを入力してください。'
        ]
      };
    }
    // ルール評価
    for (const rule of machine.rules || []) {
      const result = this.evaluateRule(rule, data);
      if (result.isMatched) {
        matchedRules.push({
          rule,
          matchedReasons: result.reasons
        });
      }
    }
    // 優先順位
    const priority = {
      S: 4,
      A: 3,
      B: 2,
      C: 1
    };
    matchedRules.sort(
      (a, b) =>
        (priority[b.rule.rank] || 0) -
        (priority[a.rule.rank] || 0)
    );
    // 該当なし
    if (!matchedRules.length) {
      return {
        status: 'SKIP',
        title: '🔴 打たない',
        target: 'なし',
        reasons: [
          '現在の台状況は登録されている狙い目条件に該当しません。'
        ],
        stopCondition:
          '1G即優出確認して示唆を確認。打てなければやめ。',
        warnings
      };
    }
    // 最優先ルール
    const top = matchedRules[0].rule;
    return {
      status: top.status || 'GO',
      title: this.getStatusTitle(
        top.status || 'GO',
        top.name
      ),
      target: top.target || '条件達成まで',
      reasons: matchedRules.map(
        item =>
          `[${item.rule.rank}] ${item.rule.name}: ${item.matchedReasons.join(
            ', '
          )}`
      ),
      stopCondition:
        top.stopCondition ||
        '1G即優出確認して示唆を確認。打てなければやめ。',
      warnings
    };
  },
  evaluateRule(rule, input) {
    const c = rule.conditions || {};
    const reasons = [];
    // -------------------------
    // リセット
    // -------------------------
    if (
      c.isReset !== undefined &&
      c.isReset !== null
    ) {
      if (input.isReset !== c.isReset) {
        return { isMatched: false };
      }
      reasons.push(
        input.isReset
          ? '朝イチ・リセット'
          : '朝イチ以外'
      );
    }
    // -------------------------
    // 現在ゲーム数
    // -------------------------
    if (c.currentGMin !== undefined) {
      if (
        input.currentG === null ||
        input.currentG === undefined ||
        input.currentG < c.currentGMin
      ) {
        return { isMatched: false };
      }
      reasons.push(
        `現在 ${input.currentG}G（${c.currentGMin}G～）`
      );
    }
    if (c.currentGMax !== undefined) {
      if (
        input.currentG === null ||
        input.currentG > c.currentGMax
      ) {
        return { isMatched: false };
      }
      reasons.push(
        `現在 ${input.currentG}G（${c.currentGMax}G以下）`
      );
    }
    if (c.currentGEquals !== undefined) {
      if (
        input.currentG === null ||
        input.currentG !== c.currentGEquals
      ) {
        return { isMatched: false };
      }
      reasons.push(
        `現在 ${input.currentG}G`
      );
    }
    // -------------------------
    // AT間ゲーム数
    // -------------------------
    if (c.atGMin !== undefined) {
      if (
        input.atG === null ||
        input.atG < c.atGMin
      ) {
        return { isMatched: false };
      }
      reasons.push(
        `AT間 ${input.atG}G（${c.atGMin}G～）`
      );
    }
    // -------------------------
    // CZスルー
    // -------------------------
    if (c.czThroughMin !== undefined) {
      if (
        input.czThrough === null ||
        input.czThrough < c.czThroughMin
      ) {
        return { isMatched: false };
      }
      reasons.push(
        `CZスルー ${input.czThrough}回`
      );
    }
    if (c.czThroughMax !== undefined) {
      if (
        input.czThrough === null ||
        input.czThrough > c.czThroughMax
      ) {
        return { isMatched: false };
      }
    }
    // -------------------------
    // 周期
    // -------------------------
    if (c.currentCycleMin !== undefined) {
      if (
        input.currentCycle === null ||
        input.currentCycle < c.currentCycleMin
      ) {
        return { isMatched: false };
      }
      reasons.push(
        `現在 ${input.currentCycle}周期`
      );
    }
    if (c.currentCycleMax !== undefined) {
      if (
        input.currentCycle === null ||
        input.currentCycle > c.currentCycleMax
      ) {
        return { isMatched: false };
      }
    }
    if (c.currentCycleEquals !== undefined) {
      if (
        input.currentCycle === null ||
        input.currentCycle !== c.currentCycleEquals
      ) {
        return { isMatched: false };
      }
      reasons.push(
        `現在 ${input.currentCycle}周期`
      );
    }
    // -------------------------
    // 現在ポイント
    // -------------------------
    if (c.currentPointMin !== undefined) {
      if (
        input.currentPoint === null ||
        input.currentPoint < c.currentPointMin
      ) {
        return { isMatched: false };
      }
      reasons.push(
        `現在 ${input.currentPoint}pt（${c.currentPointMin}pt～）`
      );
    }
    // -------------------------
    // 前回ポイント
    // -------------------------
    if (c.previousPointMin !== undefined) {
      if (
        input.previousPoint === null ||
        input.previousPoint < c.previousPointMin
      ) {
        return { isMatched: false };
      }
      reasons.push(
        `前回 ${input.previousPoint}pt`
      );
    }
    // -------------------------
    // 差枚
    // -------------------------
    if (c.diffMedalsMin !== undefined) {
      if (
        input.diffMedals === null ||
        input.diffMedals < c.diffMedalsMin
      ) {
        return { isMatched: false };
      }
      reasons.push(
        `差枚 +${input.diffMedals}枚`
      );
    }
    if (c.diffMedalsMax !== undefined) {
      if (
        input.diffMedals === null ||
        input.diffMedals > c.diffMedalsMax
      ) {
        return { isMatched: false };
      }
    }
    // -------------------------
    // 上位後
    // -------------------------
    if (c.upperAfter !== undefined) {
      if (input.upperAfter !== c.upperAfter) {
        return { isMatched: false };
      }
      if (input.upperAfter) {
        reasons.push('上位AT後');
      }
    }
    // -------------------------
    // 青島VS波多野敗北後
    // -------------------------
    if (
      c.aoshimaVsHatanofailed !== undefined
    ) {
      if (
        input.aoshimaVsHatanofailed !==
        c.aoshimaVsHatanofailed
      ) {
        return { isMatched: false };
      }
      if (input.aoshimaVsHatanofailed) {
        reasons.push(
          '青島VS波多野敗北後'
        );
      }
    }
    // -------------------------
    // ライバルモード
    // -------------------------
    if (c.rivalMode !== undefined) {
      if (
        input.rivalMode !== c.rivalMode
      ) {
        return { isMatched: false };
      }
      reasons.push(
        `ライバルモード ${input.rivalMode}`
      );
    }
    // -------------------------
    // ステージ
    // -------------------------
    if (c.stage !== undefined) {
      if (input.stage !== c.stage) {
        return { isMatched: false };
      }
      reasons.push(
        `ステージ ${input.stage}`
      );
    }
    // -------------------------
    // アイテム
    // -------------------------
    if (c.item !== undefined) {
      if (input.item !== c.item) {
        return { isMatched: false };
      }
      reasons.push(
        `アイテム ${input.item}`
      );
    }
    // -------------------------
    // AT後ヘルメット
    // -------------------------
    if (c.helmet !== undefined) {
      if (input.helmet !== c.helmet) {
        return { isMatched: false };
      }
      reasons.push(
        `AT後ヘルメット ${input.helmet}`
      );
    }
    // -------------------------
    // 特殊演出
    // -------------------------
    if (c.specialEffects) {
      for (const [key, expected] of Object.entries(
        c.specialEffects
      )) {
        const actual =
          input.specialEffects?.[key] ?? null;
        if (
          expected === true &&
          actual !== true
        ) {
          return { isMatched: false };
        }
        if (
          expected === false &&
          actual !== false
        ) {
          return { isMatched: false };
        }
        reasons.push(
          `特殊演出条件適合: ${key}`
        );
      }
    }
    return {
      isMatched: true,
      reasons
    };
  },
  getStatusTitle(status, name) {
    if (status === 'GO') {
      return `🟢 打つ (${name})`;
    }
    if (status === 'TENGOKU') {
      return `🔵 天国確認 (${name})`;
    }
    if (status === 'SKIP') {
      return `🔴 打たない (${name})`;
    }
    return `⚪ 判定不能 (${name})`;
  }
};

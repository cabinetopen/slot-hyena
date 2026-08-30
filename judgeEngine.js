const JudgeEngine = {
  judge(machine, input) {
    const warnings = [];
    const matchedRules = [];

    if (
      input.atG === null ||
      input.atG === undefined ||
      Number.isNaN(input.atG)
    ) {
      warnings.push(
        'AT間ゲーム数が不明のため、AT間ハマリ条件は評価していません。'
      );
    }

    if (
      input.currentG === null &&
      input.czThrough === null &&
      input.atG === null &&
      input.currentCycle === null &&
      input.currentPoint === null
    ) {
      return {
        status: 'UNKNOWN',
        title: '⚪ 判定不能',
        target: '情報不足',
        reasons: [
          '判定に必要な数値（ゲーム数・周期・ポイントなど）が入力されていません。'
        ],
        stopCondition: '確認後に再度入力してください',
        warnings: ['ゲーム数、周期、ポイントなどを入力してください。']
      };
    }

    for (const rule of machine.rules || []) {
      const e = this.evaluateRule(rule, input);
      if (e.isMatched) {
        matchedRules.push({
          rule,
          matchedReasons: e.reasons
        });
      }
    }

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

    if (!matchedRules.length) {
      return {
        status: 'SKIP',
        title: '🔴 打たない',
        target: 'なし',
        reasons: [
          '現在の台状況は狙い目ライン（ボーダー）に達していません。'
        ],
        stopCondition: '即やめ（または未練打ちせず移動）',
        warnings
      };
    }

    const top = matchedRules[0].rule;

    return {
      status: top.status,
      title: this.getStatusTitle(top.status, top.name),
      target: top.target || '条件達成まで',
      reasons: matchedRules.map(
        m =>
          `[${m.rule.rank}ランク] ${m.rule.name}: ${m.matchedReasons.join(', ')}`
      ),
      stopCondition:
        top.stopCondition || '当選後状態確認してやめ',
      warnings
    };
  },

  evaluateRule(rule, input) {
    const c = rule.conditions || {};
    const reasons = [];

    // リセット
    if (c.isReset !== undefined && c.isReset !== null) {
      if (input.isReset !== c.isReset) {
        return { isMatched: false };
      }

      reasons.push(
        input.isReset
          ? 'リセット状態'
          : '据え置き/通常'
      );
    }

    // 現在ゲーム数
    if (c.currentGMin !== undefined) {
      if (
        input.currentG === null ||
        input.currentG === undefined ||
        input.currentG < c.currentGMin
      ) {
        return { isMatched: false };
      }

      reasons.push(
        `現在 ${input.currentG}G (ボーダー: ${c.currentGMin}G以上)`
      );
    }

    if (c.currentGMax !== undefined) {
      if (
        input.currentG === null ||
        input.currentG === undefined ||
        input.currentG > c.currentGMax
      ) {
        return { isMatched: false };
      }

      reasons.push(
        `現在 ${input.currentG}G (上限: ${c.currentGMax}G以下)`
      );
    }

    if (c.currentGEquals !== undefined) {
      if (
        input.currentG === null ||
        input.currentG === undefined ||
        input.currentG !== c.currentGEquals
      ) {
        return { isMatched: false };
      }

      reasons.push(
        `現在 ${input.currentG}G`
      );
    }

    // AT間ゲーム数
    if (c.atGMin !== undefined) {
      if (
        input.atG === null ||
        input.atG === undefined ||
        input.atG < c.atGMin
      ) {
        return { isMatched: false };
      }

      reasons.push(
        `AT間 ${input.atG}G (ボーダー: ${c.atGMin}G以上)`
      );
    }

    // CZスルー
    if (c.czThroughMin !== undefined) {
      if (
        input.czThrough === null ||
        input.czThrough === undefined ||
        input.czThrough < c.czThroughMin
      ) {
        return { isMatched: false };
      }

      reasons.push(
        `CZスルー ${input.czThrough}回 (ボーダー: ${c.czThroughMin}回以上)`
      );
    }

    if (c.czThroughMax !== undefined) {
      if (
        input.czThrough === null ||
        input.czThrough === undefined ||
        input.czThrough > c.czThroughMax
      ) {
        return { isMatched: false };
      }
    }

    // 周期
    if (c.currentCycleMin !== undefined) {
      if (
        input.currentCycle === null ||
        input.currentCycle === undefined ||
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
        input.currentCycle === undefined ||
        input.currentCycle > c.currentCycleMax
      ) {
        return { isMatched: false };
      }
    }

    if (c.currentCycleEquals !== undefined) {
      if (
        input.currentCycle === null ||
        input.currentCycle === undefined ||
        input.currentCycle !== c.currentCycleEquals
      ) {
        return { isMatched: false };
      }

      reasons.push(
        `現在 ${input.currentCycle}周期`
      );
    }

    // ポイント
    if (c.currentPointMin !== undefined) {
      if (
        input.currentPoint === null ||
        input.currentPoint === undefined ||
        input.currentPoint < c.currentPointMin
      ) {
        return { isMatched: false };
      }

      reasons.push(
        `現在 ${input.currentPoint}pt (ボーダー: ${c.currentPointMin}pt以上)`
      );
    }

    // 前回ポイント
    if (c.previousPointMin !== undefined) {
      if (
        input.previousPoint === null ||
        input.previousPoint === undefined ||
        input.previousPoint < c.previousPointMin
      ) {
        return { isMatched: false };
      }

      reasons.push(
        `前回 ${input.previousPoint}pt`
      );
    }

    // 差枚
    if (c.diffMedalsMin !== undefined) {
      if (
        input.diffMedals === null ||
        input.diffMedals === undefined ||
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
        input.diffMedals === undefined ||
        input.diffMedals > c.diffMedalsMax
      ) {
        return { isMatched: false };
      }
    }

    // 真偽値条件
    const booleanConditions = [
      'runThrough',
      'notRunThrough',
      'upperAfter',
      'aoshimaVsHatanofailed'
    ];

    for (const key of booleanConditions) {
      if (c[key] !== undefined) {
        if (input[key] !== c[key]) {
          return { isMatched: false };
        }

        reasons.push(
          `${key}: ${input[key] ? 'あり' : 'なし'}`
        );
      }
    }

    // ライバルモード
    if (c.rivalMode !== undefined) {
      if (input.rivalMode !== c.rivalMode) {
        return { isMatched: false };
      }

      reasons.push(
        `ライバルモード: ${input.rivalMode}`
      );
    }

    // ステージ
    if (c.stage !== undefined) {
      if (input.stage !== c.stage) {
        return { isMatched: false };
      }

      reasons.push(
        `ステージ: ${input.stage}`
      );
    }

    // アイテム
    if (c.item !== undefined) {
      if (input.item !== c.item) {
        return { isMatched: false };
      }

      reasons.push(
        `アイテム: ${input.item}`
      );
    }

    // ヘルメット
    if (c.helmet !== undefined) {
      if (input.helmet !== c.helmet) {
        return { isMatched: false };
      }

      reasons.push(
        `AT後ヘルメット: ${input.helmet}`
      );
    }

    // 特殊演出
    if (c.specialEffects) {
      for (const [key, expected] of Object.entries(
        c.specialEffects
      )) {
        const user =
          input.specialEffects?.[key] ?? null;

        if (expected === true && user !== true) {
          return { isMatched: false };
        }

        if (expected === false && user !== false) {
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
    return status === 'GO'
      ? `🟢 打つ (${name})`
      : status === 'TENGOKU'
      ? `🔵 天国確認 (${name})`
      : status === 'SKIP'
      ? `🔴 打たない (${name})`
      : `⚪ 判定不能 (${name})`;
  }
};

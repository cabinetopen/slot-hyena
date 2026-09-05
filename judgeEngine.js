const JudgeEngine = {
  judge(machine, input) {
    const warnings = [];
    const matchedRules = [];

    // =========================
    // 入力値の初期化
    // =========================
    const data = {
      isReset: input?.isReset ?? null,

      currentG: this.toNumber(input?.currentG),
      czThrough: this.toNumber(input?.czThrough),
      atG: this.toNumber(input?.atG),

      currentCycle: this.toNumber(input?.currentCycle),
      currentPoint: this.toNumber(input?.currentPoint),
      previousPoint: this.toNumber(input?.previousPoint),

      diffMedals: this.toNumber(input?.diffMedals),

      runThrough: this.toNumber(input?.runThrough),
      notRunThrough: this.toNumber(input?.notRunThrough),

      upperAfter: input?.upperAfter ?? null,
      aoshimaVsHatanofailed:
        input?.aoshimaVsHatanofailed ?? null,

      rivalMode: input?.rivalMode ?? null,
      stage: input?.stage ?? null,
      item: input?.item ?? null,
      helmet: input?.helmet ?? null,

      specialEffects:
        input?.specialEffects &&
        typeof input.specialEffects === 'object'
          ? input.specialEffects
          : {}
    };

    // =========================
    // 入力不足チェック
    // =========================
    const hasUsefulInput =
      data.currentG !== null ||
      data.currentCycle !== null ||
      data.currentPoint !== null ||
      data.atG !== null ||
      data.czThrough !== null ||
      data.diffMedals !== null ||
      data.upperAfter !== null ||
      data.aoshimaVsHatanofailed !== null ||
      data.rivalMode !== null ||
      data.stage !== null ||
      data.item !== null ||
      data.helmet !== null ||
      Object.keys(data.specialEffects).length > 0;

    if (!hasUsefulInput) {
      return {
        status: 'UNKNOWN',
        title: this.getStatusTitle(
          'UNKNOWN',
          machine?.name || ''
        ),
        target: '情報不足',
        reasons: [
          '判定に必要なゲーム数・周期・ポイント・演出などが入力されていません。'
        ],
        stopCondition:
          '必要な情報を確認して再度判定してください。',
        warnings: [
          'ゲーム数、周期、ポイント、ステージ、演出などを入力してください。'
        ],
        matchedRules: []
      };
    }

    // =========================
    // ルール評価
    // =========================
    for (const rule of machine?.rules || []) {
      const result = this.evaluateRule(rule, data);

      if (result.isMatched) {
        matchedRules.push({
          rule,
          matchedReasons: result.reasons || []
        });
      }
    }

    // =========================
    // 優先順位
    // S > A > B > C
    // =========================
    const priority = {
      S: 4,
      A: 3,
      B: 2,
      C: 1
    };

    matchedRules.sort(
      (a, b) =>
        (priority[b.rule?.rank] || 0) -
        (priority[a.rule?.rank] || 0)
    );

    // =========================
    // 該当なし
    // =========================
    if (!matchedRules.length) {
      return {
        status: 'SKIP',
        title: this.getStatusTitle(
          'SKIP',
          machine?.name || ''
        ),
        target: 'なし',
        reasons: [
          '現在の台状況は登録されている狙い目条件に該当しません。'
        ],
        stopCondition:
          '基本のやめ時に従ってください。',
        warnings,
        matchedRules: []
      };
    }

    // =========================
    // 最も強いルール
    // =========================
    const strongest = matchedRules[0];
    const strongestRule = strongest.rule;

    const status =
      strongestRule.status || 'GO';

    // =========================
    // 複数条件が成立した場合
    // =========================
    const allReasons = [];

    for (const match of matchedRules) {
      for (const reason of match.matchedReasons || []) {
        if (!allReasons.includes(reason)) {
          allReasons.push(reason);
        }
      }
    }

    // =========================
    // 判定結果
    // =========================
    return {
      status,

      title: this.getStatusTitle(
        status,
        machine?.name || ''
      ),

      target:
        strongestRule.target ||
        '条件に従って判断',

      reasons:
        allReasons.length > 0
          ? allReasons
          : [
              strongestRule.name ||
                '登録条件に該当'
            ],

      stopCondition:
        strongestRule.stopCondition ||
        '登録されたやめ時条件に従ってください。',

      warnings,

      // 実際に成立した全ルール
      matchedRules: matchedRules.map(match => ({
        id: match.rule?.id || null,
        name: match.rule?.name || '',
        rank: match.rule?.rank || 'C',
        status: match.rule?.status || 'GO',
        target: match.rule?.target || '',
        reasons: match.matchedReasons || []
      }))
    };
  },

  // =========================
  // ルール評価
  // =========================
  evaluateRule(rule, data) {
    const c = rule?.conditions;

    if (!c || typeof c !== 'object') {
      return {
        isMatched: false,
        reasons: []
      };
    }

    const reasons = [];

    // =========================
    // リセット判定
    // =========================
    if (c.isReset !== undefined) {
      if (data.isReset !== c.isReset) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        c.isReset
          ? '朝イチ・リセット台'
          : '朝イチ以外'
      );
    }

    // =========================
    // G数
    // =========================
    if (c.currentGMin !== undefined) {
      if (
        data.currentG === null ||
        data.currentG < c.currentGMin
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `現在G数 ${data.currentG}G（${c.currentGMin}G～）`
      );
    }

    if (c.currentGMax !== undefined) {
      if (
        data.currentG === null ||
        data.currentG > c.currentGMax
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `現在G数 ${data.currentG}G（${c.currentGMax}G以下）`
      );
    }

    // =========================
    // 周期
    // =========================
    if (c.currentCycleEquals !== undefined) {
      if (
        data.currentCycle === null ||
        data.currentCycle !== c.currentCycleEquals
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `現在 ${data.currentCycle}周期`
      );
    }

    if (c.currentCycleMin !== undefined) {
      if (
        data.currentCycle === null ||
        data.currentCycle < c.currentCycleMin
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `周期 ${data.currentCycle}（${c.currentCycleMin}周期～）`
      );
    }

    if (c.currentCycleMax !== undefined) {
      if (
        data.currentCycle === null ||
        data.currentCycle > c.currentCycleMax
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `周期 ${data.currentCycle}（${c.currentCycleMax}周期以下）`
      );
    }

    // =========================
    // ポイント
    // =========================
    if (c.currentPointMin !== undefined) {
      if (
        data.currentPoint === null ||
        data.currentPoint < c.currentPointMin
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `現在ポイント ${data.currentPoint}pt（${c.currentPointMin}pt～）`
      );
    }

    if (c.currentPointMax !== undefined) {
      if (
        data.currentPoint === null ||
        data.currentPoint > c.currentPointMax
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `現在ポイント ${data.currentPoint}pt（${c.currentPointMax}pt以下）`
      );
    }

    // =========================
    // 前回ポイント
    // =========================
    if (c.previousPointMin !== undefined) {
      if (
        data.previousPoint === null ||
        data.previousPoint < c.previousPointMin
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `前回ポイント ${data.previousPoint}pt`
      );
    }

    // =========================
    // AT間G数
    // =========================
    if (c.atGMin !== undefined) {
      if (
        data.atG === null ||
        data.atG < c.atGMin
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `AT間 ${data.atG}G（${c.atGMin}G～）`
      );
    }

    if (c.atGMax !== undefined) {
      if (
        data.atG === null ||
        data.atG > c.atGMax
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }
    }

    // =========================
    // 差枚
    // =========================
    if (c.diffMedalsMin !== undefined) {
      if (
        data.diffMedals === null ||
        data.diffMedals < c.diffMedalsMin
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `差枚 ${data.diffMedals}枚（${c.diffMedalsMin}枚～）`
      );
    }

    if (c.diffMedalsMax !== undefined) {
      if (
        data.diffMedals === null ||
        data.diffMedals > c.diffMedalsMax
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }
    }

    // =========================
    // 通過回数
    // =========================
    if (c.runThroughMin !== undefined) {
      if (
        data.runThrough === null ||
        data.runThrough < c.runThroughMin
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `通過回数 ${data.runThrough}`
      );
    }

    if (c.notRunThroughMin !== undefined) {
      if (
        data.notRunThrough === null ||
        data.notRunThrough < c.notRunThroughMin
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `非通過回数 ${data.notRunThrough}`
      );
    }

    // =========================
    // 上位AT後
    // =========================
    if (c.upperAfter !== undefined) {
      if (
        data.upperAfter !== c.upperAfter
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      if (data.upperAfter === true) {
        reasons.push('上位AT後');
      }
    }

    // =========================
    // 青島VS波多野敗北後
    // =========================
    if (
      c.aoshimaVsHatanofailed !== undefined
    ) {
      if (
        data.aoshimaVsHatanofailed !==
        c.aoshimaVsHatanofailed
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      if (
        data.aoshimaVsHatanofailed === true
      ) {
        reasons.push(
          '青島VS波多野敗北後'
        );
      }
    }

    // =========================
    // ライバルモード
    // =========================
    if (c.rivalMode !== undefined) {
      if (
        data.rivalMode !== c.rivalMode
      ) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `ライバルモード：${data.rivalMode}`
      );
    }

    // =========================
    // ステージ
    // =========================
    if (c.stage !== undefined) {
      if (data.stage !== c.stage) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `ステージ：${data.stage}`
      );
    }

    // =========================
    // アイテム
    // =========================
    if (c.item !== undefined) {
      if (data.item !== c.item) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `アイテム：${data.item}`
      );
    }

    // =========================
    // AT後ヘルメット
    // =========================
    if (c.helmet !== undefined) {
      if (data.helmet !== c.helmet) {
        return {
          isMatched: false,
          reasons: []
        };
      }

      reasons.push(
        `AT後ヘルメット：${data.helmet}`
      );
    }

    // =========================
    // 特殊演出
    // =========================
    if (
      c.specialEffects &&
      typeof c.specialEffects === 'object'
    ) {
      for (const [
        key,
        expected
      ] of Object.entries(
        c.specialEffects
      )) {
        const actual =
          data.specialEffects?.[key] ??
          null;

        if (expected === true) {
          if (actual !== true) {
            return {
              isMatched: false,
              reasons: []
            };
          }
        } else if (expected === false) {
          if (actual !== false) {
            return {
              isMatched: false,
              reasons: []
            };
          }
        } else {
          if (actual !== expected) {
            return {
              isMatched: false,
              reasons: []
            };
          }
        }

        reasons.push(
          `特殊演出：${key}`
        );
      }
    }

    return {
      isMatched: true,
      reasons
    };
  },

  // =========================
  // 数値変換
  // =========================
  toNumber(value) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  },

  // =========================
  // ステータス表示
  // =========================
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

document.addEventListener('DOMContentLoaded', async () => {
  await MachineManager.init();
  HistoryManager.init();
  let currentStep = 0;
  let wizardAnswers = {};
  const views = {
    home: document.getElementById('view-home'),
    wizard: document.getElementById('view-wizard'),
    ocr: document.getElementById('view-ocr'),
    quick: document.getElementById('view-quick'),
    result: document.getElementById('view-result'),
    history: document.getElementById('view-history'),
    settings: document.getElementById('view-settings')
  };
  function showView(targetView) {
    Object.values(views).forEach(v => v && v.classList.remove('active'));
    if (targetView) targetView.classList.add('active');
    window.scrollTo(0, 0);
  }
  function updateMachineNameDisplay() {
    const current = MachineManager.getCurrentMachine();
    document.getElementById('current-machine-name').textContent =
      current ? current.name : '未選択';
  }
  function isMonkeyTurn() {
    const m = MachineManager.getCurrentMachine();
    return m && m.id === 'monkey-turn';
  }
  updateMachineNameDisplay();
  renderHomeHistory();
  document.querySelectorAll('.btn-to-home').forEach(btn => {
    btn.addEventListener('click', () => showView(views.home));
  });
  // =========================
  // 機種選択
  // =========================
  document.getElementById('btn-select-machine').addEventListener('click', () => {
    renderMachineModal();
    document.getElementById('modal-machine-select').classList.remove('hidden');
  });
  document.getElementById('btn-close-machine-modal').addEventListener('click', () => {
    document.getElementById('modal-machine-select').classList.add('hidden');
  });
  function renderMachineModal() {
    const container = document.getElementById('machine-list-container');
    container.innerHTML = '';
    const list = MachineManager.getMachineList();
    const current = MachineManager.getCurrentMachine();
    list.forEach(m => {
      const btn = document.createElement('button');
      btn.className =
        `machine-item-btn ${current && current.id === m.id ? 'active' : ''}`;
      btn.textContent = m.name;
      btn.addEventListener('click', async () => {
        const loaded = await MachineManager.loadMachine(m.id);
        if (!loaded) {
          alert('機種データの読み込みに失敗しました。');
          return;
        }
        updateMachineNameDisplay();
        document
          .getElementById('modal-machine-select')
          .classList.add('hidden');
      });
      container.appendChild(btn);
    });
  }
  // =========================
  // 一問一答
  // =========================
  document.getElementById('btn-start-wizard').addEventListener('click', () => {
    if (isMonkeyTurn()) {
      startMonkeyQuickInput();
      return;
    }
    currentStep = 0;
    wizardAnswers = {
      isReset: null,
      currentG: null,
      czThrough: null,
      atG: null,
      endingAfter: false,
      specialEffects: {}
    };
    renderWizardStep();
    showView(views.wizard);
  });
  document.getElementById('btn-wizard-prev').addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      renderWizardStep();
    } else {
      showView(views.home);
    }
  });
  function renderWizardStep() {
    const machine = MachineManager.getCurrentMachine();
    if (!machine) return;
    const steps = [
      {
        title: 'STEP 1: 朝イチ・リセット台ですか？',
        desc: '設定変更・リセットが濃厚、または確認できているか選択してください。',
        render: c =>
          createWizardButtons(
            c,
            [
              { label: 'はい（リセット）', value: 'yes' },
              { label: 'いいえ（据え置き/通常）', value: 'no' },
              { label: '不明・未確認', value: 'unknown' }
            ],
            val => {
              wizardAnswers.isReset =
                val === 'yes'
                  ? true
                  : val === 'no'
                  ? false
                  : null;
              nextWizardStep();
            }
          )
      },
      {
        title: 'STEP 2: 現在ゲーム数は？',
        desc: 'データランプ表示の現在のゲーム数を入力してください。',
        render: c => {
          c.innerHTML = `
            <div class="form-group">
              <input
                type="number"
                id="wizard-input-g"
                placeholder="例: 280"
                inputmode="numeric"
              >
            </div>
            <button
              id="btn-wizard-g-next"
              class="btn btn-primary btn-large w-100"
            >
              次へ
            </button>
          `;
          document
            .getElementById('btn-wizard-g-next')
            .addEventListener('click', () => {
              const v = document.getElementById('wizard-input-g').value;
              wizardAnswers.currentG =
                v !== '' ? parseInt(v, 10) : null;
              nextWizardStep();
            });
        }
      },
      {
        title: 'STEP 3: CZスルー回数は？',
        desc: '現在のCZスルー回数を選択してください。',
        render: c =>
          createWizardButtons(
            c,
            [
              { label: '0回', value: 0 },
              { label: '1回', value: 1 },
              { label: '2回', value: 2 },
              { label: '3回', value: 3 },
              { label: '4回以上', value: 4 },
              { label: '不明・未確認', value: 'unknown' }
            ],
            val => {
              wizardAnswers.czThrough =
                val === 'unknown'
                  ? null
                  : parseInt(val, 10);
              nextWizardStep();
            }
          )
      },
      {
        title: 'STEP 4: AT間ゲーム数は分かりますか？',
        desc: '※不明な場合は「分からない」を選択してください（安全側に判定します）。',
        render: c =>
          createWizardButtons(
            c,
            [
              { label: '分かる（入力する）', value: 'know' },
              { label: '分からない（不明）', value: 'unknown' }
            ],
            val =>
              val === 'unknown'
                ? (
                    wizardAnswers.atG = null,
                    nextWizardStep()
                  )
                : renderAtGInputStep(c)
          )
      },
      {
        title: 'STEP 5: 特殊演出・アイキャッチは？',
        desc: '確認できた演出があれば選択してください。',
        render: c => {
          const effects =
            machine.specialEffectDefinitions || [];
          if (!effects.length) {
            wizardAnswers.specialEffects = {};
            executeJudgment(wizardAnswers);
            return;
          }
          let html =
            '<div style="display:flex;flex-direction:column;gap:12px">';
          effects.forEach(e => {
            html += `
              <div class="form-group">
                <label>${e.label}</label>
                <div class="segmented-control">
                  <input
                    type="radio"
                    name="wiz-eff-${e.id}"
                    id="wiz-eff-${e.id}-unk"
                    value="unknown"
                    checked
                  >
                  <label for="wiz-eff-${e.id}-unk">未確認</label>
                  <input
                    type="radio"
                    name="wiz-eff-${e.id}"
                    id="wiz-eff-${e.id}-no"
                    value="no"
                  >
                  <label for="wiz-eff-${e.id}-no">なし</label>
                  <input
                    type="radio"
                    name="wiz-eff-${e.id}"
                    id="wiz-eff-${e.id}-yes"
                    value="yes"
                  >
                  <label for="wiz-eff-${e.id}-yes">あり</label>
                </div>
              </div>
            `;
          });
          html += `
            </div>
            <button
              id="btn-wizard-finish"
              class="btn btn-primary btn-large w-100"
            >
              判定する
            </button>
          `;
          c.innerHTML = html;
          document
            .getElementById('btn-wizard-finish')
            .addEventListener('click', () => {
              wizardAnswers.specialEffects = {};
              effects.forEach(e => {
                const s =
                  document.querySelector(
                    `input[name="wiz-eff-${e.id}"]:checked`
                  );
                wizardAnswers.specialEffects[e.id] =
                  s
                    ? s.value === 'yes'
                      ? true
                      : s.value === 'no'
                      ? false
                      : null
                    : null;
              });
              executeJudgment(wizardAnswers);
            });
        }
      }
    ];
    document.getElementById('wizard-step-indicator').textContent =
      `STEP ${currentStep + 1} / ${steps.length}`;
    document.getElementById('wizard-question-title').textContent =
      steps[currentStep].title;
    document.getElementById('wizard-question-desc').textContent =
      steps[currentStep].desc;
    const c =
      document.getElementById('wizard-options-container');
    c.innerHTML = '';
    steps[currentStep].render(c);
  }
  function renderAtGInputStep(c) {
    c.innerHTML = `
      <div class="form-group">
        <label>AT間ゲーム数</label>
        <input
          type="number"
          id="wizard-input-at-g"
          placeholder="例: 850"
          inputmode="numeric"
        >
      </div>
      <button
        id="btn-wizard-at-next"
        class="btn btn-primary btn-large w-100"
      >
        次へ
      </button>
    `;
    document
      .getElementById('btn-wizard-at-next')
      .addEventListener('click', () => {
        const v =
          document.getElementById('wizard-input-at-g').value;
        wizardAnswers.atG =
          v !== '' ? parseInt(v, 10) : null;
        nextWizardStep();
      });
  }
  function createWizardButtons(c, opts, cb) {
    opts.forEach(o => {
      const b = document.createElement('button');
      b.className = 'wizard-btn';
      b.textContent = o.label;
      b.addEventListener('click', () => cb(o.value));
      c.appendChild(b);
    });
  }
  function nextWizardStep() {
    currentStep++;
    if (currentStep >= 5) {
      executeJudgment(wizardAnswers);
    } else {
      renderWizardStep();
    }
  }
  // =========================
  // クイック入力
  // =========================
  document
    .getElementById('btn-start-quick')
    .addEventListener('click', () => {
      setupQuickInputForm();
      showView(views.quick);
    });
  function setupQuickInputForm() {
    const standard =
      document.getElementById('standard-quick-input');
    const monkey =
      document.getElementById('monkey-quick-input');
    if (isMonkeyTurn()) {
      if (standard) {
        standard.classList.add('hidden');
      }
      if (monkey) {
        monkey.classList.remove('hidden');
      }
      return;
    }
    if (standard) {
      standard.classList.remove('hidden');
    }
    if (monkey) {
      monkey.classList.add('hidden');
    }
    const m = MachineManager.getCurrentMachine();
    const c =
      document.getElementById(
        'quick-special-effects-container'
      );
    if (!c) return;
    c.innerHTML = '';
    if (!m || !m.specialEffectDefinitions) {
      return;
    }
    m.specialEffectDefinitions.forEach(e => {
      const d = document.createElement('div');
      d.className = 'form-group';
      d.innerHTML = `
        <label>${e.label}</label>
        <div class="segmented-control">
          <input
            type="radio"
            name="quick-eff-${e.id}"
            id="quick-eff-${e.id}-unk"
            value="unknown"
            checked
          >
          <label for="quick-eff-${e.id}-unk">未確認</label>
          <input
            type="radio"
            name="quick-eff-${e.id}"
            id="quick-eff-${e.id}-no"
            value="no"
          >
          <label for="quick-eff-${e.id}-no">なし</label>
          <input
            type="radio"
            name="quick-eff-${e.id}"
            id="quick-eff-${e.id}-yes"
            value="yes"
          >
          <label for="quick-eff-${e.id}-yes">あり</label>
        </div>
      `;
      c.appendChild(d);
    });
  }
  document
    .getElementById('btn-quick-judge')
    .addEventListener('click', () => {
      if (isMonkeyTurn()) {
        judgeMonkeyTurn();
        return;
      }
      const m =
        MachineManager.getCurrentMachine();
      const reset =
        document.querySelector(
          'input[name="quick-reset"]:checked'
        );
      const ending =
        document.querySelector(
          'input[name="quick-ending"]:checked'
        );
      const rv = reset ? reset.value : 'unknown';
      const ev = ending ? ending.value : 'no';
      const specialEffects = {};
      (m?.specialEffectDefinitions || []).forEach(e => {
        const s =
          document.querySelector(
            `input[name="quick-eff-${e.id}"]:checked`
          );
        specialEffects[e.id] =
          s
            ? s.value === 'yes'
              ? true
              : s.value === 'no'
              ? false
              : null
            : null;
      });
      executeJudgment({
        isReset:
          rv === 'yes'
            ? true
            : rv === 'no'
            ? false
            : null,
        currentG: toInt('quick-current-g'),
        czThrough: toInt('quick-cz-through'),
        atG: toInt('quick-at-g'),
        endingAfter:
          ev === 'yes',
        specialEffects
      });
    });
  function startMonkeyQuickInput() {
    setupQuickInputForm();
    showView(views.quick);
  }
  function judgeMonkeyTurn() {
    const inputData = {
      isReset:
        getRadioValue('monkey-reset') === 'yes'
          ? true
          : getRadioValue('monkey-reset') === 'no'
          ? false
          : null,
      currentG:
        toInt('monkey-current-g'),
      currentCycle:
        toInt('monkey-cycle'),
      currentPoint:
        toInt('monkey-point'),
      atG:
        toInt('monkey-at-g'),
      previousPoint:
        toInt('monkey-previous-point'),
      diffMedals:
        toInt('monkey-diff-medals'),
      rivalMode:
        getSelectValue('monkey-rival-mode'),
      upperAfter:
        getRadioValue('monkey-upper-after') === 'yes',
      aoshimaVsHatanofailed:
        getRadioValue('monkey-aoshima-failed') === 'yes',
      stage:
        getSelectValue('monkey-stage'),
      item:
        getSelectValue('monkey-item'),
      helmet:
        getSelectValue('monkey-helmet'),
      specialEffects: {}
    };
    executeJudgment(inputData);
  }
  function getRadioValue(name) {
    const el =
      document.querySelector(
        `input[name="${name}"]:checked`
      );
    return el ? el.value : '';
  }
  function getSelectValue(id) {
    const el =
      document.getElementById(id);
    return el ? el.value : '';
  }
  function toInt(id) {
    const el =
      document.getElementById(id);
    if (!el) return null;
    const v = el.value;
    return v === ''
      ? null
      : parseInt(v, 10);
  }
  // =========================
  // OCR
  // =========================
  document
    .getElementById('btn-start-ocr')
    .addEventListener('click', () => {
      showView(views.ocr);
    });
  document
    .getElementById('btn-trigger-camera')
    .addEventListener('click', () => {
      document
        .getElementById('ocr-file-input')
        .click();
    });
  document
    .getElementById('ocr-file-input')
    .addEventListener('change', async e => {
      const f = e.target.files[0];
      if (!f) return;
      document
        .getElementById('ocr-preview-img')
        .src = URL.createObjectURL(f);
      document
        .getElementById('ocr-preview-container')
        .classList.remove('hidden');
      document
        .getElementById('ocr-loading')
        .classList.remove('hidden');
      document
        .getElementById('ocr-result-form')
        .classList.add('hidden');
      try {
        const r =
          await OcrService.analyzeImage(f);
        document
          .getElementById('ocr-loading')
          .classList.add('hidden');
        document
          .getElementById('ocr-result-form')
          .classList.remove('hidden');
        applyOcrField('current-g', r.currentG);
        applyOcrField('cz-through', r.czThrough);
        applyOcrField('at-g', r.atG);
      } catch (err) {
        console.error('OCRエラー:', err);
        document
          .getElementById('ocr-loading')
          .classList.add('hidden');
        alert('OCR解析に失敗しました。もう一度試してください。');
      }
    });
  function applyOcrField(id, d) {
    const i =
      document.getElementById(
        `ocr-input-${id}`
      );
    const b =
      document.getElementById(
        `badge-${id}`
      );
    if (!i || !b) return;
    if (d && d.value !== null) {
      i.value = d.value;
      b.textContent =
        `信頼度: ${d.confidence}`;
      b.className =
        `confidence-badge confidence-${getConfidenceClass(d.confidence)}`;
    } else {
      i.value = '';
      b.textContent = '未検出';
      b.className =
        'confidence-badge';
    }
  }
  function getConfidenceClass(c) {
    return c === '高'
      ? 'high'
      : c === '中'
      ? 'medium'
      : 'low';
  }
  document
    .getElementById('btn-ocr-next-step')
    .addEventListener('click', () => {
      const c =
        val('ocr-input-current-g');
      const z =
        val('ocr-input-cz-through');
      const a =
        val('ocr-input-at-g');
      setupQuickInputForm();
      if (c !== '' &&
          document.getElementById('quick-current-g')) {
        document.getElementById(
          'quick-current-g'
        ).value = c;
      }
      if (z !== '' &&
          document.getElementById('quick-cz-through')) {
        document.getElementById(
          'quick-cz-through'
        ).value = z;
      }
      if (a !== '' &&
          document.getElementById('quick-at-g')) {
        document.getElementById(
          'quick-at-g'
        ).value = a;
      }
      showView(views.quick);
    });
  function val(id) {
    const el =
      document.getElementById(id);
    return el ? el.value : '';
  }
  // =========================
  // 判定実行
  // =========================
  function executeJudgment(inputData) {
    const m =
      MachineManager.getCurrentMachine();
    if (!m) {
      alert('機種データが読み込まれていません');
      return;
    }
    const result =
      JudgeEngine.judge(
        m,
        inputData
      );
    HistoryManager.addEntry({
      machineId: m.id,
      machineName: m.name,
      inputData,
      result
    });
    renderResultView(result);
    renderHomeHistory();
    showView(views.result);
  }
  // =========================
  // 判定結果
  // =========================
  function renderResultView(r) {
    const hero =
      document.getElementById(
        'result-hero-card'
      );
    hero.className =
      'result-hero ' +
      getStatusClass(r.status);
    document.getElementById(
      'result-status-badge'
    ).textContent =
      getStatusBadgeText(r.status);
    document.getElementById(
      'result-status-title'
    ).textContent =
      r.title;
    document.getElementById(
      'result-target-text'
    ).textContent =
      r.target || 'なし';
    document.getElementById(
      'result-stop-condition'
    ).textContent =
      r.stopCondition || '即やめ';
    const list =
      document.getElementById(
        'result-reasons-list'
      );
    list.innerHTML = '';
    (
      r.reasons?.length
        ? r.reasons
        : ['狙い目条件に該当しませんでした']
    ).forEach(x => {
      const li =
        document.createElement('li');
      li.textContent =
        '・' + x;
      list.appendChild(li);
    });
    const wc =
      document.getElementById(
        'result-warning-card'
      );
    const wl =
      document.getElementById(
        'result-warnings-list'
      );
    wl.innerHTML = '';
    if (r.warnings?.length) {
      wc.classList.remove('hidden');
      r.warnings.forEach(x => {
        const li =
          document.createElement('li');
        li.textContent =
          '⚠️ ' + x;
        wl.appendChild(li);
      });
    } else {
      wc.classList.add('hidden');
    }
  }
  function getStatusClass(s) {
    return s === 'GO'
      ? 'result-status-go'
      : s === 'TENGOKU'
      ? 'result-status-tengoku'
      : s === 'SKIP'
      ? 'result-status-skip'
      : 'result-status-unknown';
  }
  function getStatusBadgeText(s) {
    return s === 'GO'
      ? '🟢 打つ'
      : s === 'TENGOKU'
      ? '🔵 天国確認'
      : s === 'SKIP'
      ? '🔴 打たない'
      : '⚪ 判定不能';
  }
  // =========================
  // 履歴
  // =========================
  document
    .getElementById('btn-view-history')
    .addEventListener('click', () => {
      renderFullHistory();
      showView(views.history);
    });
  document
    .getElementById('btn-clear-history')
    .addEventListener('click', () => {
      if (
        confirm(
          '判定履歴をすべて削除しますか？'
        )
      ) {
        HistoryManager.clearHistory();
        renderFullHistory();
        renderHomeHistory();
      }
    });
  // =========================
  // 設定
  // =========================
  document
    .getElementById('btn-open-settings')
    .addEventListener('click', () => {
      showView(views.settings);
    });
  document
    .getElementById('btn-reset-app-data')
    .addEventListener('click', () => {
      if (
        confirm(
          'アプリの保存データをすべて初期化しますか？'
        )
      ) {
        localStorage.clear();
        alert(
          '初期化しました。ページを再読み込みします。'
        );
        location.reload();
      }
    });
  // =========================
  // 履歴表示
  // =========================
  function renderHomeHistory() {
    const c =
      document.getElementById(
        'home-history-list'
      );
    const h =
      HistoryManager
        .getHistory()
        .slice(0, 3);
    c.innerHTML =
      h.length
        ? h.map(createHistoryItemHTML).join('')
        : '<p class="empty-msg">履歴はありません</p>';
  }
  function renderFullHistory() {
    const c =
      document.getElementById(
        'full-history-list'
      );
    const h =
      HistoryManager.getHistory();
    c.innerHTML =
      h.length
        ? h.map(createHistoryItemHTML).join('')
        : '<p class="empty-msg">履歴はありません</p>';
  }
  function createHistoryItemHTML(i) {
    const d =
      new Date(i.timestamp).toLocaleString(
        'ja-JP',
        {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      );
    return `
      <div class="history-item">
        <div class="history-info">
          <span class="history-machine">
            ${i.machineName}
          </span>
          <span class="history-cond">
            ${i.result.title}
          </span>
          <span class="history-time">
            ${d}
          </span>
        </div>
        <span
          class="history-tag ${getStatusClass(i.result.status)}"
        >
          ${getStatusBadgeText(i.result.status)}
        </span>
      </div>
    `;
  }
});

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
    Object.values(views).forEach(v => {
      if (v) v.classList.remove('active');
    });
    targetView.classList.add('active');
    window.scrollTo(0, 0);
  }
  function updateMachineNameDisplay() {
    const current = MachineManager.getCurrentMachine();
    document.getElementById(
      'current-machine-name'
    ).textContent = current
      ? current.name
      : '未選択';
  }
  updateMachineNameDisplay();
  renderHomeHistory();
  // =========================
  // ホーム
  // =========================
  document
    .querySelectorAll('.btn-to-home')
    .forEach(btn => {
      btn.addEventListener('click', () =>
        showView(views.home)
      );
    });
  // =========================
  // 機種選択
  // =========================
  document
    .getElementById('btn-select-machine')
    .addEventListener('click', () => {
      renderMachineModal();
      document
        .getElementById('modal-machine-select')
        .classList.remove('hidden');
    });
  document
    .getElementById('btn-close-machine-modal')
    .addEventListener('click', () => {
      document
        .getElementById('modal-machine-select')
        .classList.add('hidden');
    });
  function renderMachineModal() {
    const container =
      document.getElementById(
        'machine-list-container'
      );
    container.innerHTML = '';
    const list =
      MachineManager.getMachineList();
    const current =
      MachineManager.getCurrentMachine();
    list.forEach(machine => {
      const btn =
        document.createElement('button');
      btn.className =
        `machine-item-btn ${
          current &&
          current.id === machine.id
            ? 'active'
            : ''
        }`;
      btn.textContent = machine.name;
      btn.addEventListener(
        'click',
        async () => {
          const loaded =
            await MachineManager.loadMachine(
              machine.id
            );
          if (!loaded) {
            alert(
              '機種データの読み込みに失敗しました。'
            );
            return;
          }
          updateMachineNameDisplay();
          document
            .getElementById(
              'modal-machine-select'
            )
            .classList.add('hidden');
          // 入力画面を再構築
          setupQuickInputForm();
        }
      );
      container.appendChild(btn);
    });
  }
  // =========================
  // 一問一答
  // =========================
  document
    .getElementById('btn-start-wizard')
    .addEventListener('click', () => {
      currentStep = 0;
      wizardAnswers = {
        isReset: null,
        currentG: null,
        czThrough: null,
        atG: null,
        currentCycle: null,
        currentPoint: null,
        previousPoint: null,
        diffMedals: null,
        runThrough: null,
        notRunThrough: null,
        upperAfter: null,
        aoshimaVsHatanofailed: null,
        rivalMode: null,
        stage: null,
        item: null,
        helmet: null,
        endingAfter: false,
        specialEffects: {}
      };
      renderWizardStep();
      showView(views.wizard);
    });
  document
    .getElementById('btn-wizard-prev')
    .addEventListener('click', () => {
      if (currentStep > 0) {
        currentStep--;
        renderWizardStep();
      } else {
        showView(views.home);
      }
    });
  function renderWizardStep() {
    const machine =
      MachineManager.getCurrentMachine();
    if (!machine) return;
    const isMonkey =
      machine.id === 'monkey-turn-v';
    if (isMonkey) {
      renderMonkeyWizardStep();
      return;
    }
    renderNormalWizardStep();
  }
  // =========================
  // 通常機種の一問一答
  // =========================
  function renderNormalWizardStep() {
    const machine =
      MachineManager.getCurrentMachine();
    const steps = [
      {
        title:
          'STEP 1: 朝イチ・リセット台ですか？',
        desc:
          '設定変更・リセットが濃厚、または確認できているか選択してください。',
        render: c =>
          createWizardButtons(
            c,
            [
              {
                label:
                  'はい（リセット）',
                value: 'yes'
              },
              {
                label:
                  'いいえ（据え置き/通常）',
                value: 'no'
              },
              {
                label:
                  '不明・未確認',
                value: 'unknown'
              }
            ],
            value => {
              wizardAnswers.isReset =
                value === 'yes'
                  ? true
                  : value === 'no'
                  ? false
                  : null;
              nextWizardStep();
            }
          )
      },
      {
        title:
          'STEP 2: 現在ゲーム数は？',
        desc:
          'データランプ表示の現在のゲーム数を入力してください。',
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
            .getElementById(
              'btn-wizard-g-next'
            )
            .addEventListener('click', () => {
              const value =
                document.getElementById(
                  'wizard-input-g'
                ).value;
              wizardAnswers.currentG =
                value !== ''
                  ? parseInt(value, 10)
                  : null;
              nextWizardStep();
            });
        }
      },
      {
        title:
          'STEP 3: CZスルー回数は？',
        desc:
          '現在のCZスルー回数を選択してください。',
        render: c =>
          createWizardButtons(
            c,
            [
              { label: '0回', value: 0 },
              { label: '1回', value: 1 },
              { label: '2回', value: 2 },
              { label: '3回', value: 3 },
              {
                label: '4回以上',
                value: 4
              },
              {
                label: '不明・未確認',
                value: 'unknown'
              }
            ],
            value => {
              wizardAnswers.czThrough =
                value === 'unknown'
                  ? null
                  : parseInt(value, 10);
              nextWizardStep();
            }
          )
      },
      {
        title:
          'STEP 4: AT間ゲーム数は分かりますか？',
        desc:
          '※不明な場合は「分からない」を選択してください。',
        render: c =>
          createWizardButtons(
            c,
            [
              {
                label:
                  '分かる（入力する）',
                value: 'know'
              },
              {
                label:
                  '分からない（不明）',
                value: 'unknown'
              }
            ],
            value => {
              if (value === 'unknown') {
                wizardAnswers.atG = null;
                nextWizardStep();
              } else {
                renderAtGInputStep(c);
              }
            }
          )
      },
      {
        title:
          'STEP 5: 特殊演出・アイキャッチは？',
        desc:
          '確認できた演出があれば選択してください。',
        render: c => {
          const effects =
            machine.specialEffectDefinitions ||
            [];
          if (!effects.length) {
            wizardAnswers.specialEffects = {};
            executeJudgment(
              wizardAnswers
            );
            return;
          }
          let html =
            '<div style="display:flex;flex-direction:column;gap:12px">';
          effects.forEach(effect => {
            html += `
              <div class="form-group">
                <label>${effect.label}</label>
                <div class="segmented-control">
                  <input
                    type="radio"
                    name="wiz-eff-${effect.id}"
                    id="wiz-eff-${effect.id}-unk"
                    value="unknown"
                    checked
                  >
                  <label
                    for="wiz-eff-${effect.id}-unk"
                  >
                    未確認
                  </label>
                  <input
                    type="radio"
                    name="wiz-eff-${effect.id}"
                    id="wiz-eff-${effect.id}-no"
                    value="no"
                  >
                  <label
                    for="wiz-eff-${effect.id}-no"
                  >
                    なし
                  </label>
                  <input
                    type="radio"
                    name="wiz-eff-${effect.id}"
                    id="wiz-eff-${effect.id}-yes"
                    value="yes"
                  >
                  <label
                    for="wiz-eff-${effect.id}-yes"
                  >
                    あり
                  </label>
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
            .getElementById(
              'btn-wizard-finish'
            )
            .addEventListener('click', () => {
              wizardAnswers.specialEffects =
                {};
              effects.forEach(effect => {
                const selected =
                  document.querySelector(
                    `input[name="wiz-eff-${effect.id}"]:checked`
                  );
                wizardAnswers.specialEffects[
                  effect.id
                ] =
                  selected?.value === 'yes'
                    ? true
                    : selected?.value === 'no'
                    ? false
                    : null;
              });
              executeJudgment(
                wizardAnswers
              );
            });
        }
      }
    ];
    document.getElementById(
      'wizard-step-indicator'
    ).textContent =
      `STEP ${currentStep + 1} / ${steps.length}`;
    document.getElementById(
      'wizard-question-title'
    ).textContent =
      steps[currentStep].title;
    document.getElementById(
      'wizard-question-desc'
    ).textContent =
      steps[currentStep].desc;
    const container =
      document.getElementById(
        'wizard-options-container'
      );
    container.innerHTML = '';
    steps[currentStep].render(
      container
    );
  }
  // =========================
  // モンキーターン専用一問一答
  // =========================
  function renderMonkeyWizardStep() {
    const steps = [
      {
        title:
          'STEP 1: 朝イチですか？',
        desc:
          'リセット・朝イチ狙いとして打つ台か選択してください。',
        render: c =>
          createWizardButtons(
            c,
            [
              {
                label: 'はい（朝イチ）',
                value: true
              },
              {
                label: 'いいえ（朝イチ以外）',
                value: false
              },
              {
                label: '不明',
                value: null
              }
            ],
            value => {
              wizardAnswers.isReset =
                value;
              nextWizardStep();
            }
          )
      },
      {
        title:
          'STEP 2: 現在ゲーム数は？',
        desc:
          '現在のゲーム数を入力してください。',
        render: c => {
          c.innerHTML = `
            <div class="form-group">
              <input
                type="number"
                id="monkey-g"
                placeholder="例: 120"
                inputmode="numeric"
              >
            </div>
            <button
              id="monkey-g-next"
              class="btn btn-primary btn-large w-100"
            >
              次へ
            </button>
          `;
          document
            .getElementById(
              'monkey-g-next'
            )
            .addEventListener('click', () => {
              const value =
                document.getElementById(
                  'monkey-g'
                ).value;
              wizardAnswers.currentG =
                value === ''
                  ? null
                  : parseInt(value, 10);
              nextWizardStep();
            });
        }
      },
      {
        title:
          'STEP 3: 現在何周期目ですか？',
        desc:
          '現在の周期を入力してください。',
        render: c => {
          c.innerHTML = `
            <div class="form-group">
              <input
                type="number"
                id="monkey-cycle"
                min="1"
                placeholder="例: 2"
                inputmode="numeric"
              >
            </div>
            <button
              id="monkey-cycle-next"
              class="btn btn-primary btn-large w-100"
            >
              次へ
            </button>
          `;
          document
            .getElementById(
              'monkey-cycle-next'
            )
            .addEventListener('click', () => {
              const value =
                document.getElementById(
                  'monkey-cycle'
                ).value;
              wizardAnswers.currentCycle =
                value === ''
                  ? null
                  : parseInt(value, 10);
              nextWizardStep();
            });
        }
      },
      {
        title:
          'STEP 4: 現在ポイントは？',
        desc:
          '現在のポイントを入力してください。',
        render: c => {
          c.innerHTML = `
            <div class="form-group">
              <input
                type="number"
                id="monkey-point"
                min="0"
                placeholder="例: 430"
                inputmode="numeric"
              >
            </div>
            <button
              id="monkey-point-next"
              class="btn btn-primary btn-large w-100"
            >
              次へ
            </button>
          `;
          document
            .getElementById(
              'monkey-point-next'
            )
            .addEventListener('click', () => {
              const value =
                document.getElementById(
                  'monkey-point'
                ).value;
              wizardAnswers.currentPoint =
                value === ''
                  ? null
                  : parseInt(value, 10);
              nextWizardStep();
            });
        }
      },
      {
        title:
          'STEP 5: 特殊条件を確認',
        desc:
          '該当する条件があれば選択してください。',
        render: c => {
          c.innerHTML = `
            <div style="
              display:flex;
              flex-direction:column;
              gap:16px;
            ">
              <div class="form-group">
                <label>上位AT後</label>
                <div class="segmented-control">
                  <input type="radio" name="monkey-upper" id="mu-unknown" value="unknown" checked>
                  <label for="mu-unknown">未確認</label>
                  <input type="radio" name="monkey-upper" id="mu-no" value="no">
                  <label for="mu-no">なし</label>
                  <input type="radio" name="monkey-upper" id="mu-yes" value="yes">
                  <label for="mu-yes">あり</label>
                </div>
              </div>
              <div class="form-group">
                <label>青島VS波多野敗北後</label>
                <div class="segmented-control">
                  <input type="radio" name="monkey-aoshima" id="ma-unknown" value="unknown" checked>
                  <label for="ma-unknown">未確認</label>
                  <input type="radio" name="monkey-aoshima" id="ma-no" value="no">
                  <label for="ma-no">なし</label>
                  <input type="radio" name="monkey-aoshima" id="ma-yes" value="yes">
                  <label for="ma-yes">あり</label>
                </div>
              </div>
              <div class="form-group">
                <label>ライバルモード</label>
                <select id="monkey-rival" class="w-100">
                  <option value="">未確認</option>
                  <option value="浜岡">浜岡</option>
                </select>
              </div>
              <div class="form-group">
                <label>ステージ</label>
                <select id="monkey-stage" class="w-100">
                  <option value="">未確認</option>
                  <option value="初代ステージ">初代ステージ</option>
                  <option value="終電ステージ">終電ステージ</option>
                  <option value="ステチェン黒">ステチェン黒</option>
                </select>
              </div>
              <div class="form-group">
                <label>アイテム</label>
                <select id="monkey-item" class="w-100">
                  <option value="">未確認</option>
                  <option value="ペンギン">ペンギン</option>
                </select>
              </div>
              <div class="form-group">
                <label>AT後ヘルメット</label>
                <select id="monkey-helmet" class="w-100">
                  <option value="">未確認</option>
                  <option value="ロゴV付き">ロゴV付き</option>
                  <option value="モノクロ波多野">モノクロ波多野</option>
                  <option value="青島">青島</option>
                </select>
              </div>
              <div class="form-group">
                <label>前回ポイント</label>
                <input
                  type="number"
                  id="monkey-previous-point"
                  min="0"
                  placeholder="例: 550"
                  inputmode="numeric"
                >
              </div>
              <div class="form-group">
                <label>差枚</label>
                <input
                  type="number"
                  id="monkey-diff"
                  placeholder="例: 1500"
                  inputmode="numeric"
                >
              </div>
            </div>
            <button
              id="monkey-finish"
              class="btn btn-primary btn-large w-100"
            >
              判定する
            </button>
          `;
          document
            .getElementById(
              'monkey-finish'
            )
            .addEventListener('click', () => {
              const upper =
                document.querySelector(
                  'input[name="monkey-upper"]:checked'
                )?.value;
              const aoshima =
                document.querySelector(
                  'input[name="monkey-aoshima"]:checked'
                )?.value;
              const rival =
                document.getElementById(
                  'monkey-rival'
                ).value;
              const stage =
                document.getElementById(
                  'monkey-stage'
                ).value;
              const item =
                document.getElementById(
                  'monkey-item'
                ).value;
              const helmet =
                document.getElementById(
                  'monkey-helmet'
                ).value;
              const previousPoint =
                document.getElementById(
                  'monkey-previous-point'
                ).value;
              const diff =
                document.getElementById(
                  'monkey-diff'
                ).value;
              wizardAnswers.upperAfter =
                upper === 'yes'
                  ? true
                  : upper === 'no'
                  ? false
                  : null;
              wizardAnswers.aoshimaVsHatanofailed =
                aoshima === 'yes'
                  ? true
                  : aoshima === 'no'
                  ? false
                  : null;
              wizardAnswers.rivalMode =
                rival || null;
              wizardAnswers.stage =
                stage || null;
              wizardAnswers.item =
                item || null;
              wizardAnswers.helmet =
                helmet || null;
              wizardAnswers.previousPoint =
                previousPoint === ''
                  ? null
                  : parseInt(
                      previousPoint,
                      10
                    );
              wizardAnswers.diffMedals =
                diff === ''
                  ? null
                  : parseInt(
                      diff,
                      10
                    );
              executeJudgment(
                wizardAnswers
              );
            });
        }
      }
    ];
    document.getElementById(
      'wizard-step-indicator'
    ).textContent =
      `STEP ${currentStep + 1} / ${steps.length}`;
    document.getElementById(
      'wizard-question-title'
    ).textContent =
      steps[currentStep].title;
    document.getElementById(
      'wizard-question-desc'
    ).textContent =
      steps[currentStep].desc;
    const container =
      document.getElementById(
        'wizard-options-container'
      );
    container.innerHTML = '';
    steps[currentStep].render(
      container
    );
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
      .getElementById(
        'btn-wizard-at-next'
      )
      .addEventListener('click', () => {
        const value =
          document.getElementById(
            'wizard-input-at-g'
          ).value;
        wizardAnswers.atG =
          value !== ''
            ? parseInt(value, 10)
            : null;
        nextWizardStep();
      });
  }
  function createWizardButtons(
    container,
    options,
    callback
  ) {
    options.forEach(option => {
      const button =
        document.createElement(
          'button'
        );
      button.className =
        'wizard-btn';
      button.textContent =
        option.label;
      button.addEventListener(
        'click',
        () =>
          callback(
            option.value
          )
      );
      container.appendChild(
        button
      );
    });
  }
  function nextWizardStep() {
    currentStep++;
    const machine =
      MachineManager.getCurrentMachine();
    const maxStep =
      machine?.id === 'monkey-turn-v'
        ? 5
        : 5;
    if (currentStep >= maxStep) {
      executeJudgment(
        wizardAnswers
      );
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
    const machine =
      MachineManager.getCurrentMachine();
    const container =
      document.getElementById(
        'quick-special-effects-container'
      );
    container.innerHTML = '';
    if (!machine) return;
    // モンキーターン
    if (
      machine.id === 'monkey-turn-v'
    ) {
      container.innerHTML = `
        <div class="form-group">
          <label>現在周期</label>
          <input
            id="quick-cycle"
            type="number"
            min="1"
            placeholder="例: 2"
            inputmode="numeric"
          >
        </div>
        <div class="form-group">
          <label>現在ポイント</label>
          <input
            id="quick-point"
            type="number"
            min="0"
            placeholder="例: 430"
            inputmode="numeric"
          >
        </div>
        <div class="form-group">
          <label>前回ポイント</label>
          <input
            id="quick-previous-point"
            type="number"
            min="0"
            placeholder="例: 550"
            inputmode="numeric"
          >
        </div>
        <div class="form-group">
          <label>ライバルモード</label>
          <select id="quick-rival" class="w-100">
            <option value="">未確認</option>
            <option value="浜岡">浜岡</option>
          </select>
        </div>
        <div class="form-group">
          <label>上位AT後</label>
          <select id="quick-upper" class="w-100">
            <option value="">未確認</option>
            <option value="yes">あり</option>
            <option value="no">なし</option>
          </select>
        </div>
        <div class="form-group">
          <label>青島VS波多野敗北後</label>
          <select id="quick-aoshima" class="w-100">
            <option value="">未確認</option>
            <option value="yes">あり</option>
            <option value="no">なし</option>
          </select>
        </div>
        <div class="form-group">
          <label>差枚</label>
          <input
            id="quick-diff"
            type="number"
            placeholder="例: 1500"
            inputmode="numeric"
          >
        </div>
        <div class="form-group">
          <label>ステージ</label>
          <select id="quick-stage" class="w-100">
            <option value="">未確認</option>
            <option value="初代ステージ">初代ステージ</option>
            <option value="終電ステージ">終電ステージ</option>
            <option value="ステチェン黒">ステチェン黒</option>
          </select>
        </div>
        <div class="form-group">
          <label>アイテム</label>
          <select id="quick-item" class="w-100">
            <option value="">未確認</option>
            <option value="ペンギン">ペンギン</option>
          </select>
        </div>
        <div class="form-group">
          <label>AT後ヘルメット</label>
          <select id="quick-helmet" class="w-100">
            <option value="">未確認</option>
            <option value="ロゴV付き">ロゴV付き</option>
            <option value="モノクロ波多野">モノクロ波多野</option>
            <option value="青島">青島</option>
          </select>
        </div>
      `;
      return;
    }
    // 通常機種
    (machine.specialEffectDefinitions || [])
      .forEach(effect => {
        const div =
          document.createElement(
            'div'
          );
        div.className =
          'form-group';
        div.innerHTML = `
          <label>${effect.label}</label>
          <div class="segmented-control">
            <input
              type="radio"
              name="quick-eff-${effect.id}"
              id="quick-eff-${effect.id}-unk"
              value="unknown"
              checked
            >
            <label
              for="quick-eff-${effect.id}-unk"
            >
              未確認
            </label>
            <input
              type="radio"
              name="quick-eff-${effect.id}"
              id="quick-eff-${effect.id}-no"
              value="no"
            >
            <label
              for="quick-eff-${effect.id}-no"
            >
              なし
            </label>
            <input
              type="radio"
              name="quick-eff-${effect.id}"
              id="quick-eff-${effect.id}-yes"
              value="yes"
            >
            <label
              for="quick-eff-${effect.id}-yes"
            >
              あり
            </label>
          </div>
        `;
        container.appendChild(
          div
        );
      });
  }
  document
    .getElementById(
      'btn-quick-judge'
    )
    .addEventListener(
      'click',
      () => {
        const machine =
          MachineManager.getCurrentMachine();
        const resetValue =
          document.querySelector(
            'input[name="quick-reset"]:checked'
          ).value;
        const endingValue =
          document.querySelector(
            'input[name="quick-ending"]:checked'
          ).value;
        const baseData = {
          isReset:
            resetValue === 'yes'
              ? true
              : resetValue === 'no'
              ? false
              : null,
          currentG:
            toInt(
              'quick-current-g'
            ),
          czThrough:
            toInt(
              'quick-cz-through'
            ),
          atG:
            toInt(
              'quick-at-g'
            ),
          endingAfter:
            endingValue === 'yes',
          specialEffects: {}
        };
        // モンキーターン
        if (
          machine?.id ===
          'monkey-turn-v'
        ) {
          const upper =
            document.getElementById(
              'quick-upper'
            )?.value;
          const aoshima =
            document.getElementById(
              'quick-aoshima'
            )?.value;
          baseData.currentCycle =
            toInt(
              'quick-cycle'
            );
          baseData.currentPoint =
            toInt(
              'quick-point'
            );
          baseData.previousPoint =
            toInt(
              'quick-previous-point'
            );
          baseData.rivalMode =
            document.getElementById(
              'quick-rival'
            )?.value || null;
          baseData.upperAfter =
            upper === 'yes'
              ? true
              : upper === 'no'
              ? false
              : null;
          baseData.aoshimaVsHatanofailed =
            aoshima === 'yes'
              ? true
              : aoshima === 'no'
              ? false
              : null;
          baseData.diffMedals =
            toInt(
              'quick-diff'
            );
          baseData.stage =
            document.getElementById(
              'quick-stage'
            )?.value || null;
          baseData.item =
            document.getElementById(
              'quick-item'
            )?.value || null;
          baseData.helmet =
            document.getElementById(
              'quick-helmet'
            )?.value || null;
          executeJudgment(
            baseData
          );
          return;
        }
        // 通常機種
        (
          machine?.specialEffectDefinitions ||
          []
        ).forEach(effect => {
          const selected =
            document.querySelector(
              `input[name="quick-eff-${effect.id}"]:checked`
            );
          baseData.specialEffects[
            effect.id
          ] =
            selected?.value === 'yes'
              ? true
              : selected?.value === 'no'
              ? false
              : null;
        });
        executeJudgment(
          baseData
        );
      }
    );
  function toInt(id) {
    const element =
      document.getElementById(id);
    if (!element) return null;
    const value =
      element.value;
    return value === ''
      ? null
      : parseInt(value, 10);
  }
  // =========================
  // OCR
  // =========================
  document
    .getElementById('btn-start-ocr')
    .addEventListener(
      'click',
      () => showView(views.ocr)
    );
  document
    .getElementById(
      'btn-trigger-camera'
    )
    .addEventListener(
      'click',
      () =>
        document
          .getElementById(
            'ocr-file-input'
          )
          .click()
    );
  document
    .getElementById(
      'ocr-file-input'
    )
    .addEventListener(
      'change',
      async event => {
        const file =
          event.target.files[0];
        if (!file) return;
        document.getElementById(
          'ocr-preview-img'
        ).src =
          URL.createObjectURL(
            file
          );
        document
          .getElementById(
            'ocr-preview-container'
          )
          .classList.remove(
            'hidden'
          );
        document
          .getElementById(
            'ocr-loading'
          )
          .classList.remove(
            'hidden'
          );
        document
          .getElementById(
            'ocr-result-form'
          )
          .classList.add(
            'hidden'
          );
        try {
          const result =
            await OcrService.analyzeImage(
              file
            );
          document
            .getElementById(
              'ocr-loading'
            )
            .classList.add(
              'hidden'
            );
          document
            .getElementById(
              'ocr-result-form'
            )
            .classList.remove(
              'hidden'
            );
          applyOcrField(
            'current-g',
            result.currentG
          );
          applyOcrField(
            'cz-through',
            result.czThrough
          );
          applyOcrField(
            'at-g',
            result.atG
          );
        } catch (error) {
          console.error(
            'OCR error:',
            error
          );
          document
            .getElementById(
              'ocr-loading'
            )
            .classList.add(
              'hidden'
            );
          alert(
            'OCR解析に失敗しました。'
          );
        }
      }
    );
  function applyOcrField(
    id,
    data
  ) {
    const input =
      document.getElementById(
        `ocr-input-${id}`
      );
    const badge =
      document.getElementById(
        `badge-${id}`
      );
    if (
      data &&
      data.value !== null
    ) {
      input.value =
        data.value;
      badge.textContent =
        `信頼度: ${data.confidence}`;
      badge.className =
        `confidence-badge confidence-${getConfidenceClass(
          data.confidence
        )}`;
    } else {
      input.value = '';
      badge.textContent =
        '未検出';
      badge.className =
        'confidence-badge';
    }
  }
  function getConfidenceClass(
    confidence
  ) {
    return confidence === '高'
      ? 'high'
      : confidence === '中'
      ? 'medium'
      : 'low';
  }
  document
    .getElementById(
      'btn-ocr-next-step'
    )
    .addEventListener(
      'click',
      () => {
        const current =
          val(
            'ocr-input-current-g'
          );
        const through =
          val(
            'ocr-input-cz-through'
          );
        const at =
          val(
            'ocr-input-at-g'
          );
        setupQuickInputForm();
        if (current !== '') {
          document.getElementById(
            'quick-current-g'
          ).value =
            current;
        }
        if (through !== '') {
          document.getElementById(
            'quick-cz-through'
          ).value =
            through;
        }
        if (at !== '') {
          document.getElementById(
            'quick-at-g'
          ).value =
            at;
        }
        showView(
          views.quick
        );
      }
    );
  function val(id) {
    const element =
      document.getElementById(id);
    return element
      ? element.value
      : '';
  }
  // =========================
  // 判定
  // =========================
  function executeJudgment(
    inputData
  ) {
    const machine =
      MachineManager.getCurrentMachine();
    if (!machine) {
      alert(
        '機種データが読み込まれていません。'
      );
      return;
    }
    const result =
      JudgeEngine.judge(
        machine,
        inputData
      );
    HistoryManager.addEntry({
      machineId:
        machine.id,
      machineName:
        machine.name,
      inputData,
      result
    });
    renderResultView(
      result
    );
    renderHomeHistory();
    showView(
      views.result
    );
  }
  function renderResultView(
    result
  ) {
    const hero =
      document.getElementById(
        'result-hero-card'
      );
    hero.className =
      `result-hero ${getStatusClass(
        result.status
      )}`;
    document.getElementById(
      'result-status-badge'
    ).textContent =
      getStatusBadgeText(
        result.status
      );
    document.getElementById(
      'result-status-title'
    ).textContent =
      result.title;
    document.getElementById(
      'result-target-text'
    ).textContent =
      result.target || 'なし';
    document.getElementById(
      'result-stop-condition'
    ).textContent =
      result.stopCondition ||
      '即やめ';
    const list =
      document.getElementById(
        'result-reasons-list'
      );
    list.innerHTML = '';
    (
      result.reasons?.length
        ? result.reasons
        : [
            '狙い目条件に該当しませんでした。'
          ]
    ).forEach(reason => {
      const li =
        document.createElement(
          'li'
        );
      li.textContent =
        '・' + reason;
      list.appendChild(
        li
      );
    });
    const warningCard =
      document.getElementById(
        'result-warning-card'
      );
    const warningList =
      document.getElementById(
        'result-warnings-list'
      );
    warningList.innerHTML = '';
    if (
      result.warnings?.length
    ) {
      warningCard.classList.remove(
        'hidden'
      );
      result.warnings.forEach(
        warning => {
          const li =
            document.createElement(
              'li'
            );
          li.textContent =
            '⚠️ ' + warning;
          warningList.appendChild(
            li
          );
        }
      );
    } else {
      warningCard.classList.add(
        'hidden'
      );
    }
  }
  function getStatusClass(
    status
  ) {
    return status === 'GO'
      ? 'result-status-go'
      : status === 'TENGOKU'
      ? 'result-status-tengoku'
      : status === 'SKIP'
      ? 'result-status-skip'
      : 'result-status-unknown';
  }
  function getStatusBadgeText(
    status
  ) {
    return status === 'GO'
      ? '🟢 打つ'
      : status === 'TENGOKU'
      ? '🔵 天国確認'
      : status === 'SKIP'
      ? '🔴 打たない'
      : '⚪ 判定不能';
  }
  // =========================
  // 履歴
  // =========================
  document
    .getElementById(
      'btn-view-history'
    )
    .addEventListener(
      'click',
      () => {
        renderFullHistory();
        showView(
          views.history
        );
      }
    );
  document
    .getElementById(
      'btn-clear-history'
    )
    .addEventListener(
      'click',
      () => {
        if (
          confirm(
            '判定履歴をすべて削除しますか？'
          )
        ) {
          HistoryManager.clearHistory();
          renderFullHistory();
          renderHomeHistory();
        }
      }
    );
  // =========================
  // 設定
  // =========================
  document
    .getElementById(
      'btn-open-settings'
    )
    .addEventListener(
      'click',
      () =>
        showView(
          views.settings
        )
    );
  document
    .getElementById(
      'btn-reset-app-data'
    )
    .addEventListener(
      'click',
      () => {
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
      }
    );
  // =========================
  // 履歴表示
  // =========================
  function renderHomeHistory() {
    const container =
      document.getElementById(
        'home-history-list'
      );
    const history =
      HistoryManager
        .getHistory()
        .slice(0, 3);
    container.innerHTML =
      history.length
        ? history
            .map(
              createHistoryItemHTML
            )
            .join('')
        : '<p class="empty-msg">履歴はありません</p>';
  }
  function renderFullHistory() {
    const container =
      document.getElementById(
        'full-history-list'
      );
    const history =
      HistoryManager.getHistory();
    container.innerHTML =
      history.length
        ? history
            .map(
              createHistoryItemHTML
            )
            .join('')
        : '<p class="empty-msg">履歴はありません</p>';
  }
  function createHistoryItemHTML(
    item
  ) {
    const date =
      new Date(
        item.timestamp
      ).toLocaleString(
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
            ${item.machineName}
          </span>
          <span class="history-cond">
            ${item.result.title}
          </span>
          <span class="history-time">
            ${date}
          </span>
        </div>
        <span
          class="history-tag ${getStatusClass(
            item.result.status
          )}"
        >
          ${getStatusBadgeText(
            item.result.status
          )}
        </span>
      </div>
    `;
  }
});

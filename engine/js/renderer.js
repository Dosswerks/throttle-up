/**
 * Renderer — Manages DOM rendering of sequence slots, step cards, HUD, and overlays.
 */
class Renderer {
  constructor(emitter) {
    this._emitter = emitter;
    this._els = {};
  }

  init() {
    this._els = {
      speedFill: document.getElementById('speed-fill'),
      speedLabel: document.getElementById('speed-label'),
      speedMeter: document.getElementById('speed-meter'),
      hudSpeed: document.getElementById('hud-speed'),
      hudPlaced: document.getElementById('hud-placed'),
      hudFeedback: document.getElementById('hud-feedback'),
      sequenceSlots: document.getElementById('sequence-slots'),
      stepCards: document.getElementById('step-cards'),
      feedbackCaption: document.getElementById('feedback-caption'),
      startScreen: document.getElementById('start-screen'),
      startLogo: document.getElementById('start-logo'),
      startTitle: document.getElementById('start-title'),
      startSubtitle: document.getElementById('start-subtitle'),
      pauseScreen: document.getElementById('pause-screen'),
      helpScreen: document.getElementById('help-screen'),
      completeScreen: document.getElementById('complete-screen'),
      completeTitle: document.getElementById('complete-title'),
      finalScore: document.getElementById('final-score'),
      finalStats: document.getElementById('final-stats'),
      nameInput: document.getElementById('name-input'),
    };
  }

  /**
   * Render the start screen with config values.
   */
  renderStartScreen(config) {
    if (config.logo) {
      this._els.startLogo.src = config.logo;
      this._els.startLogo.classList.remove('hidden');
      // Logo contains the wordmark, so hide the text title
      this._els.startTitle.classList.add('hidden');
    } else if (config.title) {
      this._els.startTitle.textContent = config.title;
      this._els.startTitle.classList.remove('hidden');
    }
    if (config.subtitle) {
      this._els.startSubtitle.textContent = config.subtitle;
    }
    if (config.requirePlayerName) {
      this._els.nameInput.classList.remove('hidden');
    }
  }

  /**
   * Render sequence slots (empty placeholders).
   */
  renderSlots(count) {
    this._els.sequenceSlots.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const slot = document.createElement('div');
      slot.className = 'sequence-slot';
      slot.dataset.slotIndex = i;
      slot.setAttribute('role', 'listitem');
      slot.setAttribute('aria-label', `Slot ${i + 1} of ${count} - empty`);
      slot.innerHTML = `
        <span class="slot-number">Step ${i + 1}</span>
        <span class="slot-content"></span>
      `;
      this._els.sequenceSlots.appendChild(slot);
    }
  }

  /**
   * Render shuffled step cards.
   */
  renderStepCards(steps) {
    this._els.stepCards.innerHTML = '';
    for (const step of steps) {
      const card = document.createElement('div');
      card.className = 'step-card';
      card.dataset.stepId = step.id;
      card.setAttribute('role', 'listitem');
      card.setAttribute('draggable', 'true');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', step.text);
      card.textContent = step.text;
      this._els.stepCards.appendChild(card);
    }
  }

  /**
   * Update speed meter display.
   */
  updateSpeed(speed) {
    this._els.speedFill.style.width = `${speed}%`;
    this._els.speedLabel.textContent = `${Math.round(speed)}%`;
    this._els.hudSpeed.textContent = `${Math.round(speed)}%`;
    this._els.speedMeter.setAttribute('aria-valuenow', Math.round(speed));
  }

  /**
   * Update placed count in HUD.
   */
  updatePlacedCount(placed, total) {
    this._els.hudPlaced.textContent = `${placed} / ${total}`;
  }

  /**
   * Show feedback in HUD.
   */
  showHudFeedback(text, type) {
    this._els.hudFeedback.textContent = text;
    this._els.hudFeedback.className = 'hud-item';
    if (type === 'correct') this._els.hudFeedback.classList.add('hud-correct');
    if (type === 'incorrect') this._els.hudFeedback.classList.add('hud-incorrect');

    clearTimeout(this._hudFeedbackTimer);
    this._hudFeedbackTimer = setTimeout(() => {
      this._els.hudFeedback.textContent = '';
      this._els.hudFeedback.className = 'hud-item';
    }, 2000);
  }

  /**
   * Show feedback caption in runway area.
   */
  showFeedbackCaption(text, type) {
    this._els.feedbackCaption.textContent = text;
    this._els.feedbackCaption.className = '';
    if (type) this._els.feedbackCaption.classList.add(`feedback-${type}`);

    clearTimeout(this._captionTimer);
    this._captionTimer = setTimeout(() => {
      this._els.feedbackCaption.classList.add('hidden');
    }, 1500);
  }

  /**
   * Mark a slot as filled with a step.
   */
  fillSlot(slotIndex, stepText) {
    const slot = this._els.sequenceSlots.children[slotIndex];
    if (!slot) return;
    slot.classList.add('filled');
    slot.querySelector('.slot-content').textContent = stepText;
    slot.setAttribute('aria-label', `Slot ${slotIndex + 1} - ${stepText}`);
  }

  /**
   * Mark a slot as correct.
   */
  markSlotCorrect(slotIndex) {
    const slot = this._els.sequenceSlots.children[slotIndex];
    if (!slot) return;
    slot.classList.remove('incorrect');
    slot.classList.add('correct', 'locked');
  }

  /**
   * Mark a slot as incorrect (with shake).
   */
  markSlotIncorrect(slotIndex) {
    const slot = this._els.sequenceSlots.children[slotIndex];
    if (!slot) return;
    slot.classList.add('incorrect');
    // Remove shake class after animation
    setTimeout(() => {
      slot.classList.remove('incorrect');
    }, 500);
  }

  /**
   * Clear a slot back to empty.
   */
  clearSlot(slotIndex) {
    const slot = this._els.sequenceSlots.children[slotIndex];
    if (!slot) return;
    slot.classList.remove('filled', 'correct', 'incorrect', 'locked');
    slot.querySelector('.slot-content').textContent = '';
    slot.setAttribute('aria-label', `Slot ${slotIndex + 1} - empty`);
  }

  /**
   * Mark a step card as placed (dimmed).
   */
  markCardPlaced(stepId) {
    const card = this._els.stepCards.querySelector(`[data-step-id="${stepId}"]`);
    if (card) card.classList.add('placed');
  }

  /**
   * Restore a step card to available.
   */
  restoreCard(stepId) {
    const card = this._els.stepCards.querySelector(`[data-step-id="${stepId}"]`);
    if (card) card.classList.remove('placed');
  }

  /**
   * Show/hide overlays.
   */
  showOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  hideOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  hideAllOverlays() {
    document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
  }

  /**
   * Render completion screen.
   */
  renderComplete(results) {
    this._els.finalScore.textContent = results.score;
    this._els.finalStats.innerHTML = `
      <div class="stat-item"><div class="stat-value">${results.accuracy}%</div><div class="stat-label">Accuracy</div></div>
      <div class="stat-item"><div class="stat-value">${results.longestStreak}</div><div class="stat-label">Best Streak</div></div>
      <div class="stat-item"><div class="stat-value">${results.totalTime}s</div><div class="stat-label">Time</div></div>
      <div class="stat-item"><div class="stat-value">${results.rating}</div><div class="stat-label">Rating</div></div>
    `;
  }

  getSlotElements() {
    return this._els.sequenceSlots.children;
  }

  getCardElements() {
    return this._els.stepCards.children;
  }
}

window.Renderer = Renderer;

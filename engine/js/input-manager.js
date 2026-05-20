/**
 * InputManager — Keyboard support for reordering steps without drag-and-drop.
 * Allows selecting a card with Enter/Space, then placing it with arrow keys.
 */
class InputManager {
  constructor(emitter) {
    this._emitter = emitter;
    this._enabled = false;
    this._selectedCard = null;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onCardClick = this._onCardClick.bind(this);
    this._onSlotClick = this._onSlotClick.bind(this);
  }

  enable() {
    if (this._enabled) return;
    this._enabled = true;
    document.addEventListener('keydown', this._onKeyDown);
    document.getElementById('step-cards').addEventListener('click', this._onCardClick);
    document.getElementById('sequence-slots').addEventListener('click', this._onSlotClick);
  }

  disable() {
    if (!this._enabled) return;
    this._enabled = false;
    document.removeEventListener('keydown', this._onKeyDown);
    document.getElementById('step-cards')?.removeEventListener('click', this._onCardClick);
    document.getElementById('sequence-slots')?.removeEventListener('click', this._onSlotClick);
    this._clearSelection();
  }

  _onCardClick(e) {
    const card = e.target.closest('.step-card');
    if (!card || card.classList.contains('placed')) return;

    this._selectCard(card);
  }

  _onSlotClick(e) {
    const slot = e.target.closest('.sequence-slot');
    if (!slot || slot.classList.contains('locked')) return;

    if (this._selectedCard) {
      const stepId = this._selectedCard.dataset.stepId;
      const slotIndex = parseInt(slot.dataset.slotIndex, 10);
      this._emitter.emit('stepDropped', { stepId, slotIndex });
      this._clearSelection();
    }
  }

  _onKeyDown(e) {
    // Global shortcuts
    if (e.key === 'p' || e.key === 'P') {
      this._emitter.emit('action', 'togglePause');
      return;
    }
    if (e.key === 'h' || e.key === 'H') {
      this._emitter.emit('action', 'toggleHelp');
      return;
    }
    if (e.key === 'm' || e.key === 'M') {
      this._emitter.emit('action', 'toggleMute');
      return;
    }

    // Card selection via Enter/Space
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement?.classList.contains('step-card')) {
      e.preventDefault();
      const card = document.activeElement;
      if (!card.classList.contains('placed')) {
        this._selectCard(card);
      }
      return;
    }

    // If a card is selected, number keys 1-9 place it in that slot
    if (this._selectedCard && e.key >= '1' && e.key <= '9') {
      const slotIndex = parseInt(e.key, 10) - 1;
      const stepId = this._selectedCard.dataset.stepId;
      this._emitter.emit('stepDropped', { stepId, slotIndex });
      this._clearSelection();
      return;
    }

    // Escape to deselect
    if (e.key === 'Escape') {
      this._clearSelection();
    }
  }

  _selectCard(card) {
    this._clearSelection();
    this._selectedCard = card;
    card.style.outline = '3px solid var(--accent)';
    card.style.outlineOffset = '2px';
  }

  _clearSelection() {
    if (this._selectedCard) {
      this._selectedCard.style.outline = '';
      this._selectedCard.style.outlineOffset = '';
      this._selectedCard = null;
    }
  }
}

window.InputManager = InputManager;

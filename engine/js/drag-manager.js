/**
 * DragManager — Handles drag-and-drop and touch interactions for step cards → slots.
 */
class DragManager {
  constructor(emitter) {
    this._emitter = emitter;
    this._enabled = false;
    this._draggedCard = null;
    this._touchClone = null;

    this._onDragStart = this._onDragStart.bind(this);
    this._onDragOver = this._onDragOver.bind(this);
    this._onDragLeave = this._onDragLeave.bind(this);
    this._onDrop = this._onDrop.bind(this);
    this._onDragEnd = this._onDragEnd.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
  }

  enable() {
    if (this._enabled) return;
    this._enabled = true;

    const container = document.getElementById('game-container');
    container.addEventListener('dragstart', this._onDragStart);
    container.addEventListener('dragover', this._onDragOver);
    container.addEventListener('dragleave', this._onDragLeave);
    container.addEventListener('drop', this._onDrop);
    container.addEventListener('dragend', this._onDragEnd);

    // Touch support
    container.addEventListener('touchstart', this._onTouchStart, { passive: false });
    container.addEventListener('touchmove', this._onTouchMove, { passive: false });
    container.addEventListener('touchend', this._onTouchEnd);
  }

  disable() {
    if (!this._enabled) return;
    this._enabled = false;

    const container = document.getElementById('game-container');
    container.removeEventListener('dragstart', this._onDragStart);
    container.removeEventListener('dragover', this._onDragOver);
    container.removeEventListener('dragleave', this._onDragLeave);
    container.removeEventListener('drop', this._onDrop);
    container.removeEventListener('dragend', this._onDragEnd);
    container.removeEventListener('touchstart', this._onTouchStart);
    container.removeEventListener('touchmove', this._onTouchMove);
    container.removeEventListener('touchend', this._onTouchEnd);
  }

  // --- Drag Events (Desktop) ---

  _onDragStart(e) {
    const card = e.target.closest('.step-card');
    if (!card || card.classList.contains('placed')) return;

    this._draggedCard = card;
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', card.dataset.stepId);
    e.dataTransfer.effectAllowed = 'move';
  }

  _onDragOver(e) {
    const slot = e.target.closest('.sequence-slot');
    if (!slot || slot.classList.contains('locked')) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!slot.classList.contains('drag-over')) {
      slot.classList.add('drag-over');
      this._emitter.emit('slotHover');
    }
  }

  _onDragLeave(e) {
    const slot = e.target.closest('.sequence-slot');
    if (slot) slot.classList.remove('drag-over');
  }

  _onDrop(e) {
    e.preventDefault();
    const slot = e.target.closest('.sequence-slot');
    if (!slot || slot.classList.contains('locked')) return;

    slot.classList.remove('drag-over');

    const stepId = e.dataTransfer.getData('text/plain');
    const slotIndex = parseInt(slot.dataset.slotIndex, 10);

    this._emitter.emit('stepDropped', { stepId, slotIndex });
  }

  _onDragEnd(e) {
    if (this._draggedCard) {
      this._draggedCard.classList.remove('dragging');
      this._draggedCard = null;
    }
    // Clear all drag-over states
    document.querySelectorAll('.sequence-slot.drag-over').forEach(s => s.classList.remove('drag-over'));
  }

  // --- Touch Events (Mobile) ---

  _onTouchStart(e) {
    const card = e.target.closest('.step-card');
    if (!card || card.classList.contains('placed')) return;

    e.preventDefault();
    this._draggedCard = card;
    card.classList.add('dragging');

    // Create visual clone for touch dragging
    this._touchClone = card.cloneNode(true);
    this._touchClone.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.8;
      transform: scale(1.05);
      width: ${card.offsetWidth}px;
    `;
    document.body.appendChild(this._touchClone);
    this._moveTouchClone(e.touches[0]);
  }

  _onTouchMove(e) {
    if (!this._draggedCard) return;
    e.preventDefault();

    this._moveTouchClone(e.touches[0]);

    // Highlight slot under finger
    const touch = e.touches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = elementBelow?.closest('.sequence-slot');

    document.querySelectorAll('.sequence-slot.drag-over').forEach(s => s.classList.remove('drag-over'));
    if (slot && !slot.classList.contains('locked')) {
      slot.classList.add('drag-over');
      this._emitter.emit('slotHover');
    }
  }

  _onTouchEnd(e) {
    if (!this._draggedCard) return;

    // Find slot under last touch position
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = elementBelow?.closest('.sequence-slot');

    if (slot && !slot.classList.contains('locked')) {
      slot.classList.remove('drag-over');
      const stepId = this._draggedCard.dataset.stepId;
      const slotIndex = parseInt(slot.dataset.slotIndex, 10);
      this._emitter.emit('stepDropped', { stepId, slotIndex });
    }

    // Cleanup
    this._draggedCard.classList.remove('dragging');
    this._draggedCard = null;
    if (this._touchClone) {
      this._touchClone.remove();
      this._touchClone = null;
    }
    document.querySelectorAll('.sequence-slot.drag-over').forEach(s => s.classList.remove('drag-over'));
  }

  _moveTouchClone(touch) {
    if (!this._touchClone) return;
    this._touchClone.style.left = `${touch.clientX - 60}px`;
    this._touchClone.style.top = `${touch.clientY - 30}px`;
  }
}

window.DragManager = DragManager;

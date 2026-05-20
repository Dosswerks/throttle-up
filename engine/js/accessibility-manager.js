/**
 * AccessibilityManager — ARIA announcements and keyboard support for drag-and-drop.
 */
class AccessibilityManager {
  constructor(emitter) {
    this._emitter = emitter;
    this._liveRegion = null;
    this._init();
  }

  _init() {
    // Create a visually hidden live region for announcements
    this._liveRegion = document.createElement('div');
    this._liveRegion.setAttribute('role', 'status');
    this._liveRegion.setAttribute('aria-live', 'polite');
    this._liveRegion.setAttribute('aria-atomic', 'true');
    this._liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);';
    document.body.appendChild(this._liveRegion);
  }

  announce(message) {
    if (this._liveRegion) {
      this._liveRegion.textContent = '';
      // Force re-announcement
      requestAnimationFrame(() => {
        this._liveRegion.textContent = message;
      });
    }
  }

  announceCorrect(stepText, slotIndex) {
    this.announce(`Correct! "${stepText}" placed in position ${slotIndex + 1}. Speed increasing.`);
  }

  announceIncorrect(stepText, slotIndex) {
    this.announce(`Incorrect. "${stepText}" is not the right step for position ${slotIndex + 1}. Speed decreasing.`);
  }

  announceSpeed(speed) {
    this.announce(`Current speed: ${speed}%`);
  }

  announceTakeoff() {
    this.announce('All steps correct! Takeoff speed reached. The plane is taking off!');
  }

  announceComplete(results) {
    this.announce(`Game complete! Score: ${results.score}. Accuracy: ${results.accuracy}%. Rating: ${results.rating}.`);
  }
}

window.AccessibilityManager = AccessibilityManager;

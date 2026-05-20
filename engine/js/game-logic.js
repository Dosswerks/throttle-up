/**
 * GameLogic — Pure logic: speed, scoring, placement validation.
 * No DOM or rendering dependencies.
 */
class GameLogic {
  constructor(steps, config) {
    this._steps = steps; // Array of step objects with .order
    this._totalSteps = steps.length;
    this._speedIncrement = config.speedIncrement || 20;
    this._speedDecrement = config.speedDecrement || 10;
    this._takeoffThreshold = config.takeoffThreshold || 100;
    this.reset();
  }

  reset() {
    this.speed = 0;
    this.score = 0;
    this.streak = 0;
    this.longestStreak = 0;
    this.placements = []; // { slotIndex, stepId, correct, timestamp }
    this.correctCount = 0;
    this.incorrectCount = 0;
    this._startTime = Date.now();
    this._slotState = new Array(this._totalSteps).fill(null); // stepId in each slot
  }

  /**
   * Evaluate placing a step into a slot.
   * @param {number} slotIndex - 0-based slot position
   * @param {object} step - The step object being placed
   * @returns {PlacementResult}
   */
  evaluatePlacement(slotIndex, step) {
    const expectedOrder = slotIndex + 1;
    const correct = step.order === expectedOrder;

    if (correct) {
      this.speed = Math.min(this.speed + this._speedIncrement, 100);
      this.streak++;
      if (this.streak > this.longestStreak) this.longestStreak = this.streak;
      this.correctCount++;
      this.score += this._calculatePoints();
    } else {
      this.speed = Math.max(this.speed - this._speedDecrement, 0);
      this.streak = 0;
      this.incorrectCount++;
    }

    this._slotState[slotIndex] = step.id;

    const record = {
      slotIndex,
      stepId: step.id,
      stepOrder: step.order,
      correct,
      timestamp: Date.now(),
    };
    this.placements.push(record);

    return {
      correct,
      speed: this.speed,
      score: this.score,
      streak: this.streak,
      isComplete: this._checkComplete(),
    };
  }

  /**
   * Remove a step from a slot (when swapping or removing).
   */
  clearSlot(slotIndex) {
    this._slotState[slotIndex] = null;
  }

  /**
   * Check if all slots are correctly filled.
   * Takeoff triggers when all steps are in the right place,
   * regardless of current speed (speed will be set to 100 on completion).
   */
  _checkComplete() {
    for (let i = 0; i < this._totalSteps; i++) {
      const stepId = this._slotState[i];
      if (!stepId) return false;
      const step = this._steps.find(s => s.id === stepId);
      if (!step || step.order !== i + 1) return false;
    }
    // All correct — force speed to takeoff threshold
    this.speed = this._takeoffThreshold;
    return true;
  }

  /**
   * Force-check completion (called after corrections).
   */
  checkComplete() {
    return this._checkComplete();
  }

  _calculatePoints() {
    let points = 100;
    // Streak bonus
    if (this.streak >= 5) points += 50;
    else if (this.streak >= 3) points += 25;
    return points;
  }

  getProgress() {
    return {
      speed: this.speed,
      score: this.score,
      streak: this.streak,
      longestStreak: this.longestStreak,
      correctCount: this.correctCount,
      incorrectCount: this.incorrectCount,
      slotState: [...this._slotState],
      placements: [...this.placements],
    };
  }

  getResults() {
    const totalTime = Math.round((Date.now() - this._startTime) / 1000);
    const accuracy = this._totalSteps > 0
      ? Math.round((this.correctCount / (this.correctCount + this.incorrectCount)) * 100)
      : 0;

    return {
      score: this.score,
      speed: this.speed,
      correctCount: this.correctCount,
      incorrectCount: this.incorrectCount,
      totalAttempts: this.correctCount + this.incorrectCount,
      accuracy,
      longestStreak: this.longestStreak,
      totalTime,
      rating: this._getRating(accuracy),
    };
  }

  _getRating(accuracy) {
    if (accuracy >= 95) return 'Captain';
    if (accuracy >= 80) return 'First Officer';
    if (accuracy >= 60) return 'Co-Pilot';
    return 'Cadet';
  }

  getTotalSteps() {
    return this._totalSteps;
  }

  getSpeed() {
    return this.speed;
  }
}

window.GameLogic = GameLogic;

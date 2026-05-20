/**
 * GameStateMachine — Manages game lifecycle states.
 * States: idle → playing → paused → complete
 */
class GameStateMachine {
  constructor(emitter) {
    this._emitter = emitter;
    this._state = 'idle';
    this._validTransitions = {
      idle: ['playing'],
      playing: ['paused', 'complete'],
      paused: ['playing'],
      complete: ['idle'],
    };
  }

  getState() {
    return this._state;
  }

  transition(newState) {
    const allowed = this._validTransitions[this._state];
    if (!allowed || !allowed.includes(newState)) {
      console.warn(`Invalid state transition: ${this._state} → ${newState}`);
      return false;
    }
    const oldState = this._state;
    this._state = newState;
    this._emitter.emit('stateChange', { from: oldState, to: newState });
    return true;
  }

  reset() {
    this._state = 'idle';
  }

  isPlaying() {
    return this._state === 'playing';
  }

  isPaused() {
    return this._state === 'paused';
  }

  isComplete() {
    return this._state === 'complete';
  }
}

window.GameStateMachine = GameStateMachine;

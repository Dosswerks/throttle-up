/**
 * EventEmitter — Lightweight pub/sub for decoupled module communication.
 */
class EventEmitter {
  constructor() {
    this._listeners = {};
  }

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  }

  emit(event, ...args) {
    if (!this._listeners[event]) return;
    for (const cb of this._listeners[event]) {
      cb(...args);
    }
  }
}

window.EventEmitter = EventEmitter;

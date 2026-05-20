/**
 * PersistenceManager — Save/restore game progress to localStorage.
 */
class PersistenceManager {
  constructor(gameId) {
    this._key = `throttle-up-${gameId || 'default'}`;
  }

  save(data) {
    try {
      localStorage.setItem(this._key, JSON.stringify(data));
    } catch (e) {
      console.warn('PersistenceManager: Unable to save', e);
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(this._key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('PersistenceManager: Unable to load', e);
      return null;
    }
  }

  clear() {
    try {
      localStorage.removeItem(this._key);
    } catch (e) {
      console.warn('PersistenceManager: Unable to clear', e);
    }
  }

  exists() {
    return localStorage.getItem(this._key) !== null;
  }
}

window.PersistenceManager = PersistenceManager;

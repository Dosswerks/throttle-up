/**
 * ConfigManager — Merges JSON config with defaults.
 */
class ConfigManager {
  constructor() {
    this._defaults = {
      title: 'THROTTLE UP',
      subtitle: '',
      logo: '',
      primaryColor: '#1e3a5f',
      accentColor: '#e8873d',
      backgroundColor: '#0a0a1a',
      speedIncrement: 20,
      speedDecrement: 10,
      takeoffThreshold: 100,
      showExplanations: true,
      audioEnabled: true,
      requirePlayerName: false,
    };
    this._config = { ...this._defaults };
  }

  load(configObj) {
    this._config = { ...this._defaults, ...configObj };
    this._applyCSS();
  }

  get(key) {
    return this._config[key];
  }

  getAll() {
    return { ...this._config };
  }

  _applyCSS() {
    const root = document.documentElement;
    root.style.setProperty('--primary', this._config.primaryColor);
    root.style.setProperty('--accent', this._config.accentColor);
    root.style.setProperty('--bg-dark', this._config.backgroundColor);
  }
}

window.ConfigManager = ConfigManager;

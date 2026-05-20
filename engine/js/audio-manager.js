/**
 * AudioManager — Handles SFX via MP3 files and ambient engine roar loop.
 *
 * AUDIO FILES NEEDED:
 * - assets/audio/correct.mp3      (correct placement beep)
 * - assets/audio/incorrect.mp3    (incorrect placement beep)
 * - assets/audio/takeoff.mp3      (takeoff whoosh — plays on final correct step)
 * - assets/audio/engine-roar.mp3  (low-level looping ambient roar)
 */
class AudioManager {
  constructor(emitter) {
    this._emitter = emitter;
    this._muted = false;
    this._audioEnabled = false;

    // Audio elements
    this._correctSound = null;
    this._incorrectSound = null;
    this._takeoffSound = null;
    this._celebrationSound = null;
    this._engineLoop = null;

    // Procedural engine rumble
    this._ctx = null;
    this._rumbleOsc = null;
    this._rumbleGain = null;
    this._rumbleFreq = 55;
    this._rumbleTargetFreq = 55;
    this._rumbleFading = false;
  }

  init(audioEnabled) {
    this._audioEnabled = audioEnabled;
    if (!audioEnabled) {
      this._muted = true;
      return;
    }

    // Pre-load sound effects (cache-bust with timestamp)
    const cb = '?v=' + Date.now();
    this._correctSound = this._createAudio('assets/audio/correct.mp3' + cb);
    this._incorrectSound = this._createAudio('assets/audio/incorrect.mp3' + cb);
    this._takeoffSound = this._createAudio('assets/audio/takeoff.mp3' + cb);
    this._celebrationSound = this._createAudio('assets/audio/celebration.mp3' + cb);

    // Engine roar loop (low volume ambient) — optional MP3
    this._engineLoop = this._createAudio('assets/audio/engine-roar.mp3' + cb);
    if (this._engineLoop) {
      this._engineLoop.loop = true;
      this._engineLoop.volume = 0.15;
    }

    // Set up Web Audio context for procedural rumble
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('AudioManager: Web Audio not available for rumble');
    }
  }

  _createAudio(src) {
    try {
      const audio = new Audio(src);
      audio.preload = 'auto';
      // iOS requires playsinline attribute for inline playback
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
      return audio;
    } catch (e) {
      console.warn('AudioManager: Could not create audio for', src);
      return null;
    }
  }

  /**
   * Start the procedural engine rumble and optional MP3 loop.
   */
  startEngineLoop() {
    if (this._muted) return;

    // Start MP3 loop if available
    if (this._engineLoop) {
      this._engineLoop.currentTime = 0;
      this._engineLoop.play().catch(() => {});
    }

    // Start procedural rumble
    if (this._ctx && !this._rumbleOsc) {
      if (this._ctx.state === 'suspended') {
        this._ctx.resume().catch(() => {});
      }

      // Main low-frequency oscillator
      this._rumbleOsc = this._ctx.createOscillator();
      this._rumbleOsc.type = 'sawtooth';
      this._rumbleOsc.frequency.value = this._rumbleFreq;

      // Sub-bass layer
      this._rumbleSubOsc = this._ctx.createOscillator();
      this._rumbleSubOsc.type = 'sine';
      this._rumbleSubOsc.frequency.value = this._rumbleFreq * 0.5;

      // Gain node (keep it very low)
      this._rumbleGain = this._ctx.createGain();
      this._rumbleGain.gain.value = 0.06;

      // Low-pass filter to keep it rumbly
      this._rumbleFilter = this._ctx.createBiquadFilter();
      this._rumbleFilter.type = 'lowpass';
      this._rumbleFilter.frequency.value = 120;
      this._rumbleFilter.Q.value = 1;

      // Connect: oscillators → filter → gain → output
      this._rumbleOsc.connect(this._rumbleFilter);
      this._rumbleSubOsc.connect(this._rumbleFilter);
      this._rumbleFilter.connect(this._rumbleGain);
      this._rumbleGain.connect(this._ctx.destination);

      this._rumbleOsc.start();
      this._rumbleSubOsc.start();
    }
  }

  /**
   * Stop the engine rumble and MP3 loop.
   */
  stopEngineLoop() {
    if (this._engineLoop) {
      this._engineLoop.pause();
      this._engineLoop.currentTime = 0;
    }

    if (this._rumbleOsc) {
      this._rumbleOsc.stop();
      this._rumbleOsc = null;
    }
    if (this._rumbleSubOsc) {
      this._rumbleSubOsc.stop();
      this._rumbleSubOsc = null;
    }
    if (this._rumbleGain) {
      this._rumbleGain = null;
    }
    if (this._rumbleFilter) {
      this._rumbleFilter = null;
    }
  }

  /**
   * Update rumble pitch based on current speed (0-100).
   * Frequency ramps from 55Hz (idle) to ~180Hz (full speed).
   */
  setRumbleSpeed(speed) {
    if (!this._ctx || !this._rumbleOsc || !this._rumbleGain) return;
    if (this._rumbleFading) return; // Don't override fade-out

    // Map speed 0-100 to frequency 55-180Hz
    const freq = 55 + (speed / 100) * 125;
    const filterFreq = 120 + (speed / 100) * 200;
    const volume = 0.06 + (speed / 100) * 0.06;

    const now = this._ctx.currentTime;
    this._rumbleOsc.frequency.linearRampToValueAtTime(freq, now + 0.3);
    this._rumbleSubOsc.frequency.linearRampToValueAtTime(freq * 0.5, now + 0.3);
    this._rumbleFilter.frequency.linearRampToValueAtTime(filterFreq, now + 0.3);
    this._rumbleGain.gain.linearRampToValueAtTime(Math.min(volume, 0.12), now + 0.3);
  }

  playCorrect() {
    this._playSound(this._correctSound);
  }

  playIncorrect() {
    this._playSound(this._incorrectSound);
  }

  playTakeoff() {
    // Fade out rumble over 1.5 seconds
    this._fadeOutRumble(1500);
    // Fade out MP3 engine loop if playing
    if (this._engineLoop) {
      this._fadeOut(this._engineLoop, 1500);
    }
    // Play takeoff sound
    this._playSound(this._takeoffSound);
  }

  playCelebration() {
    this._playSound(this._celebrationSound);
  }

  playSelect() {
    if (this._muted || !this._ctx) return;
    // Short procedural click
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.12, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.04);
    osc.connect(gain).connect(this._ctx.destination);
    osc.start();
    osc.stop(this._ctx.currentTime + 0.04);
  }

  _playSound(audio) {
    if (this._muted || !audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  _fadeOut(audio, duration) {
    const startVol = audio.volume;
    const steps = 20;
    const interval = duration / steps;
    const decrement = startVol / steps;
    let step = 0;

    const fade = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVol - decrement * step);
      if (step >= steps) {
        clearInterval(fade);
        audio.pause();
        audio.currentTime = 0;
        audio.volume = startVol;
      }
    }, interval);
  }

  _fadeOutRumble(duration) {
    if (!this._ctx || !this._rumbleGain) return;
    this._rumbleFading = true;
    const now = this._ctx.currentTime;
    const fadeEnd = now + duration / 1000;
    // Cancel any scheduled ramps, set current value, then ramp to zero
    this._rumbleGain.gain.cancelScheduledValues(now);
    this._rumbleGain.gain.setValueAtTime(this._rumbleGain.gain.value, now);
    this._rumbleGain.gain.linearRampToValueAtTime(0.0001, fadeEnd);

    // Stop oscillators after fade completes
    setTimeout(() => {
      if (this._rumbleOsc) {
        this._rumbleOsc.stop();
        this._rumbleOsc = null;
      }
      if (this._rumbleSubOsc) {
        this._rumbleSubOsc.stop();
        this._rumbleSubOsc = null;
      }
      this._rumbleGain = null;
      this._rumbleFilter = null;
      this._rumbleFading = false;
    }, duration + 50);
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this._muted) {
      this.stopEngineLoop();
    } else if (this._audioEnabled) {
      this.startEngineLoop();
    }
    return this._muted;
  }

  isMuted() {
    return this._muted;
  }

  /**
   * Resume/unlock audio context and HTML5 Audio elements.
   * MUST be called from a user-gesture event handler (tap/click) on iOS.
   * iOS Safari requires both AudioContext.resume() AND a play() call on
   * each Audio element during a user gesture to "unlock" them.
   */
  resume() {
    // Resume Web Audio context (required on iOS)
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }

    // Unlock each HTML5 Audio element by playing then immediately pausing.
    // iOS requires at least one play() call during a user gesture before
    // programmatic playback is allowed later.
    const elements = [
      this._correctSound,
      this._incorrectSound,
      this._takeoffSound,
      this._celebrationSound,
      this._engineLoop
    ];
    elements.forEach(audio => {
      if (audio) {
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => {});
      }
    });
  }
}

window.AudioManager = AudioManager;

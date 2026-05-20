/**
 * ThrottleUp — Main orchestrator. Wires all modules together.
 */
(function () {
  'use strict';

  const emitter = new EventEmitter();
  const configManager = new ConfigManager();
  const sequenceLoader = new SequenceLoader();
  const renderer = new Renderer(emitter);
  const audioManager = new AudioManager(emitter);
  const accessibilityManager = new AccessibilityManager(emitter);
  const dragManager = new DragManager(emitter);
  const inputManager = new InputManager(emitter);

  let stateMachine;
  let animationManager;
  let gameLogic;
  let persistenceManager;

  let currentSequence = null;
  let shuffledSteps = [];
  let placedStepIds = new Set();

  // --- Public API ---
  window.ThrottleUp = {
    init,
    on(event, cb) { emitter.on(event, cb); },
    off(event, cb) { emitter.off(event, cb); },
  };

  function init(path) {
    // Support ?seq=filename.json query parameter
    const params = new URLSearchParams(window.location.search);
    const sequencePath = path || params.get('seq') || 'sample-sequence.json';
    bootstrap(sequencePath);
  }

  async function bootstrap(sequencePath) {
    renderer.init();
    stateMachine = new GameStateMachine(emitter);

    const canvas = document.getElementById('runway-canvas');
    animationManager = new AnimationManager(canvas, emitter);
    animationManager.loadAssets('assets/images/runway-bg.png', 'assets/images/plane.png');

    try {
      await sequenceLoader.load(sequencePath);
    } catch (err) {
      showError(`Failed to load sequence: ${err.message}`);
      return;
    }

    const config = sequenceLoader.getConfig();
    configManager.load(config);
    renderer.renderStartScreen(configManager.getAll());

    persistenceManager = new PersistenceManager(sequenceLoader.getData().game_id);

    audioManager.init(configManager.get('audioEnabled'));

    wireButtons();
    wireEvents();
    animationManager.start();
  }

  function wireButtons() {
    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-pause').addEventListener('click', () => togglePause());
    document.getElementById('btn-unpause').addEventListener('click', () => togglePause());
    document.getElementById('btn-help').addEventListener('click', () => toggleHelp());
    document.getElementById('btn-close-help').addEventListener('click', () => toggleHelp());
    document.getElementById('btn-mute').addEventListener('click', () => toggleMute());
    document.getElementById('btn-replay').addEventListener('click', () => replay());
  }

  function wireEvents() {
    emitter.on('stepDropped', handleStepDrop);
    emitter.on('takeoffComplete', handleTakeoffComplete);
    emitter.on('slotHover', () => audioManager.playSelect());
    emitter.on('action', handleAction);
  }

  // --- Game Flow ---

  function startGame() {
    audioManager.resume();

    // Use first sequence by default
    currentSequence = sequenceLoader.getSequence(0);
    if (!currentSequence) {
      showError('No sequences found in data file.');
      return;
    }

    shuffledSteps = sequenceLoader.getShuffledSteps(0);
    placedStepIds = new Set();

    gameLogic = new GameLogic(currentSequence.steps, configManager.getAll());

    renderer.hideAllOverlays();
    renderer.renderSlots(currentSequence.steps.length);
    renderer.renderStepCards(shuffledSteps);
    renderer.updateSpeed(0);
    renderer.updatePlacedCount(0, currentSequence.steps.length);

    animationManager.reset();
    animationManager.setSpeed(0);

    stateMachine.transition('playing');
    dragManager.enable();
    inputManager.enable();

    audioManager.startEngineLoop();

    emitter.emit('gameStarted');
  }

  function handleStepDrop({ stepId, slotIndex }) {
    if (!stateMachine.isPlaying()) return;

    // Find the step object
    const step = currentSequence.steps.find(s => s.id === stepId);
    if (!step) return;

    // Check if slot is already locked
    const slotEl = renderer.getSlotElements()[slotIndex];
    if (slotEl && slotEl.classList.contains('locked')) return;

    // If slot already has a step, clear it first
    const existingStepId = getStepInSlot(slotIndex);
    if (existingStepId) {
      clearPlacement(slotIndex, existingStepId);
    }

    // Place the step
    placedStepIds.add(stepId);
    renderer.fillSlot(slotIndex, step.text);
    renderer.markCardPlaced(stepId);

    // Evaluate
    const result = gameLogic.evaluatePlacement(slotIndex, step);

    // Update visuals
    renderer.updateSpeed(result.speed);
    animationManager.setSpeed(result.speed);
    audioManager.setRumbleSpeed(result.speed);

    if (result.correct) {
      renderer.markSlotCorrect(slotIndex);
      renderer.showHudFeedback('✓ Correct!', 'correct');
      renderer.showFeedbackCaption('ACCELERATING', 'correct');
      audioManager.playCorrect();
      accessibilityManager.announceCorrect(step.text, slotIndex);
    } else {
      renderer.markSlotIncorrect(slotIndex);
      renderer.showHudFeedback('✗ Out of order', 'incorrect');
      renderer.showFeedbackCaption('DECELERATING', 'incorrect');
      audioManager.playIncorrect();
      accessibilityManager.announceIncorrect(step.text, slotIndex);

      // After incorrect, clear the slot and restore the card after a delay
      setTimeout(() => {
        clearPlacement(slotIndex, stepId);
        gameLogic.clearSlot(slotIndex);
      }, 800);
    }

    // Update placed count (only correctly locked ones)
    const lockedCount = document.querySelectorAll('.sequence-slot.locked').length;
    renderer.updatePlacedCount(lockedCount, currentSequence.steps.length);

    // Check for completion
    if (result.isComplete) {
      triggerTakeoff();
    }
  }

  function clearPlacement(slotIndex, stepId) {
    renderer.clearSlot(slotIndex);
    renderer.restoreCard(stepId);
    placedStepIds.delete(stepId);
  }

  function getStepInSlot(slotIndex) {
    const progress = gameLogic.getProgress();
    return progress.slotState[slotIndex] || null;
  }

  function triggerTakeoff() {
    dragManager.disable();
    inputManager.disable();

    renderer.showFeedbackCaption('🛫 TAKEOFF!', 'correct');
    audioManager.playTakeoff();
    accessibilityManager.announceTakeoff();
    animationManager.triggerTakeoff();
  }

  function handleTakeoffComplete() {
    stateMachine.transition('complete');

    const results = gameLogic.getResults();
    renderer.renderComplete(results);
    renderer.showOverlay('complete-screen');
    audioManager.playCelebration();
    accessibilityManager.announceComplete(results);

    emitter.emit('gameComplete', results);
  }

  function replay() {
    stateMachine.reset();
    animationManager.reset();
    renderer.hideAllOverlays();
    renderer.showOverlay('start-screen');
  }

  // --- Actions ---

  function handleAction(action) {
    switch (action) {
      case 'togglePause': togglePause(); break;
      case 'toggleHelp': toggleHelp(); break;
      case 'toggleMute': toggleMute(); break;
    }
  }

  function togglePause() {
    if (stateMachine.isPlaying()) {
      stateMachine.transition('paused');
      dragManager.disable();
      inputManager.disable();
      renderer.showOverlay('pause-screen');
    } else if (stateMachine.isPaused()) {
      stateMachine.transition('playing');
      dragManager.enable();
      inputManager.enable();
      renderer.hideOverlay('pause-screen');
    }
  }

  function toggleHelp() {
    const helpEl = document.getElementById('help-screen');
    if (helpEl.classList.contains('hidden')) {
      renderer.showOverlay('help-screen');
    } else {
      renderer.hideOverlay('help-screen');
    }
  }

  function toggleMute() {
    const muted = audioManager.toggleMute();
    const btn = document.getElementById('btn-mute');
    btn.innerHTML = muted ? '&#x1F507;' : '&#x1F50A;';
    btn.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
  }

  function showError(msg) {
    const el = document.getElementById('start-screen');
    if (el) {
      el.innerHTML = `<h1>Error</h1><p>${msg}</p>`;
    }
  }

  // Auto-init if no manual call
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
})();

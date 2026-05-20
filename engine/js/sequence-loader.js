/**
 * SequenceLoader — Fetches and validates the sequence JSON file.
 */
class SequenceLoader {
  constructor() {
    this._data = null;
  }

  async load(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load sequence file: ${response.status}`);
    this._data = await response.json();
    this._validate();
    return this._data;
  }

  _validate() {
    if (!this._data.sequences || !Array.isArray(this._data.sequences)) {
      throw new Error('Sequence file must contain a "sequences" array');
    }
    for (const seq of this._data.sequences) {
      if (!seq.steps || !Array.isArray(seq.steps) || seq.steps.length === 0) {
        throw new Error(`Sequence "${seq.id || 'unknown'}" must have at least one step`);
      }
      for (const step of seq.steps) {
        if (!step.id || !step.text || typeof step.order !== 'number') {
          throw new Error(`Each step must have id, text, and order fields`);
        }
      }
    }
  }

  getData() {
    return this._data;
  }

  getConfig() {
    return this._data?.config || {};
  }

  getSequences() {
    return this._data?.sequences || [];
  }

  getSequence(index) {
    return this._data?.sequences?.[index] || null;
  }

  /**
   * Get steps for a sequence, shuffled randomly.
   */
  getShuffledSteps(sequenceIndex) {
    const seq = this.getSequence(sequenceIndex);
    if (!seq) return [];
    const steps = [...seq.steps];
    // Fisher-Yates shuffle
    for (let i = steps.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [steps[i], steps[j]] = [steps[j], steps[i]];
    }
    return steps;
  }
}

window.SequenceLoader = SequenceLoader;

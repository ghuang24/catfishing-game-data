import assert from 'node:assert/strict';
import test from 'node:test';
import { loadScores, saveScores } from '../src/scoreStorage.js';

function installLocalStorage() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
}

test('stores completed, partial, and unstarted game records', () => {
  installLocalStorage();
  const scores = [
    {
      day: 100,
      processedAt: 'now',
      score: 4,
      answers: [{ correctness: 2 }]
    },
    {
      day: 101,
      processedAt: 'now',
      answers: [{ correctness: 0, guess: 'Partial guess' }]
    },
    {
      day: 102,
      processedAt: 'now',
      answers: []
    }
  ];

  saveScores(scores);
  assert.deepEqual(loadScores(), scores);
});

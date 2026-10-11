import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadHistoryCollapsed,
  saveHistoryCollapsed
} from '../src/uiPreferences.js';

function installLocalStorage() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

test('persists the game history collapsed preference', () => {
  installLocalStorage();

  assert.equal(loadHistoryCollapsed(), false);
  saveHistoryCollapsed(true);
  assert.equal(loadHistoryCollapsed(), true);
  saveHistoryCollapsed(false);
  assert.equal(loadHistoryCollapsed(), false);
});

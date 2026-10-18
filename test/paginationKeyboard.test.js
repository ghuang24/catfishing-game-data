import assert from 'node:assert/strict';
import test from 'node:test';
import { getArrowKeyPage } from '../src/paginationKeyboard.js';

test('maps horizontal arrow keys to adjacent pages', () => {
  assert.equal(getArrowKeyPage('ArrowLeft', 3, 5), 2);
  assert.equal(getArrowKeyPage('ArrowRight', 3, 5), 4);
});

test('keeps keyboard page navigation within its bounds', () => {
  assert.equal(getArrowKeyPage('ArrowLeft', 1, 5), 1);
  assert.equal(getArrowKeyPage('ArrowRight', 5, 5), 5);
  assert.equal(getArrowKeyPage('Enter', 3, 5), 3);
});

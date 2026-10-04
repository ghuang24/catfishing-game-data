import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isStandaloneStopWord,
  matchesSearchText,
  normalizeSearchText
} from '../src/search.js';

test('normalizes accents and case for answer searches', () => {
  assert.equal(normalizeSearchText('Škoda Auto'), 'skoda auto');
  assert.ok(normalizeSearchText('Škoda Auto').includes(normalizeSearchText('skoda')));
});

test('blocks standalone common words but allows them within phrases', () => {
  assert.equal(isStandaloneStopWord('The'), true);
  assert.equal(matchesSearchText('The Room', 'the'), false);
  assert.equal(matchesSearchText('The Room', 'the room'), true);
  assert.equal(matchesSearchText('Stand by Me', 'by'), false);
  assert.equal(matchesSearchText('Stand by Me', 'stand by'), true);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { formatGameDate, getGameDate, isGameDayUnlocked } from '../src/gameDate.js';

test('derives game dates from the day 32 local-calendar anchor', () => {
  const day32 = getGameDate(32);
  const day33 = getGameDate(33);
  const day839 = getGameDate(839);
  const day840 = getGameDate(840);

  assert.deepEqual(
    [day32.getFullYear(), day32.getMonth(), day32.getDate()],
    [2024, 6, 25]
  );
  assert.deepEqual(
    [day33.getFullYear(), day33.getMonth(), day33.getDate()],
    [2024, 6, 26]
  );
  assert.deepEqual(
    [day839.getFullYear(), day839.getMonth(), day839.getDate()],
    [2026, 9, 10]
  );
  assert.deepEqual(
    [day840.getFullYear(), day840.getMonth(), day840.getDate()],
    [2026, 9, 11]
  );
});

test('formats game dates for display', () => {
  assert.equal(formatGameDate(32), 'Jul 25, 2024');
  assert.equal(formatGameDate(838), 'Oct 9, 2026');
});

test('unlocks a game at the start of its local calendar day', () => {
  assert.equal(
    isGameDayUnlocked(840, new Date(2026, 9, 10, 23, 59, 59)),
    false
  );
  assert.equal(
    isGameDayUnlocked(840, new Date(2026, 9, 11, 0, 0, 0)),
    true
  );
});

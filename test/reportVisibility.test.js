import assert from 'node:assert/strict';
import test from 'node:test';
import { selectVisibleReportData } from '../src/reportVisibility.js';

const gameData = [830, 831, 832, 833, 834].map(day => ({ day }));

test('includes missing and newer shared days as locked report rows', () => {
  const score830 = { day: 830, score: 3, answers: [] };
  const score832 = { day: 832, score: 4, answers: [] };

  const result = selectVisibleReportData(
    gameData,
    [score830, score832],
    new Date(2026, 9, 10)
  );

  assert.deepEqual(
    result.visibleGameData.map(({ day }) => day),
    [830, 831, 832, 833, 834]
  );
  assert.deepEqual(result.visibleScores, [
    score830,
    undefined,
    score832,
    undefined,
    undefined
  ]);
});

test('does not expose shared game data before any history is imported', () => {
  assert.deepEqual(selectVisibleReportData(gameData, []), {
    visibleGameData: [],
    visibleScores: []
  });
});

test('hides a shared day until its local unlock date', () => {
  const games = [832, 839, 840].map(day => ({ day }));
  const scores = [{ day: 832, score: 3, answers: [] }];

  assert.deepEqual(
    selectVisibleReportData(
      games,
      scores,
      new Date(2026, 9, 10, 23, 59)
    ).visibleGameData.map(({ day }) => day),
    [832, 839]
  );
  assert.deepEqual(
    selectVisibleReportData(
      games,
      scores,
      new Date(2026, 9, 11, 0, 0)
    ).visibleGameData.map(({ day }) => day),
    [832, 839, 840]
  );
});

test('includes gaps between imported score days and hides older history', () => {
  const games = [815, 816, 817, 837, 838].map(day => ({ day }));
  const score816 = { day: 816, score: 9, answers: [] };
  const score838 = { day: 838, score: 5, answers: [] };

  const result = selectVisibleReportData(
    games,
    [score816, score838],
    new Date(2026, 9, 10)
  );

  assert.deepEqual(
    result.visibleGameData.map(({ day }) => day),
    [816, 817, 837, 838]
  );
  assert.deepEqual(result.visibleScores, [
    score816,
    undefined,
    undefined,
    score838
  ]);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeScores,
  normalizeScores,
  parseExportText
} from '../src/exportData.js';

function makeExport(games) {
  return {
    format: 3,
    meta: {
      created: 1,
      device: 'test-device'
    },
    games
  };
}

test('parses and normalizes a Catfishing export', () => {
  const parsed = parseExportText(JSON.stringify(makeExport([
    [32, {
      c: [2, 1],
      a: [
        { r: 2, g: 'Correct guess' },
        { r: 0 }
      ]
    }]
  ])), 'scores.gz');

  assert.deepEqual(normalizeScores(parsed, 'now'), [{
    day: 32,
    processedAt: 'now',
    score: 2.5,
    answers: [
      { correctness: 2, guess: 'Correct guess' },
      { correctness: 0 }
    ]
  }]);
});

test('rejects invalid and duplicate game records', () => {
  assert.throws(
    () => parseExportText(JSON.stringify(makeExport([
      [32, { c: [1, 0], a: [] }],
      [32, { c: [1, 0], a: [] }]
    ])), 'duplicate.gz'),
    /duplicate day 32/
  );

  assert.throws(
    () => parseExportText(JSON.stringify(makeExport([
      [32, { c: [1, 0], a: [{ r: 9 }] }]
    ])), 'invalid.gz'),
    /not a valid Catfishing export/
  );
});

test('preserves partial and unstarted games without assigning a score', () => {
  const parsed = parseExportText(JSON.stringify(makeExport([
    [32, { a: [{ r: 0, g: 'Partial guess' }] }],
    [33, { c: null, a: [] }],
    [34, { c: [1, 0], a: [{ r: 2, g: 'Finished guess' }] }]
  ])));

  assert.deepEqual(normalizeScores(parsed, 'now'), [
    {
      day: 32,
      processedAt: 'now',
      answers: [{ correctness: 0, guess: 'Partial guess' }]
    },
    {
      day: 33,
      processedAt: 'now',
      answers: []
    },
    {
      day: 34,
      processedAt: 'now',
      score: 1,
      answers: [{ correctness: 2, guess: 'Finished guess' }]
    }
  ]);
});

test('new imports replace matching days and retain other history', () => {
  const current = [
    { day: 31, score: 1, answers: [] },
    { day: 32, score: 0, answers: [] }
  ];
  const imported = [
    { day: 32, score: 2, answers: [] },
    { day: 33, score: 1, answers: [] }
  ];

  assert.deepEqual(mergeScores(current, imported), [
    current[0],
    imported[0],
    imported[1]
  ]);
});

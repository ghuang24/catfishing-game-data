import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCorrectRateSummary } from '../src/stats.js';

test('compares personal correct rate with the mean global correct rate', () => {
  const questions = Array.from({ length: 100 }, (_, index) => ({
    article: { correctRate: index < 50 ? 60 : 80 },
    answer: { correctness: index < 50 ? 2 : 0 }
  }));

  assert.deepEqual(calculateCorrectRateSummary(questions, 2), {
    questionCount: 100,
    userRate: 50,
    globalRate: 70,
    difference: -20
  });
});

test('returns no summary when there are no comparable questions', () => {
  assert.equal(calculateCorrectRateSummary([], 2), null);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { filterReportData, paginateReportData } from '../src/reportData.js';

const makeDay = (day, count) => ({
  day,
  data: Array.from({ length: count }, (_, index) => ({
    title: `Day ${day} answer ${index + 1}`,
    categories: [],
    correctRate: 50
  })),
  stats: {
    scoresMean: 4.5
  }
});

const filterDefaults = {
  dayFilter: '',
  dateRange: null,
  showUnplayed: true,
  searchQuery: '',
  showHidden: false,
  answerFilters: [],
  correctRateFilter: '',
  articleSortBy: 'none',
  daySortBy: 'none'
};

test('keeps locked days but removes their unanswered questions', () => {
  const data = [makeDay(100, 3)];
  const scoresData = [{
    day: 100,
    score: 0,
    answers: [
      { correctness: 4 },
      { correctness: 4 },
      { correctness: 4 }
    ]
  }];

  assert.deepEqual(
    filterReportData({ data, scoresData, ...filterDefaults }),
    [{ ...data[0], data: [] }]
  );
});

test('shows only answered questions for a partially unlocked day', () => {
  const data = [makeDay(100, 4)];
  const scoresData = [{
    day: 100,
    answers: [
      { correctness: 2 },
      { correctness: 4 },
      { correctness: 0 },
      { correctness: 4 }
    ]
  }];

  const [filteredDay] = filterReportData({ data, scoresData, ...filterDefaults });
  assert.deepEqual(
    filteredDay.data.map(article => [article.title, article.originalIndex]),
    [
      ['Day 100 answer 1', 0],
      ['Day 100 answer 3', 2]
    ]
  );
});

test('counts a day without answered questions as one pagination item', () => {
  const lockedDays = Array.from({ length: 31 }, (_, index) => ({
    ...makeDay(index + 1, 0)
  }));

  const firstPage = paginateReportData(lockedDays, 'none', 1);
  const secondPage = paginateReportData(lockedDays, 'none', 2);

  assert.equal(firstPage.totalArticles, 31);
  assert.equal(firstPage.totalPages, 2);
  assert.equal(firstPage.paginatedData.length, 30);
  assert.deepEqual(secondPage.paginatedData.map(({ day }) => day), [31]);
});

test('sorts unplayed days after scored days for either user-score direction', () => {
  const data = [makeDay(100, 1), makeDay(101, 1), makeDay(102, 1)];
  const scoresData = [
    { day: 100, score: 8, answers: [{ correctness: 2 }] },
    { day: 102, score: 3, answers: [{ correctness: 0 }] }
  ];

  const ascending = filterReportData({
    data,
    scoresData,
    ...filterDefaults,
    daySortBy: 'user-asc'
  });
  const descending = filterReportData({
    data,
    scoresData,
    ...filterDefaults,
    daySortBy: 'user-desc'
  });

  assert.deepEqual(ascending.map(({ day }) => day), [102, 100, 101]);
  assert.deepEqual(descending.map(({ day }) => day), [100, 102, 101]);
});

test('can hide unplayed days while retaining partially played days', () => {
  const data = [makeDay(100, 2), makeDay(101, 2), makeDay(102, 2)];
  const scoresData = [
    {
      day: 100,
      score: 1,
      answers: [{ correctness: 2 }, { correctness: 0 }]
    },
    {
      day: 101,
      answers: [{ correctness: 0 }]
    },
    {
      day: 102,
      answers: []
    }
  ];

  const filtered = filterReportData({
    data,
    scoresData,
    ...filterDefaults,
    showUnplayed: false
  });

  assert.deepEqual(filtered.map(({ day }) => day), [100, 101]);
  assert.equal(filtered[1].data.length, 1);
});

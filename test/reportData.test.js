import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterReportData,
  paginateReportData,
  summarizeReportData
} from '../src/reportData.js';

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
  gotHardestQuestion: false,
  missedEasiestQuestion: false,
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

test('supports an open-ended day range with no beginning', () => {
  const data = [makeDay(20, 1), makeDay(50, 1), makeDay(51, 1), makeDay(100, 1)];

  const filtered = filterReportData({
    data,
    scoresData: [],
    ...filterDefaults,
    dayFilter: '-50'
  });

  assert.deepEqual(filtered.map(({ day }) => day), [20, 50]);
});

test('supports an open-ended day range with no end', () => {
  const data = [makeDay(749, 1), makeDay(750, 1), makeDay(800, 1), makeDay(1000, 1)];

  const filtered = filterReportData({
    data,
    scoresData: [],
    ...filterDefaults,
    dayFilter: '750-'
  });

  assert.deepEqual(filtered.map(({ day }) => day), [750, 800, 1000]);
});

test('keeps the full played-day count when summarizing a date-filtered report', () => {
  const data = [makeDay(100, 1), makeDay(101, 1), makeDay(102, 1)];
  const scoresData = [
    { day: 100, score: 8, answers: [{ correctness: 4 }] },
    { day: 101, score: 6, answers: [{ correctness: 4 }] },
    { day: 102, score: 7, answers: [{ correctness: 4 }] }
  ];
  const filteredData = filterReportData({
    data,
    scoresData,
    ...filterDefaults,
    dayFilter: '102'
  });

  const { scoreSummary } = summarizeReportData({
    data,
    scoresData,
    filteredData,
    articleSortBy: 'none'
  });

  assert.equal(scoreSummary.dayCount, 1);
  assert.equal(scoreSummary.totalDayCount, 3);
});

test('filters days where the lowest correct-rate question was answered correctly', () => {
  const data = [
    {
      ...makeDay(100, 2),
      data: [
        { title: 'Hardest', categories: [], correctRate: 10 },
        { title: 'Easiest', categories: [], correctRate: 90 }
      ]
    },
    {
      ...makeDay(101, 2),
      data: [
        { title: 'Hardest', categories: [], correctRate: 20 },
        { title: 'Easiest', categories: [], correctRate: 80 }
      ]
    }
  ];
  const scoresData = [
    { day: 100, answers: [{ correctness: 2 }, { correctness: 0 }] },
    { day: 101, answers: [{ correctness: 0 }, { correctness: 2 }] }
  ];

  const filtered = filterReportData({
    data,
    scoresData,
    ...filterDefaults,
    gotHardestQuestion: true
  });

  assert.deepEqual(filtered.map(({ day }) => day), [100]);
});

test('filters days where the highest correct-rate question was answered incorrectly', () => {
  const data = [
    {
      ...makeDay(100, 2),
      data: [
        { title: 'Hardest', categories: [], correctRate: 10 },
        { title: 'Easiest', categories: [], correctRate: 90 }
      ]
    },
    {
      ...makeDay(101, 2),
      data: [
        { title: 'Hardest', categories: [], correctRate: 20 },
        { title: 'Easiest', categories: [], correctRate: 80 }
      ]
    }
  ];
  const scoresData = [
    { day: 100, answers: [{ correctness: 2 }, { correctness: 0 }] },
    { day: 101, answers: [{ correctness: 2 }, { correctness: 0 }] }
  ];

  const filtered = filterReportData({
    data,
    scoresData,
    ...filterDefaults,
    missedEasiestQuestion: true
  });

  assert.deepEqual(filtered.map(({ day }) => day), [100, 101]);
});

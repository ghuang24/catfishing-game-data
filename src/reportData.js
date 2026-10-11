import { AnswerCorrectness } from './input.types.ts';
import { matchesSearchText } from './search.js';
import { calculateCorrectRateSummary } from './stats.js';
import { parseCorrectRateRange, parseDayFilter } from './utils.ts';

const ARTICLES_PER_PAGE = 30;

function withOriginalIndices(articles) {
  return articles.map((article, index) =>
    article.originalIndex === undefined
      ? { ...article, originalIndex: index }
      : article
  );
}

function keepMatchingArticles(days, predicate) {
  return days.flatMap(dayData => {
    const articles = withOriginalIndices(dayData.data).filter(predicate);
    return articles.length > 0 ? [{ ...dayData, data: articles }] : [];
  });
}

function keepAnsweredArticles(days, scoresByDay) {
  return days.map(dayData => {
    const scoreData = scoresByDay.get(dayData.day);
    const articles = withOriginalIndices(dayData.data).filter(article => {
      const answer = scoreData?.answers?.[article.originalIndex];
      return answer && answer.correctness !== AnswerCorrectness.HIDDEN;
    });
    return { ...dayData, data: articles };
  });
}

function keepVisibleArticles(days) {
  return days.map(dayData => ({
    ...dayData,
    data: withOriginalIndices(dayData.data).filter(article => !article.hidden)
  }));
}

function sortDays(days, daySortBy, scoresByDay) {
  if (daySortBy === 'none') return days;

  return [...days].sort((left, right) => {
    if (daySortBy.startsWith('day-')) {
      return daySortBy === 'day-asc'
        ? left.day - right.day
        : right.day - left.day;
    }

    if (daySortBy.startsWith('user-')) {
      const leftScore = scoresByDay.get(left.day)?.score;
      const rightScore = scoresByDay.get(right.day)?.score;
      const leftHasScore = Number.isFinite(leftScore);
      const rightHasScore = Number.isFinite(rightScore);

      if (leftHasScore !== rightHasScore) {
        return leftHasScore ? -1 : 1;
      }
      if (!leftHasScore) {
        return 0;
      }

      return daySortBy === 'user-asc'
        ? leftScore - rightScore
        : rightScore - leftScore;
    }

    const leftScore = left.stats?.scoresMean ?? 0;
    const rightScore = right.stats?.scoresMean ?? 0;
    return daySortBy === 'average-asc'
      ? leftScore - rightScore
      : rightScore - leftScore;
  });
}

function flattenAndSortArticles(days, articleSortBy) {
  const articles = days.flatMap(dayData =>
    withOriginalIndices(dayData.data).map(article => ({
      ...article,
      day: dayData.day
    }))
  );

  return articles.sort((left, right) =>
    articleSortBy === 'asc'
      ? left.correctRate - right.correctRate
      : right.correctRate - left.correctRate
  );
}

export function filterReportData({
  data,
  scoresData,
  dayFilter,
  dateRange,
  showUnplayed,
  searchQuery,
  showHidden,
  answerFilters,
  correctRateFilter,
  articleSortBy,
  daySortBy
}) {
  const scoresByDay = new Map(scoresData.map(score => [score?.day, score]));
  const allowedDays = parseDayFilter(dayFilter);
  let filtered = allowedDays
    ? data.filter(dayData => allowedDays.has(dayData.day))
    : data;
  filtered = keepAnsweredArticles(filtered, scoresByDay);
  if (!showUnplayed) {
    filtered = filtered.filter(dayData => dayData.data.length > 0);
  }

  if (dateRange) {
    const latestDay = Math.max(...data.map(dayData => dayData.day));
    const firstDay = latestDay - dateRange + 1;
    filtered = filtered.filter(dayData =>
      dayData.day >= firstDay && dayData.day <= latestDay
    );
  }

  if (searchQuery) {
    filtered = keepMatchingArticles(filtered, article =>
      matchesSearchText(article.title, searchQuery)
    );
  }

  if (!showHidden) {
    filtered = keepVisibleArticles(filtered);
  }

  const correctRateRange = parseCorrectRateRange(correctRateFilter);
  if (correctRateRange) {
    filtered = keepMatchingArticles(filtered, article =>
      article.correctRate >= correctRateRange.min &&
      article.correctRate <= correctRateRange.max
    );
  }

  if (answerFilters.length > 0) {
    const filterByCorrectness = {
      [AnswerCorrectness.CORRECT]: 'correct',
      [AnswerCorrectness.CLOSE]: 'close',
      [AnswerCorrectness.INCORRECT]: 'incorrect-or-skipped',
      [AnswerCorrectness.SKIPPED]: 'incorrect-or-skipped'
    };

    filtered = filtered.flatMap(dayData => {
      const scoreData = scoresByDay.get(dayData.day);
      if (!scoreData) return [];

      const articles = withOriginalIndices(dayData.data).filter(article => {
        if (article.hidden) return showHidden;
        const answer = scoreData.answers?.[article.originalIndex];
        return answer && answerFilters.includes(filterByCorrectness[answer.correctness]);
      });

      return articles.length > 0 ? [{ ...dayData, data: articles }] : [];
    });
  }

  return articleSortBy === 'none'
    ? sortDays(filtered, daySortBy, scoresByDay)
    : flattenAndSortArticles(filtered, articleSortBy);
}

export function summarizeReportData({
  data,
  scoresData,
  filteredData,
  articleSortBy
}) {
  const grouped = articleSortBy === 'none';
  const dayNumbers = grouped
    ? filteredData.map(dayData => dayData.day)
    : [...new Set(filteredData.map(article => article.day))];
  const gameDataByDay = new Map(data.map(dayData => [dayData.day, dayData]));
  const scoresByDay = new Map(scoresData.map(score => [score?.day, score]));

  const comparableDays = dayNumbers.flatMap(day => {
    const userScore = scoresByDay.get(day)?.score;
    const globalScore = gameDataByDay.get(day)?.stats?.scoresMean;
    return Number.isFinite(userScore) && Number.isFinite(globalScore)
      ? [{ userScore, globalScore }]
      : [];
  });

  const scoreSummary = comparableDays.length > 0
    ? {
        dayCount: comparableDays.length,
        userAverage:
          comparableDays.reduce((sum, day) => sum + day.userScore, 0) /
          comparableDays.length,
        globalAverage:
          comparableDays.reduce((sum, day) => sum + day.globalScore, 0) /
          comparableDays.length
      }
    : null;

  const questions = grouped
    ? filteredData.flatMap(dayData =>
        dayData.data.map((article, index) => ({
          article,
          day: dayData.day,
          originalIndex: article.originalIndex ?? index
        }))
      )
    : filteredData.map(article => ({
        article,
        day: article.day,
        originalIndex: article.originalIndex
      }));

  const comparableQuestions = questions.flatMap(({ article, day, originalIndex }) => {
    const answer = scoresByDay.get(day)?.answers?.[originalIndex];
    return !article.hidden &&
      Number.isFinite(article.correctRate) &&
      answer &&
      answer.correctness !== AnswerCorrectness.HIDDEN
      ? [{ article, answer }]
      : [];
  });

  return {
    scoreSummary,
    correctRateSummary: calculateCorrectRateSummary(
      comparableQuestions,
      AnswerCorrectness.CORRECT
    ),
    filteredArticles: grouped
      ? filteredData.reduce((sum, dayData) => sum + dayData.data.length, 0)
      : filteredData.length,
    filteredDays: grouped ? filteredData.length : dayNumbers.length
  };
}

export function paginateReportData(filteredData, articleSortBy, currentPage) {
  const grouped = articleSortBy === 'none';
  const totalArticles = grouped
    ? filteredData.reduce((sum, dayData) => sum + Math.max(1, dayData.data.length), 0)
    : filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalArticles / ARTICLES_PER_PAGE));
  const pageStart = (currentPage - 1) * ARTICLES_PER_PAGE;
  const pageEnd = pageStart + ARTICLES_PER_PAGE;

  if (!grouped) {
    return {
      paginatedData: filteredData.slice(pageStart, pageEnd),
      totalPages,
      totalArticles
    };
  }

  let articleOffset = 0;
  const paginatedData = filteredData.flatMap(dayData => {
    const dayStart = articleOffset;
    const daySize = Math.max(1, dayData.data.length);
    articleOffset += daySize;
    if (dayData.data.length === 0) {
      return dayStart >= pageStart && dayStart < pageEnd ? [dayData] : [];
    }
    const sliceStart = Math.max(0, pageStart - dayStart);
    const sliceEnd = Math.min(dayData.data.length, pageEnd - dayStart);
    if (sliceStart >= sliceEnd) return [];

    return [{
      ...dayData,
      data: dayData.data
        .slice(sliceStart, sliceEnd)
        .map((article, index) =>
          article.originalIndex === undefined
            ? { ...article, originalIndex: sliceStart + index }
            : article
        )
    }];
  });

  return { paginatedData, totalPages, totalArticles };
}

export function buildAppearanceDays(data) {
  const daysByTitle = new Map();
  data.forEach(dayData => {
    dayData.data.forEach(article => {
      const key = article.title.trim().toLowerCase();
      const days = daysByTitle.get(key) ?? new Set();
      days.add(dayData.day);
      daysByTitle.set(key, days);
    });
  });

  return new Map(
    [...daysByTitle].map(([title, days]) => [
      title,
      [...days].sort((left, right) => left - right)
    ])
  );
}

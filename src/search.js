const STANDALONE_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with'
]);

const APOSTROPHES = /['\u2018\u2019\u02bc\uff07]/gu;

export function normalizeSearchText(value) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase();
}

function normalizeComparableSearchText(value) {
  return normalizeSearchText(value).replace(APOSTROPHES, '');
}

export function isStandaloneStopWord(query) {
  return STANDALONE_STOP_WORDS.has(normalizeComparableSearchText(query).trim());
}

export function matchesSearchText(value, query) {
  const normalizedQuery = normalizeComparableSearchText(query);
  return normalizedQuery.length > 0 &&
    !isStandaloneStopWord(normalizedQuery) &&
    normalizeComparableSearchText(value).includes(normalizedQuery);
}

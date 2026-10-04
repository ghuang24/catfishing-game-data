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

export function normalizeSearchText(value) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase();
}

export function isStandaloneStopWord(query) {
  return STANDALONE_STOP_WORDS.has(normalizeSearchText(query).trim());
}

export function matchesSearchText(value, query) {
  return !isStandaloneStopWord(query) &&
    normalizeSearchText(value).includes(normalizeSearchText(query));
}

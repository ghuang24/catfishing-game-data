const ANCHOR_DAY = 32;
const ANCHOR_YEAR = 2024;
const ANCHOR_MONTH = 6;
const ANCHOR_DATE = 25;

export function getGameDate(day) {
  if (!Number.isInteger(day)) {
    throw new TypeError('Game day must be an integer.');
  }

  return new Date(
    ANCHOR_YEAR,
    ANCHOR_MONTH,
    ANCHOR_DATE + day - ANCHOR_DAY
  );
}

export function formatGameDate(day) {
  return getGameDate(day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function isGameDayUnlocked(day, currentTime = new Date()) {
  const gameDate = getGameDate(day);
  const localToday = new Date(
    currentTime.getFullYear(),
    currentTime.getMonth(),
    currentTime.getDate()
  );
  return gameDate <= localToday;
}

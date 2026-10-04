const STORAGE_KEY = 'catfishing-data-checker:scores:v1';
const DEVICE_KEY = 'catfishing-data-checker:device:v1';

function isStoredScore(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    Number.isInteger(value.day) &&
    typeof value.score === 'number' &&
    Number.isFinite(value.score) &&
    Array.isArray(value.answers) &&
    value.answers.every(answer =>
      typeof answer === 'object' &&
      answer !== null &&
      Number.isInteger(answer.correctness) &&
      (answer.guess === undefined || typeof answer.guess === 'string')
    )
  );
}

export function loadScores() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return [];

  let scores;
  try {
    scores = JSON.parse(stored);
  } catch (error) {
    throw new Error('Saved score data is corrupted and could not be read.', { cause: error });
  }

  if (!Array.isArray(scores) || !scores.every(isStoredScore)) {
    throw new Error('Saved score data has an unsupported format.');
  }

  return scores;
}

export function saveScores(scores) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch (error) {
    throw new Error('The imported scores could not be saved in this browser.', { cause: error });
  }
}

export function loadImportDevice() {
  return localStorage.getItem(DEVICE_KEY);
}

export function saveImportDevice(device) {
  try {
    localStorage.setItem(DEVICE_KEY, device);
  } catch (error) {
    throw new Error('The export source could not be saved in this browser.', { cause: error });
  }
}

export function clearScores() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DEVICE_KEY);
}

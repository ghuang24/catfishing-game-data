const HISTORY_COLLAPSED_KEY = 'catfishing-data-checker:history-collapsed:v1';

export function loadHistoryCollapsed() {
  return localStorage.getItem(HISTORY_COLLAPSED_KEY) === 'true';
}

export function saveHistoryCollapsed(isCollapsed) {
  localStorage.setItem(HISTORY_COLLAPSED_KEY, String(isCollapsed));
}

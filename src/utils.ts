import { normalizeSearchText } from './search.js';

interface TextSegment {
  type: 'matched' | 'normal';
  text: string;
}

export interface NumberRange {
  min: number;
  max: number;
}

export function parseCorrectRateRange(filterText: string): NumberRange | null {
  const match = filterText.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*%?\s*$/
  );
  if (!match) return null;

  const first = Math.min(100, Math.max(0, Number(match[1])));
  const second = Math.min(100, Math.max(0, Number(match[2])));

  return {
    min: Math.min(first, second),
    max: Math.max(first, second)
  };
}

/**
 * Parses day filter string into a Set of day numbers
 * Supports ranges (32-35), open-ended ranges (-50, 750-),
 * and comma-separated values (32, 34, 37)
 * @param filterText - The filter input text
 * @param availableDays - Optional day numbers to constrain open-ended ranges
 * @returns Set of day numbers or null if empty
 */
export function parseDayFilter(
  filterText: string,
  availableDays: number[] = []
): Set<number> | null {
  if (!filterText.trim()) return null;
  
  const days = new Set<number>();
  const parts = filterText.split(',').map(p => p.trim());
  
  for (const part of parts) {
    const rangeMatch = part.match(/^(\d*)\s*-\s*(\d*)$/);
    if (rangeMatch) {
      const startText = rangeMatch[1];
      const endText = rangeMatch[2];
      if (!startText && !endText) continue;

      const start = startText ? parseInt(startText) : null;
      const end = endText ? parseInt(endText) : null;

      if (availableDays.length > 0) {
        const lowerBound = start === null
          ? 1
          : end === null
            ? start
            : Math.min(start, end);
        const upperBound = end === null
          ? Number.MAX_SAFE_INTEGER
          : start === null
            ? end
            : Math.max(start, end);

        for (const day of availableDays) {
          if (day >= lowerBound && day <= upperBound) {
            days.add(day);
          }
        }
        continue;
      }

      if (start !== null && end !== null) {
        for (let day = Math.min(start, end); day <= Math.max(start, end); day++) {
          days.add(day);
        }
      } else if (start === null) {
        for (let day = 1; day <= end; day++) {
          days.add(day);
        }
      } else if (end === null) {
        days.add(start);
      }
      continue;
    }

    const day = parseInt(part);
    if (!isNaN(day)) {
      days.add(day);
    }
  }
  
  return days.size > 0 ? days : null;
}

/**
 * Checks if a title matches the start of any word or sequence of words
 * @param title - The title to search
 * @param query - The query to match (can be multiple words)
 * @returns True if any word or sequence of words starts with query
 */
export function matchesWordStart(title: string, query: string): boolean {
  if (!query) return true;
  
  const titleLower = normalizeSearchText(title);
  const queryLower = normalizeSearchText(query);
  const queryWords = queryLower.split(/\s+/);
  
  // If single word query, check if any word starts with it
  if (queryWords.length === 1) {
    const words = titleLower.split(/\s+/);
    return words.some((word: string) => word.startsWith(queryLower));
  }
  
  // For multi-word queries, check if consecutive words match
  const titleWords = titleLower.split(/\s+/);
  
  for (let i = 0; i <= titleWords.length - queryWords.length; i++) {
    let matches = true;
    for (let j = 0; j < queryWords.length; j++) {
      if (!titleWords[i + j].startsWith(queryWords[j])) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  
  return false;
}

/**
 * Breaks down text into segments for highlighting
 * @param title - The title text
 * @param query - The query to highlight (can be multiple words)
 * @returns Array of text segments with type information
 */
export function getHighlightSegments(title: string, query: string): TextSegment[] {
  if (!query.trim()) return [{ type: 'normal', text: title }];

  const normalizedQuery = normalizeSearchText(query);
  const matchIndex = normalizeSearchText(title).indexOf(normalizedQuery);
  if (matchIndex === -1) return [{ type: 'normal', text: title }];

  const segments: TextSegment[] = [];
  if (matchIndex > 0) {
    segments.push({ type: 'normal', text: title.slice(0, matchIndex) });
  }
  segments.push({
    type: 'matched',
    text: title.slice(matchIndex, matchIndex + normalizedQuery.length)
  });
  if (matchIndex + normalizedQuery.length < title.length) {
    segments.push({ type: 'normal', text: title.slice(matchIndex + normalizedQuery.length) });
  }
  return segments;
}

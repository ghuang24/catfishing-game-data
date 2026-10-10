export type GameRecord = {
  day: number;
  fetchedAt: string;
  data: Array<{
    title: string;
    hidden?: boolean;
    categories: string[];
    correctRate: number;
  }>;
  stats: {
    correctsMean: number;
    scoresMean: number;
  };
};

type ApiResponse = {
  articles: Array<{
    title: string;
    hidden?: boolean;
    categories: string[];
  }>;
  stats: {
    articles: Array<{
      correctRate: number;
    }>;
    correctsMean: number;
    scoresMean: number;
  };
};

type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  headers?: {
    get(name: string): string | null;
  };
  json(): Promise<unknown>;
};

export type FetchGameData = (
  url: string,
  init?: { signal?: AbortSignal }
) => Promise<FetchResponse>;

type RefreshFailure = {
  day: number;
  error: string;
};

export type GameDataUpdate = {
  content: string;
  refreshedDays: number[];
  appendedDay: number | null;
  attemptedDays: number[];
  failedDays: RefreshFailure[];
  requestCount: number;
  retryCount: number;
  stoppedReason: "deadline" | "rate-limit" | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const API_URL = "https://catfishing.net/api/game";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseGameRecords = (content: string): GameRecord[] => {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Game data blob is empty.");
  }

  const days = new Set<number>();
  return lines.map((line, index) => {
    let record: unknown;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`Game data has invalid JSON on line ${index + 1}.`, {
        cause: error
      });
    }

    if (!isRecord(record) || !Number.isInteger(record.day) || Number(record.day) < 0) {
      throw new Error(`Game data has an invalid day on line ${index + 1}.`);
    }

    const day = Number(record.day);
    if (days.has(day)) {
      throw new Error(`Game data contains duplicate day ${day}.`);
    }
    days.add(day);
    return record as GameRecord;
  });
};

const parseApiResponse = (day: number, value: unknown): ApiResponse => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.articles) ||
    !isRecord(value.stats)
  ) {
    throw new Error(`Catfishing API returned invalid game data for day ${day}.`);
  }

  const rawArticles = value.articles;
  const rawStats = value.stats;
  if (
    !Array.isArray(rawStats.articles) ||
    typeof rawStats.correctsMean !== "number" ||
    !Number.isFinite(rawStats.correctsMean) ||
    typeof rawStats.scoresMean !== "number" ||
    !Number.isFinite(rawStats.scoresMean)
  ) {
    throw new Error(`Catfishing API returned invalid game data for day ${day}.`);
  }

  const statsArticles = rawStats.articles;
  const correctsMean = rawStats.correctsMean;
  const scoresMean = rawStats.scoresMean;
  const articles = rawArticles.map((article, index) => {
    const articleStats = statsArticles[index];
    if (
      !isRecord(article) ||
      typeof article.title !== "string" ||
      (article.hidden !== undefined && typeof article.hidden !== "boolean") ||
      !Array.isArray(article.categories) ||
      !article.categories.every((category) => typeof category === "string") ||
      !isRecord(articleStats) ||
      typeof articleStats.correctRate !== "number" ||
      !Number.isFinite(articleStats.correctRate)
    ) {
      throw new Error(`Catfishing API returned an invalid article for day ${day}.`);
    }

    return {
      title: article.title,
      ...(article.hidden === undefined ? {} : { hidden: article.hidden }),
      categories: article.categories as string[],
      correctRate: articleStats.correctRate
    };
  });

  return {
    articles,
    stats: {
      articles: statsArticles as Array<{ correctRate: number }>,
      correctsMean,
      scoresMean
    }
  };
};

const refreshIntervalMs = (ageInDays: number): number => {
  if (ageInDays <= 14) return DAY_MS;
  if (ageInDays <= 90) return 7 * DAY_MS;
  return 30 * DAY_MS;
};

const fetchedAtMs = (record: GameRecord): number => {
  const value = Date.parse(record.fetchedAt);
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
};

export const selectDaysToRefresh = (
  records: GameRecord[],
  appendNext: boolean,
  currentTime: Date,
  maxRequests: number
): number[] => {
  const latestDay = Math.max(...records.map((record) => record.day));
  const mandatoryDays = appendNext
    ? [latestDay, latestDay + 1]
    : [latestDay];
  const availableSlots = Math.max(0, maxRequests - mandatoryDays.length);
  const nowMs = currentTime.getTime();

  const overdueDays = records
    .filter((record) => record.day !== latestDay)
    .map((record) => {
      const ageInDays = latestDay - record.day;
      const interval = refreshIntervalMs(ageInDays);
      const overdueBy = nowMs - fetchedAtMs(record) - interval;
      return {
        day: record.day,
        tier: ageInDays <= 14 ? 0 : ageInDays <= 90 ? 1 : 2,
        overdueBy,
        overdueRatio: overdueBy / interval
      };
    })
    .filter(({ overdueBy }) => overdueBy >= 0)
    .sort((left, right) =>
      left.tier - right.tier ||
      right.overdueRatio - left.overdueRatio ||
      right.overdueBy - left.overdueBy ||
      right.day - left.day
    )
    .slice(0, availableSlots)
    .map(({ day }) => day);

  return [...mandatoryDays, ...overdueDays];
};

const retryDelayMs = (
  response: FetchResponse,
  retryNumber: number,
  currentTimeMs: number
): number => {
  const retryAfter = response.headers?.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.max(0, retryAt - currentTimeMs);
    }
  }

  return Math.min(5000 * 2 ** (retryNumber - 1), 60_000);
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const fetchGameRecord = async (
  day: number,
  fetchImpl: FetchGameData,
  fetchedAt: string,
  options: {
    requestIntervalMs: number;
    requestTimeoutMs: number;
    maxRetries: number;
    deadlineMs: number;
    clock: () => number;
    sleep: (milliseconds: number) => Promise<void>;
    random: () => number;
    getLastRequestStartedAt: () => number | null;
    setLastRequestStartedAt: (value: number) => void;
  }
): Promise<{
  record?: GameRecord;
  error?: string;
  requestCount: number;
  retryCount: number;
  stoppedReason: "deadline" | "rate-limit" | null;
}> => {
  let requestCount = 0;
  let retryCount = 0;
  let nextRetryDelay = 0;

  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    const lastStartedAt = options.getLastRequestStartedAt();
    const pacingDelay = lastStartedAt === null
      ? 0
      : Math.max(0, options.requestIntervalMs - (options.clock() - lastStartedAt));
    const waitMs = Math.max(pacingDelay, nextRetryDelay);
    if (options.clock() + waitMs + options.requestTimeoutMs > options.deadlineMs) {
      return {
        error: `Execution deadline reached before fetching day ${day}.`,
        requestCount,
        retryCount,
        stoppedReason: "deadline"
      };
    }
    if (waitMs > 0) {
      await options.sleep(waitMs);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.requestTimeoutMs);
    options.setLastRequestStartedAt(options.clock());
    requestCount += 1;

    let response: FetchResponse;
    try {
      response = await fetchImpl(`${API_URL}?day=${day}`, {
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timeout);
      if (attempt === options.maxRetries) {
        return {
          error: `Failed to fetch game data for day ${day}: ${errorMessage(error)}`,
          requestCount,
          retryCount,
          stoppedReason: null
        };
      }
      retryCount += 1;
      nextRetryDelay = Math.min(5000 * 2 ** attempt, 60_000) +
        Math.floor(options.random() * 501);
      continue;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const isRateLimit = response.status === 429;
      const isRetryable = isRateLimit || response.status >= 500;
      if (!isRetryable || attempt === options.maxRetries) {
        return {
          error: `Failed to fetch game data for day ${day}: ${response.status} ${response.statusText}`,
          requestCount,
          retryCount,
          stoppedReason: isRateLimit ? "rate-limit" : null
        };
      }

      retryCount += 1;
      const baseDelay = isRateLimit
        ? retryDelayMs(response, retryCount, options.clock())
        : Math.min(5000 * 2 ** attempt, 60_000);
      nextRetryDelay = baseDelay + Math.floor(options.random() * 501);
      continue;
    }

    let value: unknown;
    try {
      value = await response.json();
    } catch (error) {
      return {
        error: `Catfishing API returned invalid JSON for day ${day}: ${errorMessage(error)}`,
        requestCount,
        retryCount,
        stoppedReason: null
      };
    }

    try {
      const apiData = parseApiResponse(day, value);
      return {
        record: {
          day,
          fetchedAt,
          data: apiData.articles.map((article, index) => ({
            title: article.title,
            ...(article.hidden === undefined ? {} : { hidden: article.hidden }),
            categories: article.categories,
            correctRate: apiData.stats.articles[index].correctRate
          })),
          stats: {
            correctsMean: apiData.stats.correctsMean,
            scoresMean: apiData.stats.scoresMean
          }
        },
        requestCount,
        retryCount,
        stoppedReason: null
      };
    } catch (error) {
      return {
        error: errorMessage(error),
        requestCount,
        retryCount,
        stoppedReason: null
      };
    }
  }

  throw new Error(`Retry loop ended unexpectedly for day ${day}.`);
};

export const updateGameData = async ({
  content,
  appendNext,
  fetchImpl = (url, init) => fetch(url, init),
  now = () => new Date(),
  clock = () => Date.now(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  random = Math.random,
  maxRequests = 25,
  requestIntervalMs = 2000,
  requestTimeoutMs = 20_000,
  maxRetries = 4,
  executionBudgetMs = 8 * 60 * 1000
}: {
  content: string;
  appendNext: boolean;
  fetchImpl?: FetchGameData;
  now?: () => Date;
  clock?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
  maxRequests?: number;
  requestIntervalMs?: number;
  requestTimeoutMs?: number;
  maxRetries?: number;
  executionBudgetMs?: number;
}): Promise<GameDataUpdate> => {
  const records = parseGameRecords(content);
  const latestDay = Math.max(...records.map((record) => record.day));
  const currentTime = now();
  const daysToFetch = selectDaysToRefresh(
    records,
    appendNext,
    currentTime,
    maxRequests
  );
  const fetchedAt = currentTime.toISOString();
  const deadlineMs = clock() + executionBudgetMs;
  const fetchedRecords = new Map<number, GameRecord>();
  const attemptedDays: number[] = [];
  const failedDays: RefreshFailure[] = [];
  let requestCount = 0;
  let retryCount = 0;
  let stoppedReason: GameDataUpdate["stoppedReason"] = null;
  let lastRequestStartedAt: number | null = null;

  for (const day of daysToFetch) {
    attemptedDays.push(day);
    const result = await fetchGameRecord(day, fetchImpl, fetchedAt, {
      requestIntervalMs,
      requestTimeoutMs,
      maxRetries,
      deadlineMs,
      clock,
      sleep,
      random,
      getLastRequestStartedAt: () => lastRequestStartedAt,
      setLastRequestStartedAt: (value) => {
        lastRequestStartedAt = value;
      }
    });
    requestCount += result.requestCount;
    retryCount += result.retryCount;

    if (result.record) {
      fetchedRecords.set(day, result.record);
    } else {
      failedDays.push({
        day,
        error: result.error ?? `Unknown failure fetching day ${day}.`
      });
    }

    if (result.stoppedReason) {
      stoppedReason = result.stoppedReason;
      break;
    }
  }

  const existingDays = new Set(records.map((record) => record.day));
  for (const [day, record] of fetchedRecords) {
    const existingIndex = records.findIndex((item) => item.day === day);
    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }
  }
  records.sort((left, right) => left.day - right.day);

  return {
    content: fetchedRecords.size === 0
      ? content
      : `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
    refreshedDays: [...fetchedRecords.keys()].filter((day) => existingDays.has(day)),
    appendedDay: fetchedRecords.has(latestDay + 1) ? latestDay + 1 : null,
    attemptedDays,
    failedDays,
    requestCount,
    retryCount,
    stoppedReason
  };
};

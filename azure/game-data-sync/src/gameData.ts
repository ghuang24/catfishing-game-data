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
  json(): Promise<unknown>;
};

export type FetchGameData = (url: string) => Promise<FetchResponse>;

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

const fetchGameRecord = async (
  day: number,
  fetchImpl: FetchGameData,
  fetchedAt: string
): Promise<GameRecord> => {
  const response = await fetchImpl(`https://catfishing.net/api/game?day=${day}`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch game data for day ${day}: ${response.status} ${response.statusText}`
    );
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch (error) {
    throw new Error(`Catfishing API returned invalid JSON for day ${day}.`, {
      cause: error
    });
  }

  const apiData = parseApiResponse(day, value);
  return {
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
  };
};

export const updateGameData = async ({
  content,
  appendNext,
  fetchImpl = fetch,
  now = () => new Date()
}: {
  content: string;
  appendNext: boolean;
  fetchImpl?: FetchGameData;
  now?: () => Date;
}): Promise<{
  content: string;
  refreshedDay: number;
  appendedDay: number | null;
}> => {
  const records = parseGameRecords(content);
  const latestDay = Math.max(...records.map((record) => record.day));
  const daysToFetch = appendNext ? [latestDay, latestDay + 1] : [latestDay];
  const fetchedAt = now().toISOString();
  const fetchedRecords: GameRecord[] = [];

  for (const day of daysToFetch) {
    fetchedRecords.push(await fetchGameRecord(day, fetchImpl, fetchedAt));
  }

  const latestIndex = records.findIndex((record) => record.day === latestDay);
  records[latestIndex] = fetchedRecords[0];
  if (appendNext) {
    records.push(fetchedRecords[1]);
  }
  records.sort((left, right) => left.day - right.day);

  return {
    content: `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
    refreshedDay: latestDay,
    appendedDay: appendNext ? latestDay + 1 : null
  };
};

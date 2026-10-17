import assert from "node:assert/strict";
import test from "node:test";
import {
  type GameRecord,
  parseGameRecords,
  selectDaysToRefresh,
  updateGameData
} from "../src/gameData.js";

const apiResponse = {
  articles: [{
    title: "Next answer",
    categories: ["Examples"]
  }],
  stats: {
    articles: [{ correctRate: 42.5 }],
    correctsMean: 4.25,
    scoresMean: 4.75
  }
};

const makeRecord = (day: number, fetchedAt: string): GameRecord => ({
  day,
  fetchedAt,
  data: [{
    title: `Answer ${day}`,
    categories: ["Examples"],
    correctRate: 40
  }],
  stats: {
    correctsMean: 4,
    scoresMean: 4.5
  }
});

const serialize = (records: GameRecord[]): string =>
  `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;

const successfulResponse = async () => ({
  ok: true,
  status: 200,
  statusText: "OK",
  async json() {
    return apiResponse;
  }
});

const immediateOptions = {
  requestIntervalMs: 0,
  requestTimeoutMs: 1000,
  maxRetries: 0,
  executionBudgetMs: 60_000
};

test("rejects duplicate days", () => {
  assert.throws(
    () => parseGameRecords('{"day":12}\n{"day":12}\n'),
    /duplicate day 12/
  );
});

test("selects the latest day and overdue records by age tier", () => {
  const currentTime = new Date("2026-10-10T00:00:00.000Z");
  const records = [
    makeRecord(1, "2026-09-09T00:00:00.000Z"),
    makeRecord(2, "2026-09-11T00:00:00.000Z"),
    makeRecord(20, "2026-10-02T00:00:00.000Z"),
    makeRecord(21, "2026-10-04T00:00:00.000Z"),
    makeRecord(98, "2026-10-08T23:00:00.000Z"),
    makeRecord(99, "2026-10-09T12:00:00.000Z"),
    makeRecord(100, "2026-10-09T22:00:00.000Z")
  ];

  assert.deepEqual(
    selectDaysToRefresh(records, true, currentTime, 5),
    [100, 101, 98, 20, 1]
  );
});

test("refreshes the latest day and appends the next day", async () => {
  const requestedUrls: string[] = [];
  const requestedUserAgents: Array<string | null> = [];
  const result = await updateGameData({
    content: serialize([makeRecord(12, "2026-10-03T10:15:00.000Z")]),
    appendNext: true,
    fetchImpl: async (url, init) => {
      requestedUrls.push(url);
      requestedUserAgents.push(new Headers(init?.headers).get("user-agent"));
      return successfulResponse();
    },
    now: () => new Date("2026-10-04T10:15:00.000Z"),
    maxRequests: 2,
    ...immediateOptions
  });

  assert.deepEqual(requestedUrls, [
    "https://catfishing.net/app/game?day=12",
    "https://catfishing.net/app/game?day=13"
  ]);
  assert.deepEqual(requestedUserAgents, [
    "catfishing-game-data-sync (+https://github.com/ghuang24/catfishing-game-data)",
    "catfishing-game-data-sync (+https://github.com/ghuang24/catfishing-game-data)"
  ]);
  assert.deepEqual(result.refreshedDays, [12]);
  assert.equal(result.appendedDay, 13);
  assert.deepEqual(
    parseGameRecords(result.content).map((record) => record.day),
    [12, 13]
  );
});

test("refreshes only the latest day when no archive records are due", async () => {
  const requestedUrls: string[] = [];
  const result = await updateGameData({
    content: serialize([makeRecord(12, "2026-10-04T10:15:00.000Z")]),
    appendNext: false,
    fetchImpl: async (url) => {
      requestedUrls.push(url);
      return successfulResponse();
    },
    now: () => new Date("2026-10-04T22:15:00.000Z"),
    ...immediateOptions
  });

  assert.deepEqual(requestedUrls, [
    "https://catfishing.net/app/game?day=12"
  ]);
  assert.deepEqual(result.refreshedDays, [12]);
  assert.equal(result.appendedDay, null);
});

test("preserves successful archive refreshes when another day fails", async () => {
  const original = [
    makeRecord(1, "2026-08-01T00:00:00.000Z"),
    makeRecord(100, "2026-10-09T00:00:00.000Z")
  ];
  const result = await updateGameData({
    content: serialize(original),
    appendNext: false,
    fetchImpl: async (url) => {
      if (url.endsWith("day=100")) {
        return {
          ok: false,
          status: 500,
          statusText: "Server Error",
          async json() {
            return {};
          }
        };
      }
      return successfulResponse();
    },
    now: () => new Date("2026-10-10T00:00:00.000Z"),
    ...immediateOptions
  });

  assert.deepEqual(result.refreshedDays, [1]);
  assert.deepEqual(result.failedDays.map(({ day }) => day), [100]);
  const records = parseGameRecords(result.content);
  assert.equal(
    records.find(({ day }) => day === 1)?.fetchedAt,
    "2026-10-10T00:00:00.000Z"
  );
  assert.equal(
    records.find(({ day }) => day === 100)?.fetchedAt,
    "2026-10-09T00:00:00.000Z"
  );
});

test("honors Retry-After and spaces request starts", async () => {
  let currentTimeMs = 0;
  const waits: number[] = [];
  let attempts = 0;
  const result = await updateGameData({
    content: serialize([makeRecord(12, "2026-10-03T00:00:00.000Z")]),
    appendNext: false,
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) {
        return {
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          headers: {
            get: (name: string) => name === "retry-after" ? "3" : null
          },
          async json() {
            return {};
          }
        };
      }
      return successfulResponse();
    },
    now: () => new Date("2026-10-04T00:00:00.000Z"),
    clock: () => currentTimeMs,
    sleep: async (milliseconds) => {
      waits.push(milliseconds);
      currentTimeMs += milliseconds;
    },
    random: () => 0,
    requestIntervalMs: 1000,
    requestTimeoutMs: 1000,
    maxRetries: 1,
    executionBudgetMs: 60_000
  });

  assert.deepEqual(waits, [3000]);
  assert.equal(result.requestCount, 2);
  assert.equal(result.retryCount, 1);
  assert.deepEqual(result.refreshedDays, [12]);
});

test("stops before a retry would exceed the execution budget", async () => {
  let currentTimeMs = 0;
  const result = await updateGameData({
    content: serialize([makeRecord(12, "2026-10-03T00:00:00.000Z")]),
    appendNext: false,
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: {
        get: () => "60"
      },
      async json() {
        return {};
      }
    }),
    now: () => new Date("2026-10-04T00:00:00.000Z"),
    clock: () => currentTimeMs,
    sleep: async (milliseconds) => {
      currentTimeMs += milliseconds;
    },
    random: () => 0,
    requestIntervalMs: 1000,
    requestTimeoutMs: 1000,
    maxRetries: 4,
    executionBudgetMs: 30_000
  });

  assert.equal(result.requestCount, 1);
  assert.equal(result.retryCount, 1);
  assert.equal(result.stoppedReason, "deadline");
  assert.deepEqual(result.refreshedDays, []);
});

test("reports invalid API data without changing the snapshot", async () => {
  const content = serialize([makeRecord(12, "2026-10-03T00:00:00.000Z")]);
  const result = await updateGameData({
    content,
    appendNext: false,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      async json() {
        return { articles: [] };
      }
    }),
    ...immediateOptions
  });

  assert.equal(result.content, content);
  assert.deepEqual(result.refreshedDays, []);
  assert.match(result.failedDays[0]?.error ?? "", /invalid game data/);
});

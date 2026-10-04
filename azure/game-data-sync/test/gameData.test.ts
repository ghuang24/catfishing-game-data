import assert from "node:assert/strict";
import test from "node:test";
import { parseGameRecords, updateGameData } from "../src/gameData.js";

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

const fetchImpl = async () => ({
  ok: true,
  status: 200,
  statusText: "OK",
  async json() {
    return apiResponse;
  }
});

test("rejects duplicate days", () => {
  assert.throws(
    () => parseGameRecords('{"day":12}\n{"day":12}\n'),
    /duplicate day 12/
  );
});

test("refreshes the latest day and appends the next day", async () => {
  const requestedUrls: string[] = [];
  const result = await updateGameData({
    content: '{"day":12}\n',
    appendNext: true,
    fetchImpl: async (url) => {
      requestedUrls.push(url);
      return fetchImpl();
    },
    now: () => new Date("2026-10-04T10:15:00.000Z")
  });

  assert.deepEqual(requestedUrls, [
    "https://catfishing.net/api/game?day=12",
    "https://catfishing.net/api/game?day=13"
  ]);
  assert.equal(result.refreshedDay, 12);
  assert.equal(result.appendedDay, 13);
  assert.deepEqual(
    parseGameRecords(result.content).map((record) => record.day),
    [12, 13]
  );
});

test("refreshes only the latest day twelve hours later", async () => {
  const requestedUrls: string[] = [];
  const result = await updateGameData({
    content: '{"day":12}\n',
    appendNext: false,
    fetchImpl: async (url) => {
      requestedUrls.push(url);
      return fetchImpl();
    },
    now: () => new Date("2026-10-04T22:15:00.000Z")
  });

  assert.deepEqual(requestedUrls, [
    "https://catfishing.net/api/game?day=12"
  ]);
  assert.equal(result.refreshedDay, 12);
  assert.equal(result.appendedDay, null);
  assert.deepEqual(
    parseGameRecords(result.content).map((record) => record.day),
    [12]
  );
});

test("does not produce an update when the API response is invalid", async () => {
  await assert.rejects(
    updateGameData({
      content: '{"day":12}\n',
      appendNext: false,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        async json() {
          return { articles: [] };
        }
      })
    }),
    /invalid game data/
  );
});

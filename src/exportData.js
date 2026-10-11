const MIN_CORRECTNESS = 0;
const MAX_CORRECTNESS = 4;
const MAX_COMPRESSED_BYTES = 5 * 1024 * 1024;
const MAX_DECOMPRESSED_BYTES = 25 * 1024 * 1024;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInputAnswer(value) {
  return (
    isRecord(value) &&
    Number.isInteger(value.r) &&
    value.r >= MIN_CORRECTNESS &&
    value.r <= MAX_CORRECTNESS &&
    (value.g === undefined || typeof value.g === 'string')
  );
}

function isInputGame(value) {
  if (!Array.isArray(value) || value.length !== 2 || !Number.isInteger(value[0])) {
    return false;
  }

  const game = value[1];
  return (
    isRecord(game) &&
    (
      game.c == null ||
      (
        Array.isArray(game.c) &&
        game.c.length === 2 &&
        game.c.every(isFiniteNumber)
      )
    ) &&
    Array.isArray(game.a) &&
    game.a.every(isInputAnswer)
  );
}

export function parseExportText(content, fileName = 'export') {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`${fileName} does not contain valid JSON.`, { cause: error });
  }

  if (
    !isRecord(parsed) ||
    !isFiniteNumber(parsed.format) ||
    !isRecord(parsed.meta) ||
    !isFiniteNumber(parsed.meta.created) ||
    typeof parsed.meta.device !== 'string' ||
    !Array.isArray(parsed.games) ||
    !parsed.games.every(isInputGame)
  ) {
    throw new Error(`${fileName} is not a valid Catfishing export.`);
  }

  const days = new Set();
  for (const [day] of parsed.games) {
    if (days.has(day)) {
      throw new Error(`${fileName} contains duplicate day ${day}.`);
    }
    days.add(day);
  }

  return parsed;
}

export function normalizeScores(exportData, processedAt = new Date().toISOString()) {
  return exportData.games
    .map(([day, game]) => ({
      day,
      processedAt,
      ...(Array.isArray(game.c)
        ? { score: game.c[0] + game.c[1] * 0.5 }
        : {}),
      answers: game.a.map(answer => ({
        correctness: answer.r,
        ...(answer.g === undefined ? {} : { guess: answer.g })
      }))
    }));
}

export function mergeScores(currentScores, importedScores) {
  const scoresByDay = new Map(currentScores.map(score => [score.day, score]));
  importedScores.forEach(score => scoresByDay.set(score.day, score));
  return [...scoresByDay.values()].sort((left, right) => left.day - right.day);
}

export async function readGzipExport(file) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser does not support gzip imports.');
  }
  if (file.size > MAX_COMPRESSED_BYTES) {
    throw new Error(`${file.name} is larger than the 5 MB import limit.`);
  }

  let content = '';
  try {
    const decompressed = file.stream().pipeThrough(new DecompressionStream('gzip'));
    const reader = decompressed.getReader();
    const decoder = new TextDecoder();
    let decompressedBytes = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      decompressedBytes += value.byteLength;
      if (decompressedBytes > MAX_DECOMPRESSED_BYTES) {
        await reader.cancel();
        throw new Error(`${file.name} exceeds the 25 MB decompressed import limit.`);
      }
      content += decoder.decode(value, { stream: true });
    }
    content += decoder.decode();
  } catch (error) {
    if (error instanceof Error && error.message.includes('import limit')) {
      throw error;
    }
    throw new Error(`${file.name} could not be decompressed.`, { cause: error });
  }

  return parseExportText(content, file.name);
}

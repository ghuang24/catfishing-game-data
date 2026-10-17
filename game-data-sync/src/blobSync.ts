import { gunzip, gzip } from "node:zlib";
import { promisify } from "node:util";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import type { InvocationContext } from "@azure/functions";
import { updateGameData } from "./gameData.js";

const gunzipAsync = promisify(gunzip);
const gzipAsync = promisify(gzip);

const requiredSetting = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required application setting ${name}.`);
  }
  return value;
};

const positiveIntegerSetting = (name: string, defaultValue: number): number => {
  const rawValue = process.env[name];
  if (rawValue === undefined) return defaultValue;

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
};

const nonNegativeIntegerSetting = (name: string, defaultValue: number): number => {
  const rawValue = process.env[name];
  if (rawValue === undefined) return defaultValue;

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return value;
};

const streamToBuffer = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const synchronizeBlob = async (
  appendNext: boolean,
  context: InvocationContext
): Promise<void> => {
  const accountUrl = requiredSetting("DATA_STORAGE_ACCOUNT_URL");
  const containerName = requiredSetting("DATA_CONTAINER_NAME");
  const blobName = requiredSetting("DATA_BLOB_NAME");
  const credential = new DefaultAzureCredential({
    managedIdentityClientId: process.env.AZURE_CLIENT_ID
  });
  const blobClient = new BlobServiceClient(accountUrl, credential)
    .getContainerClient(containerName)
    .getBlockBlobClient(blobName);

  const download = await blobClient.download();
  if (!download.readableStreamBody || !download.etag) {
    throw new Error(`Unable to download ${containerName}/${blobName}.`);
  }

  const body = await streamToBuffer(download.readableStreamBody);
  const content = download.contentEncoding === "gzip"
    ? (await gunzipAsync(body)).toString("utf8")
    : body.toString("utf8");
  const update = await updateGameData({
    content,
    appendNext,
    maxRequests: positiveIntegerSetting("SYNC_MAX_REQUESTS", 25),
    requestIntervalMs: positiveIntegerSetting("SYNC_REQUEST_INTERVAL_MS", 2000),
    requestTimeoutMs: positiveIntegerSetting("SYNC_REQUEST_TIMEOUT_MS", 20_000),
    maxRetries: nonNegativeIntegerSetting("SYNC_MAX_RETRIES", 4),
    executionBudgetMs: positiveIntegerSetting("SYNC_EXECUTION_BUDGET_MS", 480_000)
  });

  for (const failure of update.failedDays) {
    context.warn(`Game data refresh failed for day ${failure.day}: ${failure.error}`);
  }

  if (update.refreshedDays.length === 0 && update.appendedDay === null) {
    throw new Error(
      `Game data sync completed without a successful refresh.` +
      (update.stoppedReason ? ` Stopped because of ${update.stoppedReason}.` : "")
    );
  }

  const compressed = await gzipAsync(Buffer.from(update.content, "utf8"), {
    level: 9
  });

  await blobClient.upload(compressed, compressed.length, {
    conditions: {
      ifMatch: download.etag
    },
    blobHTTPHeaders: {
      blobCacheControl: "public, max-age=300, must-revalidate",
      blobContentEncoding: "gzip",
      blobContentType: "application/x-ndjson"
    }
  });

  context.log("Game data sync completed.", {
    appendedDay: update.appendedDay,
    attemptedDayCount: update.attemptedDays.length,
    failedDayCount: update.failedDays.length,
    refreshedDayCount: update.refreshedDays.length,
    requestCount: update.requestCount,
    retryCount: update.retryCount,
    stoppedReason: update.stoppedReason
  });
};

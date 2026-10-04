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
  const update = await updateGameData({ content, appendNext });
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

  context.log(
    update.appendedDay === null
      ? `Refreshed game data for day ${update.refreshedDay}.`
      : `Refreshed day ${update.refreshedDay} and added day ${update.appendedDay}.`
  );
};

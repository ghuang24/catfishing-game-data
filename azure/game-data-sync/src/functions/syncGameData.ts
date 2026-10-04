import { app, type InvocationContext, type Timer } from "@azure/functions";
import { synchronizeBlob } from "../blobSync.js";

const finalizeAndAppend = async (
  timer: Timer,
  context: InvocationContext
): Promise<void> => {
  if (timer.isPastDue) {
    context.warn("Finalize-and-append timer is running late.");
  }
  await synchronizeBlob(true, context);
};

const refreshLatest = async (
  timer: Timer,
  context: InvocationContext
): Promise<void> => {
  if (timer.isPastDue) {
    context.warn("Latest-day refresh timer is running late.");
  }
  await synchronizeBlob(false, context);
};

app.timer("finalizeAndAppendGameData", {
  schedule: "0 15 10 * * *",
  runOnStartup: false,
  handler: finalizeAndAppend
});

app.timer("refreshLatestGameData", {
  schedule: "0 15 22 * * *",
  runOnStartup: false,
  handler: refreshLatest
});

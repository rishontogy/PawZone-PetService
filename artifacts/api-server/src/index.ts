import app from "./app";
import { logger } from "./lib/logger";
import { startCartSweeper } from "./lib/cartSweeper";
import { startTimerSweeper } from "./lib/timerSweeper";
import { seedAdmin, seedDemoUsers } from "./lib/seed";
import { startAlertEngine } from "./lib/alertEngine";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startCartSweeper();
  startTimerSweeper();
  seedAdmin().catch((e) => logger.error({ err: e }, "Failed to seed admin"));
  seedDemoUsers().catch((e) => logger.error({ err: e }, "Failed to seed demo users"));
  startAlertEngine();
});

import http from "node:http";
import app from './src/app';
import { connectDatabase } from './src/database/mongo';
import { env } from './src/config/env';
import { logger } from './src/config/logger';

const startServer = async () => {
  await connectDatabase();

  const server = http.createServer(app);
  server.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });

  const shutdown = () => {
    logger.info("Shutdown signal received. Closing server gracefully.");
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

startServer().catch((error) => {
  logger.error(`Failed to boot application: ${error.message}`);
  process.exit(1);
});


import app from "./app";
import db from "./config/database";
import logger from "./utils/logger";

const PORT = process.env.PORT || 3000;

const startServer = async (): Promise<void> => {
  try {
    await db.raw("SELECT 1");
    logger.info("Database connection established successfully");

    app.listen(PORT, () => {
      logger.info(`Demo Credit API running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

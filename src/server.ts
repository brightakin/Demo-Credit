import app from "./app";
import db from "./config/database";

const PORT = process.env.PORT || 3000;

const startServer = async (): Promise<void> => {
  try {
    await db.raw("SELECT 1");
    console.log("Database connection established successfully");

    app.listen(PORT, () => {
      console.log(`Demo Credit API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

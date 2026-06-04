import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import userRoutes from "./routes/userRoutes";
import walletRoutes from "./routes/walletRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { generateOpenApiSpec } from "./config/swagger";
import logger from "./utils/logger";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── HTTP request logging ─────────────────────────────────────────────────────
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(
  morgan(morganFormat, {
    stream: { write: (msg: string) => logger.http(msg.trim()) },
  }),
);

// ─── Swagger Docs ────────────────────────────────────────────────────────────
const openApiSpec = generateOpenApiSpec();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get("/api-docs.json", (_req, res) => res.json(openApiSpec));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", message: "Demo Credit API is running" });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/wallets", walletRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;

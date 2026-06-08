const fs = require("fs");
const path = require("path");

const srcMigrationsDir = path.resolve(__dirname, "src/database/migrations");
const distMigrationsDir = path.resolve(__dirname, "dist/database/migrations");

// In local dev we run TS migrations from src/, but in deployed containers
// only dist/ exists, so we automatically switch to JS migrations there.
const usesSrcMigrations = fs.existsSync(srcMigrationsDir);
const runtimeMigrationsDir = usesSrcMigrations ? srcMigrationsDir : distMigrationsDir;
const runtimeMigrationExtension = usesSrcMigrations ? "ts" : "js";
const runtimeLoadExtensions = usesSrcMigrations ? [".ts"] : [".js"];

const config = {
  development: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "demo_credit",
    },
    migrations: {
      directory: runtimeMigrationsDir,
      extension: runtimeMigrationExtension,
      loadExtensions: runtimeLoadExtensions,
    },
  },
  test: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "demo_credit_test",
    },
    migrations: {
      directory: runtimeMigrationsDir,
      extension: runtimeMigrationExtension,
      loadExtensions: runtimeLoadExtensions,
    },
  },
  production: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    migrations: {
      directory: path.resolve(__dirname, "dist/database/migrations"),
      extension: "js",
      loadExtensions: [".js"],
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};

module.exports = config;

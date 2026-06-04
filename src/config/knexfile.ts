import type { Knex } from "knex";
import dotenv from "dotenv";

dotenv.config();

const config: { [key: string]: Knex.Config } = {
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
      directory: "../database/migrations",
      extension: "ts",
    },
    seeds: {
      directory: "../database/seeds",
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
      directory: "../database/migrations",
      extension: "ts",
    },
  },

  production: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    migrations: {
      // In production we run compiled JS from dist/; no ts-node available
      directory: "../database/migrations",
      extension: "js",
      loadExtensions: [".js"],
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default config;

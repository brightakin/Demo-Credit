import knex from "knex";
import dotenv from "dotenv";
import knexConfig from "./knexfile";

dotenv.config();

const env = process.env.NODE_ENV || "development";
const db = knex(knexConfig[env]);

export default db;

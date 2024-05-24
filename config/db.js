import pkg from "pg";
import dotenv from "dotenv/config";
import { Sequelize } from "sequelize";
const { Pool } = pkg;

// dotenv.config();

export const db = new Sequelize(
  process.env.DATABASE_NAME,
  process.env.DATABASE_USERNAME,
  process.env.DATABASE_PASSWORD,
  {
    host: process.env.DATABASE_HOST,
    dialect: "postgres",
    port: process.env.PORT,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
);

export const pool = new Pool({
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  host: process.env.DATABASE_HOST,
  port: process.env.PORT, // default Postgres port
  database: process.env.DATABASE_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});

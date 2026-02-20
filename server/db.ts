import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.POSTGRESQL_HOST,
  port: parseInt(process.env.POSTGRESQL_PORT || "5432"),
  user: process.env.POSTGRESQL_USER,
  password: process.env.POSTGRESQL_PASSWORD,
  database: process.env.POSTGRESQL_DBNAME,
  ssl: { rejectUnauthorized: false },
});

pool.on("connect", (client) => {
  client.query("SET search_path TO replai; SET timezone TO 'UTC'");
});

export const db = drizzle(pool, { schema });

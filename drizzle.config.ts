import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.POSTGRESQL_HOST!,
    port: parseInt(process.env.POSTGRESQL_PORT || "5432"),
    user: process.env.POSTGRESQL_USER!,
    password: process.env.POSTGRESQL_PASSWORD!,
    database: process.env.POSTGRESQL_DBNAME!,
    ssl: { rejectUnauthorized: false },
  },
});

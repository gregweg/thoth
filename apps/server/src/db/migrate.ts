import "../env.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { STRATEGY_ORDER } from "@ill/shared";
import { strategyProgress } from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  const migrationsFolder = path.resolve(__dirname, "../../../../drizzle");
  console.log(`Running migrations from ${migrationsFolder}...`);
  await migrate(db, { migrationsFolder });

  console.log("Seeding strategy_progress...");
  for (let i = 0; i < STRATEGY_ORDER.length; i++) {
    const strategyType = STRATEGY_ORDER[i]!;
    const status = i === 0 ? "unlocked" : "locked";
    await db
      .insert(strategyProgress)
      .values({ strategyType, status })
      .onConflictDoNothing();
  }

  console.log("Migrations + seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

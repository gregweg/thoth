import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// apps/server/src -> apps/server -> apps -> repo root
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const envPath = path.join(rootDir, ".env");
const result = loadEnv({ path: envPath });
if (result.error) {
  loadEnv(); // fallback: cwd .env
}

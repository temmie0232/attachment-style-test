import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sql } from "@vercel/postgres";

async function main() {
  const sqlPath = resolve(process.cwd(), "db/init.sql");
  const ddl = await readFile(sqlPath, "utf8");
  const statements = ddl
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(`${statement};`);
  }

  console.log("DB initialized.");
}

main().catch((error) => {
  console.error("Failed to initialize DB.");
  console.error(error);
  process.exit(1);
});


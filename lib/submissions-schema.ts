import { sql } from "@vercel/postgres";

let schemaReadyPromise: Promise<void> | null = null;

async function setupSubmissionsSchema() {
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS attachment_submissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      answers jsonb NOT NULL,
      score jsonb NOT NULL,
      viewed_at timestamptz NOT NULL DEFAULT now(),
      viewed_period text NOT NULL DEFAULT '不明',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    ALTER TABLE attachment_submissions
    ADD COLUMN IF NOT EXISTS viewed_at timestamptz NOT NULL DEFAULT now()
  `;

  await sql`
    ALTER TABLE attachment_submissions
    ADD COLUMN IF NOT EXISTS viewed_period text NOT NULL DEFAULT '不明'
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS attachment_submissions_created_at_desc_idx
    ON attachment_submissions (created_at DESC)
  `;
}

export async function ensureSubmissionsSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = setupSubmissionsSchema();
  }

  try {
    await schemaReadyPromise;
  } catch (error) {
    schemaReadyPromise = null;
    throw error;
  }
}

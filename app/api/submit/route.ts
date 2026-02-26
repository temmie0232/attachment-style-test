import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { z } from "zod";
import { TOTAL_QUESTIONS } from "@/lib/constants";
import { normalizeAnswers, scoreAnswers } from "@/lib/scoring";
import { ensureSubmissionsSchema } from "@/lib/submissions-schema";

const payloadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "名前を入力してください。")
    .max(60, "名前は60文字以内です。"),
  answers: z.record(z.string(), z.union([z.literal(1), z.literal(2)])),
});

type InsertedRow = {
  id: string;
  created_at: string;
  viewed_at: string;
  viewed_period: string;
};

function viewedPeriodForDate(date: Date): string {
  const tokyoHour = Number(
    new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Tokyo",
    }).format(date),
  );

  if (tokyoHour >= 5 && tokyoHour < 11) {
    return "朝";
  }
  if (tokyoHour >= 11 && tokyoHour < 17) {
    return "昼";
  }
  if (tokyoHour >= 17 && tokyoHour < 22) {
    return "夕方〜夜";
  }
  return "深夜";
}

export async function POST(request: Request) {
  try {
    await ensureSubmissionsSchema();

    const json = await request.json();
    const parsed = payloadSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "入力が不正です。" }, { status: 400 });
    }

    const normalizedAnswers = normalizeAnswers(parsed.data.answers);
    if (Object.keys(normalizedAnswers).length !== TOTAL_QUESTIONS) {
      return NextResponse.json(
        { ok: false, error: "45問すべての回答が必要です。" },
        { status: 400 },
      );
    }

    const score = scoreAnswers(normalizedAnswers);
    const answersForStorage = Object.fromEntries(
      Object.entries(normalizedAnswers).map(([key, value]) => [String(key), value]),
    );
    const viewedAt = new Date();
    const viewedPeriod = viewedPeriodForDate(viewedAt);

    const insertResult = await sql<InsertedRow>`
      INSERT INTO attachment_submissions (name, answers, score, viewed_at, viewed_period)
      VALUES (
        ${parsed.data.name},
        ${JSON.stringify(answersForStorage)}::jsonb,
        ${JSON.stringify(score)}::jsonb,
        ${viewedAt.toISOString()}::timestamptz,
        ${viewedPeriod}
      )
      RETURNING id, created_at, viewed_at, viewed_period
    `;

    const row = insertResult.rows[0];
    return NextResponse.json({
      ok: true,
      id: row.id,
      createdAt: row.created_at,
      viewedAt: row.viewed_at,
      viewedPeriod: row.viewed_period,
      score,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ ok: false, error: "JSON形式が不正です。" }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: "保存に失敗しました。" }, { status: 400 });
  }
}

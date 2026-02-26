import Link from "next/link";
import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import { z } from "zod";
import questionsData from "@/data/questions.json";
import { Score, ScoreKey, labelForKey, rankScoreKeys } from "@/lib/scoring";
import { ensureSubmissionsSchema } from "@/lib/submissions-schema";
import { formatDateTimeJst } from "@/lib/time";

type Question = {
  id: number;
  question: string;
  answer1: string;
  answer2: string;
};

type SubmissionRow = {
  id: string;
  name: string;
  created_at: string;
  viewed_at: string;
  viewed_period: string;
  score: {
    scA?: number;
    scB?: number;
    scC?: number;
    scD?: number;
  } | null;
  answers: Record<string, number> | null;
};

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const questions = questionsData as Question[];
const SCORE_KEYS: ScoreKey[] = ["scA", "scB", "scC", "scD"];

function normalizeScore(raw: SubmissionRow["score"]): Score {
  return {
    scA: Number(raw?.scA ?? 0),
    scB: Number(raw?.scB ?? 0),
    scC: Number(raw?.scC ?? 0),
    scD: Number(raw?.scD ?? 0),
  };
}

function answerLabel(question: Question, selectedValue: number | undefined): string {
  if (selectedValue === 1) {
    return question.answer1;
  }
  if (selectedValue === 2) {
    return question.answer2;
  }
  return "未回答";
}

async function getSubmission(id: string): Promise<SubmissionRow | null> {
  await ensureSubmissionsSchema();

  const result = await sql<SubmissionRow>`
    SELECT id, name, score, answers, created_at, viewed_at, viewed_period
    FROM attachment_submissions
    WHERE id = ${id}
    LIMIT 1
  `;

  return result.rows[0] ?? null;
}

export default async function AdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    notFound();
  }

  const row = await getSubmission(parsedParams.data.id);
  if (!row) {
    notFound();
  }

  const score = normalizeScore(row.score);
  const ranked = rankScoreKeys(score);
  const maxScore = score[ranked[0] ?? "scA"];

  return (
    <main className="main">
      <section className="card stack">
        <h1>回答詳細</h1>
        <p className="badge">{row.name}</p>
        <div className="detail-grid">
          <p className="muted">保存日時: {formatDateTimeJst(row.created_at)}</p>
          <p className="muted">結果表示日時: {formatDateTimeJst(row.viewed_at)}</p>
          <p className="muted">時間帯: {row.viewed_period}</p>
          <p className="muted">id: {row.id}</p>
        </div>

        <table className="result-table">
          <thead>
            <tr>
              <th>タイプ</th>
              <th>スコア</th>
            </tr>
          </thead>
          <tbody>
            {SCORE_KEYS.map((key) => (
              <tr key={key} className={score[key] === maxScore ? "highlight" : undefined}>
                <td>{labelForKey(key)}</td>
                <td>{score[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="answers-list">
          {questions.map((question) => (
            <article className="answer-item" key={question.id}>
              <p className="answer-item-head">
                Q{question.id}：{answerLabel(question, row.answers?.[String(question.id)])}
              </p>
              <p className="answer-item-question">{question.question}</p>
            </article>
          ))}
        </div>

        <div className="row">
          <Link className="btn btn-secondary" href="/admin">
            一覧へ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { sql } from "@vercel/postgres";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Score, ScoreKey, labelForKey, rankScoreKeys } from "@/lib/scoring";
import { ensureSubmissionsSchema } from "@/lib/submissions-schema";

type SubmissionRow = {
  id: string;
  name: string;
  score: {
    scA?: number;
    scB?: number;
    scC?: number;
    scD?: number;
  } | null;
  viewed_at: string;
  viewed_period: string;
};

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const TYPE_COMMENTARY: Record<ScoreKey, string> = {
  scA: "安定型の傾向が強めです。人を信頼しやすく、距離感を調整しながら関係を続ける力が比較的高い状態です。",
  scB: "不安型の傾向が強めです。相手の反応に敏感になりやすく、見捨てられ不安が高まると気持ちが揺れやすい状態です。",
  scC: "回避型の傾向が強めです。親密さに負担を感じやすく、近づきたい気持ちと距離を取りたい気持ちがぶつかりやすい状態です。",
  scD: "未解決軸の傾向が強めです。強いストレス時に気持ちや行動が不安定になりやすく、過去体験の影響が出ることがあります。",
};

export const dynamic = "force-dynamic";

function normalizeScore(raw: SubmissionRow["score"]): Score {
  return {
    scA: Number(raw?.scA ?? 0),
    scB: Number(raw?.scB ?? 0),
    scC: Number(raw?.scC ?? 0),
    scD: Number(raw?.scD ?? 0),
  };
}

function strengthLabel(value: number): string {
  if (value >= 15) {
    return "非常に強い";
  }
  if (value >= 10) {
    return "強い";
  }
  if (value >= 5) {
    return "気になりやすい";
  }
  return "弱め";
}

function adviceForD(score: Score): string {
  if (score.scD >= 10) {
    return "D軸が高めです。ストレスが強い時は、睡眠・休息・相談先の確保を優先してください。";
  }
  if (score.scD >= 5) {
    return "D軸は中程度です。疲労が強い時に感情が揺れやすい可能性があります。";
  }
  return "D軸は低めです。日常では比較的安定して対処しやすい状態です。";
}

async function getSubmission(id: string): Promise<SubmissionRow | null> {
  await ensureSubmissionsSchema();

  const result = await sql<SubmissionRow>`
    SELECT id, name, score, viewed_at, viewed_period
    FROM attachment_submissions
    WHERE id = ${id}
    LIMIT 1
  `;

  return result.rows[0] ?? null;
}

export default async function ResultPage({
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
  const primary = ranked[0] ?? "scA";
  const secondary = ranked[1];
  const maxScore = score[primary];
  const showSecondary = Boolean(secondary && score[secondary] >= 5);

  return (
    <main className="main">
      <section className="card stack">
        <h1>診断結果</h1>
        <p className="badge">{row.name} の結果</p>
        <p className="muted">
          表示日時: {new Date(row.viewed_at).toLocaleString("ja-JP")}（時間帯: {row.viewed_period}）
        </p>

        <p>
          基本傾向：<strong>{labelForKey(primary)}</strong>
        </p>
        <p className="muted">{TYPE_COMMENTARY[primary]}</p>

        {showSecondary && secondary && (
          <>
            <p>
              副傾向：<strong>{labelForKey(secondary)}</strong>（{score[secondary]}点）
            </p>
            <p className="muted">{TYPE_COMMENTARY[secondary]}</p>
          </>
        )}

        <p className="muted">{adviceForD(score)}</p>

        <table className="result-table">
          <thead>
            <tr>
              <th>タイプ</th>
              <th>スコア</th>
              <th>強さ</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((key) => (
              <tr key={key} className={score[key] === maxScore ? "highlight" : undefined}>
                <td>{labelForKey(key)}</td>
                <td>{score[key]}</td>
                <td>{strengthLabel(score[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="row">
          <Link className="btn btn-secondary" href="/test">
            回答へ戻る
          </Link>
          <Link className="btn btn-outline" href="/">
            トップへ
          </Link>
        </div>
      </section>
    </main>
  );
}

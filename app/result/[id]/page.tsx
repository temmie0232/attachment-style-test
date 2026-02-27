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

type TypeDetail = {
  lead: string;
  traits: string[];
  relationship: string[];
  strengths: string[];
  tips: string[];
};

const TYPE_DETAILS: Record<ScoreKey, TypeDetail> = {
  scA: {
    lead:
      "安定（A）は、親密さと自立のバランスが取りやすく、必要なときに頼ったり話し合ったりしながら関係を続けやすい傾向です。",
    traits: [
      "自分の気持ちを把握して言葉にしやすい",
      "相手の反応に過度に振り回されにくい",
      "一人の時間と一緒の時間を、どちらも大切にできる",
    ],
    relationship: [
      "すれ違いが起きても、修復（謝る・話し合う・歩み寄る）に向かいやすい",
      "境界線を守りつつ、自分の希望も伝えやすい",
      "相手の不安や距離感の変化にも、落ち着いて対応しやすい",
    ],
    strengths: ["安心感をつくるのが得意", "長期的な関係を育てやすい", "対立より協力に寄せやすい"],
    tips: [
      "頑張りすぎのサイン（疲労・我慢）を早めに拾って休む",
      "相手の不安に巻き込まれすぎないよう、自分の境界線も大切にする",
    ],
  },
  scB: {
    lead:
      "不安（B）は、関係を大切にする気持ちが強い一方で、見捨てられ・拒絶への不安が高まりやすい傾向です。相手の反応の小さな変化にも敏感になり、頭の中で最悪の想像がふくらむことがあります。",
    traits: [
      "連絡頻度や態度の変化が気になりやすい",
      "安心するための「確認」や「保証」が欲しくなりやすい",
      "自己評価が揺れやすく、相手の気持ちで安心感が左右されやすい",
    ],
    relationship: [
      "不安が強いと、詰め寄る・試す・急に落ち込むなど行動が極端になりやすい",
      "相手を優先しすぎて疲れ、後から不満が爆発しやすい",
      "「察してほしい」期待が増え、すれ違いが起きやすい",
    ],
    strengths: ["共感性が高く相手の機微に気づきやすい", "関係を育てたい意欲が強い", "愛情表現が豊かになりやすい"],
    tips: [
      "不安が来たら「事実 / 推測 / 不安」を分けて整理する",
      "連絡で安心を取りに行く前に、体を落ち着ける（呼吸・散歩・温かい飲み物）",
      "要望は責めではなく「お願い」の形で具体的に伝える",
    ],
  },
  scC: {
    lead:
      "回避（C）は、自立や自己管理を大事にしやすい一方で、弱さの共有や依存を負担に感じやすい傾向です。頼るより「自分で処理する」を選びやすく、距離が近づくと無意識に引いてしまうことがあります。",
    traits: [
      "感情を表に出すのが苦手、または必要性を感じにくい",
      "人に頼る・甘えることに抵抗や罪悪感が出やすい",
      "衝突や重い話題を避けたくなりやすい",
    ],
    relationship: [
      "相手が近づくほど距離を取る（返信が遅くなる、会う頻度を減らすなど）",
      "問題が起きても、解決より沈静化を優先しやすい",
      "本音を後回しにして、相手から「分からない」と言われやすい",
    ],
    strengths: ["冷静さ・判断力が出やすい", "過度に依存せず自分の軸を保ちやすい", "一人で回復する力がある"],
    tips: [
      "小さな自己開示から始める（気持ちのラベル付け → 1文で共有）",
      "「一人で回復する時間」を先に宣言して確保する",
      "距離を取る理由を言葉にして共有し、誤解を減らす",
    ],
  },
  scD: {
    lead:
      "未解決（D）は、親密さへの欲求と怖さが同居しやすく、近づきたいのに急に離れたくなるなど揺れが大きく出やすい傾向です。強いストレス時に反応が速く強くなり、気持ちや行動が不安定に感じられることがあります。",
    traits: [
      "信頼したいのに疑ってしまい、安心が続きにくい",
      "感情の波が大きく、警戒や自己否定が急に強まることがある",
      "「安全/危険」の判断が極端になりやすい",
    ],
    relationship: [
      "追う → 押し返す（プッシュプル）など、距離感が行ったり来たりしやすい",
      "相手の些細な言動で気持ちが大きく揺れ、誤解が深まりやすい",
      "つらいときほど一人で抱え込み、孤立しやすい",
    ],
    strengths: ["危険察知や洞察が鋭い", "一度信頼できると誠実さが強い", "回復すると深い共感が出やすい"],
    tips: [
      "ストレス時はまず身体を落ち着ける（睡眠・休息・食事・呼吸）",
      "刺激が強い会話は、時間を区切る/翌日に持ち越すなど安全策を先に決める",
      "一人で抱えないための相談先（人・場所・窓口）を確保する",
    ],
  },
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

function TypeExplanation({ typeKey }: { typeKey: ScoreKey }) {
  const detail = TYPE_DETAILS[typeKey];

  return (
    <div className="result-explain">
      <p className="muted result-lead">{detail.lead}</p>
      <div className="result-sections">
        <div className="result-panel">
          <h3 className="result-subtitle">よくある特徴</h3>
          <ul className="result-list">
            {detail.traits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="result-panel">
          <h3 className="result-subtitle">対人関係で起こりやすいこと</h3>
          <ul className="result-list">
            {detail.relationship.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="result-panel">
          <h3 className="result-subtitle">強み</h3>
          <ul className="result-list">
            {detail.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="result-panel">
          <h3 className="result-subtitle">ラクになるヒント</h3>
          <ul className="result-list">
            {detail.tips.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
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
      <section className="card stack result-card">
        <h1>診断結果</h1>
        <p className="muted result-note">
          ※これは医療診断ではありません。相手や状況、ストレス量で揺れる「今の傾向」を言語化するための目安です。
        </p>
        <p className="result-trend">
          基本傾向：<strong>{labelForKey(primary)}</strong>
        </p>
        <TypeExplanation typeKey={primary} />

        {showSecondary && secondary && (
          <details className="result-details">
            <summary className="result-details-summary">
              副傾向：<strong>{labelForKey(secondary)}</strong>（{score[secondary]}点）を読む
            </summary>
            <TypeExplanation typeKey={secondary} />
          </details>
        )}

        <p className="muted result-note">{adviceForD(score)}</p>

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

import { sql } from "@vercel/postgres";
import questionsData from "@/data/questions.json";

type Question = {
  id: number;
  answer1: string;
  answer2: string;
};

type SubmissionRow = {
  id: string;
  name: string;
  created_at: string;
  score: {
    scA?: number;
    scB?: number;
    scC?: number;
    scD?: number;
  } | null;
  answers: Record<string, number> | null;
};

export const dynamic = "force-dynamic";
const questions = questionsData as Question[];
const questionById = new Map(questions.map((item) => [item.id, item]));

function answerLabel(questionId: number, selectedValue: number | undefined): string {
  const question = questionById.get(questionId);
  if (!question) {
    return selectedValue === 1 || selectedValue === 2 ? `選択肢${selectedValue}` : "未回答";
  }

  if (selectedValue === 1) {
    return question.answer1;
  }

  if (selectedValue === 2) {
    return question.answer2;
  }

  return "未回答";
}

async function getSubmissions() {
  const result = await sql<SubmissionRow>`
    SELECT id, name, score, answers, created_at
    FROM attachment_submissions
    ORDER BY created_at DESC
    LIMIT 200
  `;

  return result.rows;
}

export default async function AdminPage() {
  try {
    const rows = await getSubmissions();

    return (
      <main className="main">
        <section className="card stack">
          <h1>管理画面</h1>
          <p className="muted">直近200件を新しい順に表示しています。</p>

          <table className="admin-table">
            <thead>
              <tr>
                <th>日時</th>
                <th>名前</th>
                <th>A</th>
                <th>B</th>
                <th>C</th>
                <th>D</th>
                <th>回答詳細</th>
                <th>id</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8}>データはまだありません。</td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.created_at).toLocaleString("ja-JP")}</td>
                  <td>{row.name}</td>
                  <td>{row.score?.scA ?? 0}</td>
                  <td>{row.score?.scB ?? 0}</td>
                  <td>{row.score?.scC ?? 0}</td>
                  <td>{row.score?.scD ?? 0}</td>
                  <td>
                    <details className="answers-details">
                      <summary>回答を見る</summary>
                      <div className="answers-grid">
                        {questions.map((question) => (
                          <span className="answer-chip" key={`${row.id}-${question.id}`}>
                            Q{question.id}:{answerLabel(question.id, row.answers?.[String(question.id)])}
                          </span>
                        ))}
                      </div>
                    </details>
                  </td>
                  <td>{row.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    );
  } catch {
    return (
      <main className="main">
        <section className="card stack">
          <h1>管理画面</h1>
          <p className="error">DBへ接続できませんでした。環境変数と初期化状態を確認してください。</p>
        </section>
      </main>
    );
  }
}

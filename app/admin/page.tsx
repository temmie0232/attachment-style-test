import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import questionsData from "@/data/questions.json";

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
const idSchema = z.string().uuid();

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

async function deleteSubmission(formData: FormData) {
  "use server";

  const parsed = idSchema.safeParse(formData.get("id"));
  if (!parsed.success) {
    return;
  }

  await sql`
    DELETE FROM attachment_submissions
    WHERE id = ${parsed.data}
  `;

  revalidatePath("/admin");
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
                <th>操作</th>
                <th>id</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9}>データはまだありません。</td>
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
                      <div className="answers-list">
                        {questions.map((question) => (
                          <article className="answer-item" key={`${row.id}-${question.id}`}>
                            <p className="answer-item-head">
                              Q{question.id}：{answerLabel(question.id, row.answers?.[String(question.id)])}
                            </p>
                            <p className="answer-item-question">{question.question}</p>
                          </article>
                        ))}
                      </div>
                    </details>
                  </td>
                  <td>
                    <form action={deleteSubmission}>
                      <input type="hidden" name="id" value={row.id} />
                      <button className="btn btn-danger btn-small btn-inline" type="submit">
                        削除
                      </button>
                    </form>
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

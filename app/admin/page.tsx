import Link from "next/link";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ensureSubmissionsSchema } from "@/lib/submissions-schema";
import { formatDateTimeJst } from "@/lib/time";

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
};

export const dynamic = "force-dynamic";
const idSchema = z.string().uuid();

async function getSubmissions() {
  await ensureSubmissionsSchema();

  const result = await sql<SubmissionRow>`
    SELECT id, name, score, created_at, viewed_at, viewed_period
    FROM attachment_submissions
    ORDER BY created_at DESC
    LIMIT 200
  `;

  return result.rows;
}

async function deleteSubmission(formData: FormData) {
  "use server";

  await ensureSubmissionsSchema();

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
                <th>保存日時</th>
                <th>結果表示日時</th>
                <th>時間帯</th>
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
                  <td colSpan={11}>データはまだありません。</td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDateTimeJst(row.created_at)}</td>
                  <td>{formatDateTimeJst(row.viewed_at)}</td>
                  <td>{row.viewed_period}</td>
                  <td>{row.name}</td>
                  <td>{row.score?.scA ?? 0}</td>
                  <td>{row.score?.scB ?? 0}</td>
                  <td>{row.score?.scC ?? 0}</td>
                  <td>{row.score?.scD ?? 0}</td>
                  <td>
                    <Link className="btn btn-secondary btn-small btn-inline" href={`/admin/${row.id}`}>
                      詳細へ
                    </Link>
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

import { sql } from "@vercel/postgres";

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
};

export const dynamic = "force-dynamic";

async function getSubmissions() {
  const result = await sql<SubmissionRow>`
    SELECT id, name, score, created_at
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
                <th>id</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>データはまだありません。</td>
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


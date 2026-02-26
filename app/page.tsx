import Link from "next/link";

export default function HomePage() {
  return (
    <main className="main">
      <section className="card stack">
        <span className="hero-tag">DUO-LIKE UI</span>
        <h1 className="hero-title">愛着スタイル診断</h1>
        <p className="hero-sub">2択×45問への回答からA/B/C/Dスコアを算出します。</p>

        <div className="stack">
          <h2>愛着障害とは</h2>
          <p className="muted">
            愛着障害（愛着の問題）は、人との距離感や信頼の持ち方に強い偏りが出て、
            対人関係で困りやすくなる状態を指します。大人では「不安になりやすい」「近づきたいのに避ける」といった形で現れることがあります。
          </p>
        </div>

        <div className="row">
          <Link className="btn" href="/test">
            診断をはじめる
          </Link>
          <a
            className="btn btn-outline"
            href="https://www.16personalities.com/ja"
            target="_blank"
            rel="noreferrer"
          >
            参考（外部）
          </a>
        </div>
      </section>
    </main>
  );
}

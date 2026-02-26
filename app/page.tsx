import Link from "next/link";

export default function HomePage() {
  return (
    <main className="main">
      <section className="card stack">
        <span className="hero-tag">DUO-LIKE UI</span>
        <h1 className="hero-title">愛着スタイル診断（45問）</h1>
        <p className="hero-sub">2択×45問への回答からA/B/C/Dスコアを算出します。</p>

        <div className="stack">
          <h2>免責</h2>
          <ul>
            <li>この診断は自己理解の参考であり、医療診断ではありません。</li>
            <li>困りごとが強い場合は、医療・心理の専門家へ相談してください。</li>
          </ul>
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

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="main">
      <section className="card stack">
        <h1 className="hero-title">愛着スタイル診断</h1>

        <div className="stack">
          <h2>愛着（アタッチメント）と愛着スタイル</h2>
          <p className="muted">
            愛着（アタッチメント）は、幼い頃に「困ったときに助けてもらえる」「安心できる人がいる」と感じられた経験から育つ、対人の安心感の土台です。
            大人になっても、人を信じる感覚や親密さへの向き合い方、頼り方・頼られ方に影響します。
          </p>
          <p className="muted">
            この診断では、その土台が関係の中でどんなクセとして現れやすいかを、4つの軸（安定／不安／回避／未解決）としてスコア化します。
            たとえば「安心して頼れる」「見捨てられ不安が高まりやすい」「近づきすぎると距離を取りたくなる」「近づきたいのに怖くなるなど揺れが大きい」といった傾向です。
          </p>
          <p className="muted">
            ※一般に「愛着障害」という言葉は幅広く使われますが、ここで扱うのは医療診断ではなく、今の対人パターンを言語化するための目安です。
            つらさが強い・日常に支障がある場合は、医療・心理の専門家への相談も選択肢です。
          </p>
        </div>

        <div className="row">
          <Link className="btn" href="/test">
            診断をはじめる
          </Link>
        </div>
      </section>
    </main>
  );
}

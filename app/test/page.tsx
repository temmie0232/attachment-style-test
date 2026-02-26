"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import questionsData from "@/data/questions.json";
import { TOTAL_QUESTIONS } from "@/lib/constants";
import { AnswerMap, Score, ScoreKey, labelForKey, rankScoreKeys, scoreAnswers } from "@/lib/scoring";

type Question = {
  id: number;
  question: string;
  answer1: string;
  answer2: string;
};

const questions = questionsData as Question[];
const SCORE_ORDER: ScoreKey[] = ["scA", "scB", "scC", "scD"];

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

export default function TestPage() {
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [score, setScore] = useState<Score | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [message, setMessage] = useState<string>("");

  const trimmedName = name.trim();
  const answeredCount = questions.reduce((count, item) => {
    return answers[item.id] ? count + 1 : count;
  }, 0);
  const unansweredCount = TOTAL_QUESTIONS - answeredCount;
  const canShowResult = Boolean(trimmedName && answeredCount === TOTAL_QUESTIONS);
  const progressPercent = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);

  const rankedKeys = useMemo(() => {
    return score ? rankScoreKeys(score) : [];
  }, [score]);

  const primaryKey: ScoreKey = rankedKeys[0] ?? "scA";
  const secondaryKey: ScoreKey | undefined = rankedKeys[1];
  const maxScore = score ? score[primaryKey] : 0;
  const shouldShowSecondary = Boolean(score && secondaryKey && score[secondaryKey] >= 5);

  const clearResultState = () => {
    setScore(null);
    setSaveState("idle");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    clearResultState();
    setMessage("");
  };

  const handleChoose = (questionId: number, value: 1 | 2) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }));
    clearResultState();
    setMessage("");
  };

  const handleShowResult = () => {
    if (!trimmedName) {
      setMessage("名前を入力してください。");
      return;
    }

    if (!canShowResult) {
      setMessage(`未回答が${unansweredCount}問あります。すべて回答してください。`);
      return;
    }

    try {
      const nextScore = scoreAnswers(answers);
      setName(trimmedName);
      setScore(nextScore);
      setSaveState("idle");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "採点に失敗しました。");
    }
  };

  const handleSave = async () => {
    if (!score || saveState !== "idle") {
      return;
    }

    setSaveState("saving");
    setMessage("");

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          answers,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "保存に失敗しました。");
      }

      setSaveState("saved");
      setMessage("保存済みです。");
    } catch (error) {
      setSaveState("idle");
      setMessage(error instanceof Error ? error.message : "保存に失敗しました。");
    }
  };

  return (
    <main className="main">
      <section className="card stack">
        <span className="hero-tag">ONE-PAGE TEST</span>
        <h1>愛着スタイル診断（45問）</h1>
        <p className="muted">1ページですべて回答できます。選択後に「次へ」は不要です。</p>
        <p className="muted">保存されるため、本名ではなくニックネームの利用を推奨します。</p>

        <div className="stack">
          <label htmlFor="name">名前（必須）</label>
          <input
            id="name"
            className="input"
            type="text"
            value={name}
            maxLength={60}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="例）みかん"
          />
        </div>

        <div className="stack">
          <div className="row">
            <p className="muted">回答済み: {answeredCount} / {TOTAL_QUESTIONS}</p>
            <p className="muted">進捗: {progressPercent}%</p>
          </div>
          <div className="progress-track" aria-label="回答進捗">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="question-list">
          {questions.map((question) => {
            const selectedAnswer = answers[question.id];
            return (
              <article
                key={question.id}
                className={`question-card ${selectedAnswer === 1 || selectedAnswer === 2 ? "answered" : ""}`}
              >
                <div className="question-top">
                  <span className="question-number">Q{question.id}</span>
                  <p className="question-text">{question.question}</p>
                </div>

                <div className="choice-grid">
                  <button
                    type="button"
                    className={`choice ${selectedAnswer === 1 ? "selected" : ""}`}
                    onClick={() => handleChoose(question.id, 1)}
                  >
                    {question.answer1}
                  </button>
                  <button
                    type="button"
                    className={`choice ${selectedAnswer === 2 ? "selected" : ""}`}
                    onClick={() => handleChoose(question.id, 2)}
                  >
                    {question.answer2}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="row">
          <button className="btn" type="button" disabled={!canShowResult} onClick={handleShowResult}>
            結果を見る
          </button>
          <Link className="btn btn-outline" href="/">
            トップへ
          </Link>
        </div>

        {score && (
          <div className="stack card">
            <p className="badge">{trimmedName} さんの結果</p>
            <p>
              基本傾向：<strong>{labelForKey(primaryKey)}</strong>
            </p>
            {shouldShowSecondary && secondaryKey && (
              <p>
                副傾向：<strong>{labelForKey(secondaryKey)}</strong>（{score[secondaryKey]}点）
              </p>
            )}
            <p className="muted">D（未解決）は補助軸として、ストレス時の揺れやすさの目安にしてください。</p>

            <table className="result-table">
              <thead>
                <tr>
                  <th>タイプ</th>
                  <th>スコア</th>
                  <th>強さ</th>
                </tr>
              </thead>
              <tbody>
                {SCORE_ORDER.map((key) => (
                  <tr key={key} className={score[key] === maxScore ? "highlight" : undefined}>
                    <td>{labelForKey(key)}</td>
                    <td>{score[key]}</td>
                    <td>{strengthLabel(score[key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="row">
              <button
                className="btn"
                type="button"
                disabled={saveState !== "idle"}
                onClick={handleSave}
              >
                {saveState === "saved" ? "保存済み" : saveState === "saving" ? "保存中..." : "結果を保存する"}
              </button>
              <Link className="btn btn-outline" href="/">
                トップへ
              </Link>
            </div>
          </div>
        )}

        {message && <p className={saveState === "saved" ? "success" : "error"}>{message}</p>}
      </section>
    </main>
  );
}

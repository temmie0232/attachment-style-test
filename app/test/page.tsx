"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import questionsData from "@/data/questions.json";
import { TOTAL_QUESTIONS } from "@/lib/constants";
import { AnswerMap, Score, ScoreKey, labelForKey, rankScoreKeys, scoreAnswers } from "@/lib/scoring";

type Phase = "name" | "questions" | "result";

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
  const [phase, setPhase] = useState<Phase>("name");
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState<Score | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [message, setMessage] = useState<string>("");

  const trimmedName = name.trim();
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.reduce((count, item) => {
    return answers[item.id] ? count + 1 : count;
  }, 0);
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const canShowResult = answeredCount === TOTAL_QUESTIONS;

  const rankedKeys = useMemo(() => {
    return score ? rankScoreKeys(score) : [];
  }, [score]);

  const primaryKey: ScoreKey = rankedKeys[0] ?? "scA";
  const secondaryKey: ScoreKey | undefined = rankedKeys[1];
  const maxScore = score ? score[primaryKey] : 0;
  const shouldShowSecondary = Boolean(score && secondaryKey && score[secondaryKey] >= 5);

  const handleStart = () => {
    if (!trimmedName) {
      return;
    }
    setName(trimmedName);
    setPhase("questions");
    setMessage("");
  };

  const handleChoose = (value: 1 | 2) => {
    if (!currentQuestion) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: value,
    }));
  };

  const handleShowResult = () => {
    if (!canShowResult) {
      return;
    }

    try {
      const nextScore = scoreAnswers(answers);
      setScore(nextScore);
      setPhase("result");
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
        <h1>愛着スタイル診断（45問）</h1>

        {phase === "name" && (
          <div className="stack">
            <label htmlFor="name">名前（ニックネーム推奨）</label>
            <input
              id="name"
              className="input"
              type="text"
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              placeholder="例）みかん"
            />
            <p className="muted">保存されるため、本名ではなくニックネームの利用を推奨します。</p>
            <div className="row">
              <button className="btn" type="button" disabled={!trimmedName} onClick={handleStart}>
                次へ
              </button>
              <Link className="btn btn-outline" href="/">
                トップへ
              </Link>
            </div>
          </div>
        )}

        {phase === "questions" && currentQuestion && (
          <div className="stack">
            <p className="muted">現在の設問: {currentQuestion.id} / {TOTAL_QUESTIONS}</p>
            <p className="muted">回答済み: {answeredCount} / {TOTAL_QUESTIONS}</p>
            <h2>{currentQuestion.question}</h2>

            <div className="stack">
              <button
                type="button"
                className={`choice ${currentAnswer === 1 ? "selected" : ""}`}
                onClick={() => handleChoose(1)}
              >
                {currentQuestion.answer1}
              </button>
              <button
                type="button"
                className={`choice ${currentAnswer === 2 ? "selected" : ""}`}
                onClick={() => handleChoose(2)}
              >
                {currentQuestion.answer2}
              </button>
            </div>

            <div className="row">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                disabled={currentIndex === 0}
              >
                戻る
              </button>

              {currentIndex < TOTAL_QUESTIONS - 1 ? (
                <button
                  className="btn"
                  type="button"
                  disabled={currentAnswer === undefined}
                  onClick={() =>
                    setCurrentIndex((index) => Math.min(TOTAL_QUESTIONS - 1, index + 1))
                  }
                >
                  次へ
                </button>
              ) : (
                <button
                  className="btn"
                  type="button"
                  disabled={!canShowResult}
                  onClick={handleShowResult}
                >
                  結果を見る
                </button>
              )}
            </div>
          </div>
        )}

        {phase === "result" && score && (
          <div className="stack">
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
              <button className="btn" type="button" disabled={saveState !== "idle"} onClick={handleSave}>
                {saveState === "saved" ? "保存済み" : saveState === "saving" ? "保存中..." : "結果を保存する"}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setPhase("questions")}
              >
                回答へ戻る
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

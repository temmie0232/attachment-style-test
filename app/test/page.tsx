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
const RESULT_TRIGGER_ID = "result-trigger";
const questionIndexById = new Map(questions.map((question, index) => [question.id, index]));

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
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [score, setScore] = useState<Score | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedSignature, setLastSavedSignature] = useState("");
  const [message, setMessage] = useState<string>("");

  const submissionName = "匿名";
  const answeredCount = questions.reduce((count, item) => {
    return answers[item.id] ? count + 1 : count;
  }, 0);
  const unansweredCount = TOTAL_QUESTIONS - answeredCount;
  const canShowResult = answeredCount === TOTAL_QUESTIONS;
  const answerSignature = questions.map((question) => answers[question.id] ?? 0).join("");

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

  const handleChoose = (questionId: number, value: 1 | 2) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }));
    clearResultState();
    setMessage("");

    const currentIndex = questionIndexById.get(questionId);
    if (currentIndex === undefined) {
      return;
    }

    const nextQuestion = questions[currentIndex + 1];
    const nextTargetId = nextQuestion ? `question-${nextQuestion.id}` : RESULT_TRIGGER_ID;
    window.requestAnimationFrame(() => {
      document.getElementById(nextTargetId)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const handleShowResult = async () => {
    if (!canShowResult) {
      setSaveState("idle");
      setMessage(`未回答が${unansweredCount}問あります。すべて回答してください。`);
      return;
    }

    let nextScore: Score;
    try {
      nextScore = scoreAnswers(answers);
    } catch (error) {
      setSaveState("idle");
      setMessage(error instanceof Error ? error.message : "採点に失敗しました。");
      return;
    }

    setScore(nextScore);

    if (lastSavedSignature === answerSignature) {
      setSaveState("saved");
      setMessage("結果を表示しました（この回答は保存済みです）。");
      return;
    }

    setSaveState("saving");
    setMessage("結果を計算して保存中です...");

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: submissionName,
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
      setLastSavedSignature(answerSignature);
      setMessage("結果を表示し、保存しました。");
    } catch (error) {
      setSaveState("idle");
      setMessage(error instanceof Error ? error.message : "保存に失敗しました。");
    }
  };

  const statusMessageClass = saveState === "saved" ? "success" : "error";

  return (
    <main className="main">
      <section className="card stack">
        <h1>愛着スタイル診断</h1>

        <div className="question-list">
          {questions.map((question) => {
            const selectedAnswer = answers[question.id];
            return (
              <article
                key={question.id}
                id={`question-${question.id}`}
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

        <div id={RESULT_TRIGGER_ID} className="row">
          <button
            className="btn"
            type="button"
            disabled={!canShowResult || saveState === "saving"}
            onClick={handleShowResult}
          >
            {saveState === "saving" ? "保存中..." : "結果を見る"}
          </button>
          <Link className="btn btn-outline" href="/">
            トップへ
          </Link>
        </div>

        {score && (
          <div className="stack card">
            <p className="badge">診断結果</p>
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
              <Link className="btn btn-outline" href="/">
                トップへ
              </Link>
            </div>
          </div>
        )}

        {message && <p className={statusMessageClass}>{message}</p>}
      </section>
    </main>
  );
}

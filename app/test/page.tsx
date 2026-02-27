"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import questionsData from "@/data/questions.json";
import { TOTAL_QUESTIONS } from "@/lib/constants";
import { AnswerMap } from "@/lib/scoring";

type Question = {
  id: number;
  question: string;
  answer1: string;
  answer2: string;
};

const questions = questionsData as Question[];
const RESULT_TRIGGER_ID = "result-trigger";
const questionIndexById = new Map(questions.map((question, index) => [question.id, index]));

export default function TestPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [saveState, setSaveState] = useState<"idle" | "saving">("idle");
  const [message, setMessage] = useState<string>("");

  const submissionName = "匿名";
  const answeredCount = questions.reduce((count, item) => {
    return answers[item.id] ? count + 1 : count;
  }, 0);
  const unansweredCount = TOTAL_QUESTIONS - answeredCount;
  const canShowResult = answeredCount === TOTAL_QUESTIONS;
  const progressPercent = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);

  const handleChoose = (questionId: number, value: 1 | 2) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }));
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

    setSaveState("saving");
    setMessage("");

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
        id?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.id) {
        throw new Error(payload.error ?? "保存に失敗しました。");
      }

      router.push(`/result/${payload.id}`);
    } catch (error) {
      setSaveState("idle");
      setMessage(error instanceof Error ? error.message : "保存に失敗しました。");
    }
  };

  return (
    <main className="main">
      <section className="card stack">
        <h1 className="test-title">愛着スタイル診断</h1>
        <div className="progress-panel">
          <div className="progress-top">
            <p className="progress-label">回答進捗</p>
            <p className="progress-count">
              {answeredCount}/{TOTAL_QUESTIONS}（{progressPercent}%）
            </p>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

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

        {message && <p className="error">{message}</p>}
      </section>
    </main>
  );
}

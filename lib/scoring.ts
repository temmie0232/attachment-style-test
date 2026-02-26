import mappingData from "@/data/attachment-style-mapping.json";
import { TOTAL_QUESTIONS } from "@/lib/constants";

export type ScoreKey = "scA" | "scB" | "scC" | "scD";
export type Score = Record<ScoreKey, number>;
export type AnswerValue = 1 | 2;
export type AnswerMap = Record<number, AnswerValue>;

type PointMap = Partial<Record<ScoreKey, number>>;
type QuestionRule = {
  answer1: PointMap;
  answer2: PointMap;
};

type MappingSchema = {
  questions: Record<string, QuestionRule>;
};

const SCORE_KEYS: ScoreKey[] = ["scA", "scB", "scC", "scD"];
const LABELS: Record<ScoreKey, string> = {
  scA: "A（安定）",
  scB: "B（不安）",
  scC: "C（回避）",
  scD: "D（未解決）",
};

const mapping = mappingData as MappingSchema;

export function createEmptyScore(): Score {
  return { scA: 0, scB: 0, scC: 0, scD: 0 };
}

export function normalizeAnswers(raw: Record<string | number, number>): AnswerMap {
  const normalized: Partial<AnswerMap> = {};

  for (const [key, value] of Object.entries(raw)) {
    const questionId = Number(key);
    if (
      Number.isInteger(questionId) &&
      questionId >= 1 &&
      questionId <= TOTAL_QUESTIONS &&
      (value === 1 || value === 2)
    ) {
      normalized[questionId] = value;
    }
  }

  return normalized as AnswerMap;
}

export function scoreAnswers(answers: Record<string | number, number>): Score {
  const normalized = normalizeAnswers(answers);
  const score = createEmptyScore();

  for (let questionId = 1; questionId <= TOTAL_QUESTIONS; questionId += 1) {
    const answer = normalized[questionId];
    if (answer !== 1 && answer !== 2) {
      throw new Error(`未回答の設問があります: ${questionId}`);
    }

    const rule = mapping.questions[String(questionId)];
    if (!rule) {
      throw new Error(`採点ルールがありません: ${questionId}`);
    }

    const pointMap = answer === 1 ? rule.answer1 : rule.answer2;
    for (const key of SCORE_KEYS) {
      score[key] += Number(pointMap[key] ?? 0);
    }
  }

  return score;
}

export function rankScoreKeys(score: Score): ScoreKey[] {
  return [...SCORE_KEYS].sort((left, right) => {
    const diff = score[right] - score[left];
    if (diff !== 0) {
      return diff;
    }

    return SCORE_KEYS.indexOf(left) - SCORE_KEYS.indexOf(right);
  });
}

export function labelForKey(key: ScoreKey): string {
  return LABELS[key];
}


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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePointMap(value: unknown, context: string): PointMap {
  if (!isRecord(value)) {
    throw new Error(`採点テーブル形式が不正です: ${context}`);
  }

  const parsed: PointMap = {};
  for (const [key, rawAmount] of Object.entries(value)) {
    if (!SCORE_KEYS.includes(key as ScoreKey)) {
      throw new Error(`採点キーが不正です: ${context}.${key}`);
    }
    if (typeof rawAmount !== "number" || !Number.isFinite(rawAmount)) {
      throw new Error(`加点値が不正です: ${context}.${key}`);
    }
    parsed[key as ScoreKey] = rawAmount;
  }

  return parsed;
}

function validateMappingSchema(raw: unknown): MappingSchema {
  if (!isRecord(raw) || !isRecord(raw.questions)) {
    throw new Error("採点テーブル全体の形式が不正です。");
  }

  const parsedQuestions: Record<string, QuestionRule> = {};
  for (let questionId = 1; questionId <= TOTAL_QUESTIONS; questionId += 1) {
    const key = String(questionId);
    const ruleRaw = raw.questions[key];
    if (!isRecord(ruleRaw)) {
      throw new Error(`採点ルールがありません: ${key}`);
    }

    parsedQuestions[key] = {
      answer1: parsePointMap(ruleRaw.answer1, `questions.${key}.answer1`),
      answer2: parsePointMap(ruleRaw.answer2, `questions.${key}.answer2`),
    };
  }

  return { questions: parsedQuestions };
}

const mapping = validateMappingSchema(mappingData);

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

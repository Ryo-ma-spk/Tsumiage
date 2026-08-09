import type { Attempt, KnowledgePoint, PointStatus } from "../types";
import { daysBetween, evaluate } from "./mastery";

/** 実績ペースを測る窓（日） */
const PACE_WINDOW_DAYS = 14;

/** 1セッションで出す観点の数 */
export const SESSION_SIZE = 5;

export interface PaceSummary {
  /** 出題範囲の重み合計 */
  totalWeight: number;
  /** 定着済みの重み合計 */
  doneWeight: number;
  /** 達成率 0〜100 */
  progressPct: number;
  /** 残り観点数（定着していないもの） */
  remainingPoints: number;
  daysLeft: number;
  /** 間に合わせるのに必要な1日あたりの重み */
  requiredPerDay: number;
  /** 直近14日の実測ペース */
  actualPerDay: number;
  /** 画面表示用: 間に合わせるのに必要な1日あたりの観点数 */
  requiredPointsPerDay: number;
  /** 画面表示用: 直近14日で実際に定着させた1日あたりの観点数 */
  actualPointsPerDay: number;
  /** 今のペースのまま受験日を迎えたときの達成率 0〜100 */
  projectedPct: number;
  /** 必要ペースに対して足りているか */
  onTrack: boolean;
}

export function daysUntilExam(examDate: string, now: Date = new Date()): number {
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();
  return Math.max(0, daysBetween(today, `${examDate}T00:00:00`));
}

/**
 * 直近の窓の中で新しく定着に到達した重みを数える。
 * 「その日までの履歴」で再評価して、窓の開始時点との差分を取る。
 */
function masteredAt(
  statuses: PointStatus[],
  attempts: Attempt[],
  at: Date
): { weight: number; count: number } {
  const attemptsByPoint = new Map<string, Attempt[]>();
  for (const a of attempts) {
    if (new Date(a.at).getTime() > at.getTime()) continue;
    const list = attemptsByPoint.get(a.pointId);
    if (list) list.push(a);
    else attemptsByPoint.set(a.pointId, [a]);
  }

  let weight = 0;
  let count = 0;
  for (const s of statuses) {
    const pointAttempts = attemptsByPoint.get(s.point.id);
    if (!pointAttempts || pointAttempts.length === 0) continue;
    if (evaluate(pointAttempts, at).level === "mastered") {
      weight += s.weight;
      count += 1;
    }
  }
  return { weight, count };
}

export function summarize(
  statuses: PointStatus[],
  attempts: Attempt[],
  examDate: string,
  now: Date = new Date()
): PaceSummary {
  const totalWeight = statuses.reduce((sum, s) => sum + s.weight, 0);
  const doneWeight = statuses
    .filter((s) => s.level === "mastered" && !s.needsReview)
    .reduce((sum, s) => sum + s.weight, 0);

  const donePoints = statuses.filter(
    (s) => s.level === "mastered" && !s.needsReview
  ).length;
  const remainingWeight = Math.max(0, totalWeight - doneWeight);
  const remainingPoints = statuses.length - donePoints;

  const daysLeft = daysUntilExam(examDate, now);
  const progressPct = totalWeight === 0 ? 0 : (doneWeight / totalWeight) * 100;

  const requiredPerDay = daysLeft === 0 ? remainingWeight : remainingWeight / daysLeft;

  // 実績ペース: 窓の開始時点と現在の定着重みの差 ÷ 経過日数
  const windowStart = new Date(now.getTime() - PACE_WINDOW_DAYS * 86400000);
  const atStart = masteredAt(statuses, attempts, windowStart);
  const gained = Math.max(0, doneWeight - atStart.weight);
  const gainedPoints = Math.max(0, donePoints - atStart.count);

  const firstAttempt = attempts.map((a) => a.at).sort()[0];
  const elapsed = firstAttempt
    ? Math.min(PACE_WINDOW_DAYS, Math.max(1, daysBetween(firstAttempt, now)))
    : PACE_WINDOW_DAYS;
  const actualPerDay = gained / elapsed;

  const projectedWeight = Math.min(
    totalWeight,
    doneWeight + actualPerDay * daysLeft
  );
  const projectedPct =
    totalWeight === 0 ? 0 : (projectedWeight / totalWeight) * 100;

  return {
    totalWeight,
    doneWeight,
    progressPct,
    remainingPoints,
    daysLeft,
    requiredPerDay,
    actualPerDay,
    requiredPointsPerDay:
      daysLeft === 0 ? remainingPoints : remainingPoints / daysLeft,
    actualPointsPerDay: gainedPoints / elapsed,
    projectedPct,
    onTrack: actualPerDay >= requiredPerDay,
  };
}

/**
 * やるべき観点を優先度順に並べる。
 * 「何をやるか自分で決める」コストを消すのがこのアプリの役目なので、
 * 選定ルールはここに固定し、画面側では選ばせない。
 */
export function prioritize(statuses: PointStatus[]): PointStatus[] {
  const score = (s: PointStatus): number => {
    // 復習が必要な定着観点が最優先（落とすと一番もったいない）
    if (s.needsReview) return 0;
    if (s.level === "touched") return 1; // 一度つまずいた所
    if (s.level === "solved") return 2; // あと1回で定着
    return 3; // 未着手
  };

  return statuses
    .filter((s) => !s.locked && (s.level !== "mastered" || s.needsReview))
    .sort((a, b) => score(a) - score(b) || b.weight - a.weight);
}

/** 次にやるべき観点を1つだけ返す */
export function pickNext(statuses: PointStatus[]): PointStatus | null {
  return prioritize(statuses)[0] ?? null;
}

/** 1セッションで出す観点をそろえる */
export function buildQueue(
  statuses: PointStatus[],
  size = SESSION_SIZE
): KnowledgePoint[] {
  return prioritize(statuses)
    .slice(0, size)
    .map((s) => s.point);
}

/** 出題頻度が高いのに定着していない観点 = 不安の正体 */
export function riskyPoints(statuses: PointStatus[], limit = 5): PointStatus[] {
  return statuses
    .filter((s) => s.weight >= 3 && (s.level !== "mastered" || s.needsReview))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

/** これ以上見なくていい観点 */
export function settledPoints(statuses: PointStatus[]): PointStatus[] {
  return statuses.filter((s) => s.level === "mastered" && !s.needsReview);
}

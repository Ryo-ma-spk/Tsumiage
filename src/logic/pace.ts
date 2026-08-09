import type { Attempt, KnowledgePoint, PointStatus } from "../types";
import { daysBetween } from "./mastery";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 実績ペースを測る窓（日） */
const PACE_WINDOW_DAYS = 14;

/** これだけの日数で鮮度が切れる観点は「忘れる前」に拾う */
const IMMINENT_DAYS = 7;

/** 1セッションで出す観点の数 */
export const SESSION_SIZE = 5;

export interface PaceSummary {
  /** 出題範囲の重み合計 */
  totalWeight: number;
  /** 一度でも定着させた重み。すごろくの進んだ距離にあたり、後退しない */
  walkedWeight: number;

  /** 踏破率 0〜100。単調増加で、忘れても下がらない */
  progressPct: number;
  /** 踏破したぶんのうち、いま鮮度が残っている割合 0〜100 */
  conditionPct: number;
  /** 今のペースのまま進んだとき、受験日に鮮度が残っている見込みの割合 0〜100 */
  projectedPct: number;

  /** まだ一度も定着していない観点数 */
  remainingPoints: number;
  /** 踏破済みだが受験日までに鮮度が切れる観点数 */
  reviewDuePoints: number;

  daysLeft: number;

  /** 受験日までに触らないといけない重み（未踏破 + 復習が要るぶん） */
  demandWeight: number;
  /** 間に合わせるのに必要な1日あたりの重み */
  requiredPerDay: number;
  /** 直近14日の実測ペース */
  actualPerDay: number;
  /** 画面表示用: 必要な1日あたりの観点数 */
  requiredPointsPerDay: number;
  /** 画面表示用: 直近14日の1日あたりの観点数 */
  actualPointsPerDay: number;

  /** 必要ペースに対して足りているか */
  onTrack: boolean;
}

export function daysUntilExam(examDate: string, now: Date = new Date()): number {
  return Math.max(0, daysBetween(now, `${examDate}T00:00:00`));
}

/** 受験日までに鮮度が切れる（= もう一度触る必要がある）か */
function needsTouchBefore(status: PointStatus, examDate: string): boolean {
  if (!status.everMastered) return true;
  if (status.staleAt === null) return true; // 踏破後に落としている
  return daysBetween(status.staleAt, `${examDate}T00:00:00`) > 0;
}

export function summarize(
  statuses: PointStatus[],
  attempts: Attempt[],
  examDate: string,
  now: Date = new Date()
): PaceSummary {
  const totalWeight = statuses.reduce((sum, s) => sum + s.weight, 0);
  const walked = statuses.filter((s) => s.everMastered);
  const walkedWeight = walked.reduce((sum, s) => sum + s.weight, 0);

  const progressPct = totalWeight === 0 ? 0 : (walkedWeight / totalWeight) * 100;

  const liveWeight = walked.reduce((sum, s) => sum + s.weight * s.freshness, 0);
  const conditionPct = walkedWeight === 0 ? 0 : (liveWeight / walkedWeight) * 100;

  const daysLeft = daysUntilExam(examDate, now);

  // 受験日までに触らないといけない量 = 未踏破 + 受験日までに鮮度が切れるぶん
  const due = statuses.filter((s) => needsTouchBefore(s, examDate));
  const demandWeight = due.reduce((sum, s) => sum + s.weight, 0);
  const duePoints = due.length;

  const remainingPoints = statuses.filter((s) => !s.everMastered).length;
  const reviewDuePoints = duePoints - remainingPoints;

  const requiredPerDay = daysLeft === 0 ? demandWeight : demandWeight / daysLeft;

  // 実績ペース: 直近の窓で「新たに踏破した」か「鮮度を戻した」重み
  const windowStart = new Date(now.getTime() - PACE_WINDOW_DAYS * DAY_MS);
  const correctInWindow = new Set(
    attempts
      .filter(
        (a) =>
          a.correct &&
          new Date(a.at).getTime() >= windowStart.getTime() &&
          new Date(a.at).getTime() <= now.getTime()
      )
      .map((a) => a.pointId)
  );

  const gained = statuses.filter((s) => {
    const newlyWalked =
      s.firstMasteredAt !== null &&
      new Date(s.firstMasteredAt).getTime() >= windowStart.getTime();
    const refreshed = s.everMastered && correctInWindow.has(s.point.id);
    return newlyWalked || refreshed;
  });
  const gainedWeight = gained.reduce((sum, s) => sum + s.weight, 0);

  const firstAttempt = attempts.map((a) => a.at).sort()[0];
  const elapsed = firstAttempt
    ? Math.min(PACE_WINDOW_DAYS, Math.max(1, daysBetween(firstAttempt, now)))
    : PACE_WINDOW_DAYS;

  const actualPerDay = gainedWeight / elapsed;
  const actualPointsPerDay = gained.length / elapsed;

  // 受験日に鮮度が残る見込み = すでに持つぶん + 残り日数でこなせるぶん
  const holdsWeight = statuses
    .filter((s) => !needsTouchBefore(s, examDate))
    .reduce((sum, s) => sum + s.weight, 0);
  const capacityWeight = actualPerDay * daysLeft;
  const coveredWeight = Math.min(demandWeight, capacityWeight);

  const projectedWeight = Math.min(totalWeight, holdsWeight + coveredWeight);
  const projectedPct =
    totalWeight === 0 ? 0 : (projectedWeight / totalWeight) * 100;

  return {
    totalWeight,
    walkedWeight,
    progressPct,
    conditionPct,
    projectedPct,
    remainingPoints,
    reviewDuePoints,
    daysLeft,
    demandWeight,
    requiredPerDay,
    actualPerDay,
    requiredPointsPerDay: daysLeft === 0 ? duePoints : duePoints / daysLeft,
    actualPointsPerDay,
    onTrack: actualPerDay >= requiredPerDay,
  };
}

/**
 * やるべき観点を優先度順に並べる。
 *
 * 「何をやるか自分で決める」コストを消すのがこのアプリの役目なので、
 * 選定ルールはここに固定し、画面側では選ばせない。
 */
export function prioritize(
  statuses: PointStatus[],
  now: Date = new Date()
): PointStatus[] {
  const daysToStale = (s: PointStatus): number =>
    s.staleAt === null ? -1 : daysBetween(now, s.staleAt);

  const score = (s: PointStatus): number => {
    // 踏破したのに落ちている観点が最優先（積み上げを崩さない）
    if (s.everMastered && s.needsReview) return 0;
    if (s.level === "touched") return 1; // 一度つまずいた所
    if (s.level === "solved") return 2; // あと1回で定着
    // まだ切れていないが、もうすぐ切れる。忘れる前に触る
    if (s.level === "mastered" && daysToStale(s) <= IMMINENT_DAYS) return 3;
    if (s.level === "untouched") return 4;
    return 9; // 鮮度が残っている定着観点はいま出さない
  };

  return statuses
    .filter((s) => !s.locked && score(s) <= 4)
    .sort((a, b) => {
      const diff = score(a) - score(b);
      if (diff !== 0) return diff;

      // 復習系は切れるのが近い順
      if (score(a) === 0 || score(a) === 3) {
        const gap = daysToStale(a) - daysToStale(b);
        if (gap !== 0) return gap;
      }

      // 新しく進むぶんは、道の手前から。先に長い道が伸びるほうを優先する
      if (a.depth !== b.depth) return a.depth - b.depth;
      if (a.descendants !== b.descendants) return b.descendants - a.descendants;
      return b.weight - a.weight;
    });
}

/** 次にやるべき観点を1つだけ返す */
export function pickNext(
  statuses: PointStatus[],
  now: Date = new Date()
): PointStatus | null {
  return prioritize(statuses, now)[0] ?? null;
}

/** 1セッションで出す観点をそろえる */
export function buildQueue(
  statuses: PointStatus[],
  size = SESSION_SIZE,
  now: Date = new Date()
): KnowledgePoint[] {
  return prioritize(statuses, now)
    .slice(0, size)
    .map((s) => s.point);
}

/**
 * 本番で落としそうな観点。
 *
 * 一度は定着させたのに、受験日までに鮮度が切れる見込みのもの。
 * 「大丈夫だと思っていたほうを忘れる」を、起きる前に名前で出すための一覧。
 */
export function examRiskPoints(
  statuses: PointStatus[],
  examDate: string,
  limit = 5,
  now: Date = new Date()
): PointStatus[] {
  const daysToStale = (s: PointStatus): number =>
    s.staleAt === null ? -1 : daysBetween(now, s.staleAt);

  return statuses
    .filter((s) => s.everMastered && needsTouchBefore(s, examDate))
    .sort((a, b) => {
      // すでに切れているものが先、次に切れるのが近い順
      const gap = daysToStale(a) - daysToStale(b);
      if (gap !== 0) return gap;
      return b.weight - a.weight;
    })
    .slice(0, limit);
}

/** 何度も間違えている、まだ手の内に入っていない観点 */
export function weakPoints(statuses: PointStatus[], limit = 5): PointStatus[] {
  return statuses
    .filter((s) => !s.locked && !s.everMastered && s.level === "touched")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

/**
 * いま見なくていい観点。
 *
 * 「受験日まで絶対に忘れない」ではなく「今日わざわざ開く必要がない」。
 * 受験日が遠いほど前者は誰も満たせないので、日々の判断に使えるのは後者のほう。
 */
export function settledPoints(statuses: PointStatus[]): PointStatus[] {
  return statuses.filter((s) => s.level === "mastered" && s.freshness > 0);
}

import type { Attempt, Faculty, KnowledgePoint, PointStatus } from "../types";
import { buildStatuses, daysBetween } from "./mastery";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 実績ペースを測る窓（日） */
const PACE_WINDOW_DAYS = 14;

/**
 * 実績ペースを割るときの日数の下限。
 *
 * 1日ぶんの結果をそのまま日割りすると、始めた日に5問やっただけで
 * 「1日5観点のペース」になり、着地予測が 100% に張り付く。
 * 1日はまだペースではないので、最低これだけの日数で均す。
 */
const PACE_MIN_DAYS = 3;

/** これだけの日数で鮮度が切れる観点は「忘れる前」に拾う */
const IMMINENT_DAYS = 7;

/** 1セッションで出す観点の数 */
export const SESSION_SIZE = 5;

/**
 * 1セッションのうち復習にあてる枠。残りは新規にあてる。
 *
 * 優先度順にそのまま並べると、しばらく空けたあとは復習だけで埋まって
 * 道が一歩も進まない。何日空けても必ず新しい観点を踏むように、
 * 枠のほうを先に決めておく。
 */
export const SESSION_REVIEW_SLOTS = 3;

/** 1日の区切りにする時刻。深夜に勉強する層がいるので 0:00 では切らない */
export const DAY_START_HOUR = 4;

/** 今日ぶんの下限。1セッションぶんは必ず出す */
export const TODAY_MIN_POINTS = 5;
/** 今日ぶんの上限。これ以上は1日で積んでも続かない */
export const TODAY_MAX_POINTS = 10;

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
    ? Math.min(
        PACE_WINDOW_DAYS,
        Math.max(PACE_MIN_DAYS, daysBetween(firstAttempt, now))
      )
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

/**
 * 1セッションで出す観点をそろえる。
 *
 * 復習と新規を別の列にして、それぞれに枠を割り当てる。片方が枯れたら
 * もう片方で埋める。優先度の順序そのものは `prioritize()` のままで、
 * ここでやるのは枠の配分だけ。
 */
export function buildQueue(
  statuses: PointStatus[],
  size = SESSION_SIZE,
  now: Date = new Date()
): KnowledgePoint[] {
  const ordered = prioritize(statuses, now);
  const review = ordered.filter((s) => s.everMastered);
  const fresh = ordered.filter((s) => !s.everMastered);

  const reviewQuota = Math.round((size * SESSION_REVIEW_SLOTS) / SESSION_SIZE);
  const freshQuota = size - reviewQuota;

  // 片方が足りなければ、もう片方から埋めて枠を使い切る
  const takeReview = Math.min(review.length, Math.max(reviewQuota, size - fresh.length));
  const takeFresh = Math.min(fresh.length, Math.max(freshQuota, size - takeReview));

  const picked = { review: review.slice(0, takeReview), fresh: fresh.slice(0, takeFresh) };

  // 復習だけが並ぶ入りにならないよう、残り枚数の多いほうから交互に出す
  const merged: PointStatus[] = [];
  let r = 0;
  let f = 0;
  while (r < picked.review.length || f < picked.fresh.length) {
    const restR = picked.review.length - r;
    const restF = picked.fresh.length - f;
    if (restF === 0 || (restR > 0 && restR >= restF)) merged.push(picked.review[r++]);
    else merged.push(picked.fresh[f++]);
  }

  return merged.slice(0, size).map((s) => s.point);
}

/** その時刻が属する「学習日」の始まり */
export function studyDayStart(now: Date = new Date()): Date {
  const d = new Date(now);
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
  d.setHours(DAY_START_HOUR, 0, 0, 0);
  return d;
}

export interface TodaySummary {
  /** 今日踏む観点の目標数 */
  goal: number;
  /** 今日すでに触った観点の数 */
  done: number;
  completed: boolean;
}

/**
 * 今日ぶんの目標と進み具合。
 *
 * 目標は「その日の始まりの状態」から出して、日中は動かさない。
 * 途中で復習が切れて目標が伸びると、終わったはずの今日ぶんが
 * 未達に戻ってしまうため。
 *
 * 達成の数え方は正誤を問わない。間違えた日も「やった」に数える。
 */
export function summarizeToday(
  points: KnowledgePoint[],
  attempts: Attempt[],
  faculty: Faculty | null,
  examDate: string,
  now: Date = new Date()
): TodaySummary {
  const dayStart = studyDayStart(now);
  const dayStartMs = dayStart.getTime();

  // 今日の判定を混ぜずに、その日の始まりの状態だけで目標を決める
  const before = attempts.filter((a) => new Date(a.at).getTime() < dayStartMs);
  const openingStatuses = buildStatuses(points, before, faculty, dayStart);
  const inScope = new Set(openingStatuses.map((s) => s.point.id));

  const daysLeft = daysUntilExam(examDate, dayStart);
  const duePoints = openingStatuses.filter((s) => needsTouchBefore(s, examDate)).length;
  const perDay = daysLeft === 0 ? duePoints : duePoints / daysLeft;

  const goal = Math.min(
    TODAY_MAX_POINTS,
    Math.max(TODAY_MIN_POINTS, Math.ceil(perDay))
  );

  const touchedToday = new Set(
    attempts
      .filter((a) => new Date(a.at).getTime() >= dayStartMs && inScope.has(a.pointId))
      .map((a) => a.pointId)
  );

  return { goal, done: touchedToday.size, completed: touchedToday.size >= goal };
}

/**
 * 間に合わせるのに、1日あと何観点ぶん増やす必要があるか。
 *
 * 「足りない」とだけ言われても動けないので、差分で出す。
 * 足りていれば 0。
 */
export function dailyShortfall(summary: PaceSummary): number {
  const gap = summary.requiredPointsPerDay - summary.actualPointsPerDay;
  return gap <= 0 ? 0 : Math.ceil(gap);
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

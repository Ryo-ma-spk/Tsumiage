import type {
  Attempt,
  Faculty,
  KnowledgePoint,
  MasteryLevel,
  PointStatus,
} from "../types";

/** 定着と判定するために必要な正答回数 */
const MASTERED_CORRECT_COUNT = 2;
/** 初回正答から最終正答までにこれだけ日が空いていないと定着とみなさない */
const MASTERED_SPAN_DAYS = 3;
/** 定着後この日数が経つと復習対象に戻す（忘却の反映） */
const REVIEW_AFTER_DAYS = 21;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(a: string | Date, b: string | Date): number {
  const t1 = new Date(a).getTime();
  const t2 = new Date(b).getTime();
  return Math.floor((t2 - t1) / DAY_MS);
}

/**
 * 解答履歴だけから到達度を計算する。
 * 「チェックを入れた」という自己申告は入力に含めない。
 */
export function evaluate(
  attempts: Attempt[],
  now: Date = new Date()
): { level: MasteryLevel; needsReview: boolean; correctCount: number } {
  if (attempts.length === 0) {
    return { level: "untouched", needsReview: false, correctCount: 0 };
  }

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
  const corrects = sorted.filter((a) => a.correct);
  const correctCount = corrects.length;

  if (correctCount === 0) {
    return { level: "touched", needsReview: false, correctCount: 0 };
  }

  const last = sorted[sorted.length - 1];
  // 直近で間違えているなら定着とは呼ばない
  if (!last.correct) {
    return { level: "touched", needsReview: false, correctCount };
  }

  const firstCorrect = corrects[0];
  const lastCorrect = corrects[corrects.length - 1];
  const span = daysBetween(firstCorrect.at, lastCorrect.at);

  const isMastered =
    correctCount >= MASTERED_CORRECT_COUNT && span >= MASTERED_SPAN_DAYS;

  if (!isMastered) {
    return { level: "solved", needsReview: false, correctCount };
  }

  // 定着していても放置されていれば復習対象に戻す
  const sinceLast = daysBetween(lastCorrect.at, now);
  return {
    level: "mastered",
    needsReview: sinceLast >= REVIEW_AFTER_DAYS,
    correctCount,
  };
}

/** 先行観点がすべて solved 以上なら開放 */
function isUnlocked(
  point: KnowledgePoint,
  levelById: Map<string, MasteryLevel>
): boolean {
  return point.prereqIds.every((id) => {
    const lv = levelById.get(id);
    // 志望校の絞り込みで除外された先行観点は条件から外す
    if (lv === undefined) return true;
    return lv === "solved" || lv === "mastered";
  });
}

/** 志望学部で出題される観点だけに絞り込む */
export function filterByFaculty(
  points: KnowledgePoint[],
  faculty: Faculty | null
): KnowledgePoint[] {
  if (!faculty) return points;
  return points.filter((p) => {
    if (!faculty.subjectIds.includes(p.subjectId)) return false;
    // 重み0は「この大学では出ない」の意味
    return faculty.emphasis?.[p.id] !== 0;
  });
}

/** 志望学部の重み補正を適用した頻出度 */
export function weightOf(point: KnowledgePoint, faculty: Faculty | null): number {
  const override = faculty?.emphasis?.[point.id];
  return override ?? point.weight;
}

/**
 * 絞り込み済みの観点それぞれについて到達度・開放状態・重みを計算する。
 * 画面はすべてこの結果だけを見る。
 */
export function buildStatuses(
  points: KnowledgePoint[],
  attempts: Attempt[],
  faculty: Faculty | null,
  now: Date = new Date()
): PointStatus[] {
  const scoped = filterByFaculty(points, faculty);

  const attemptsByPoint = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const list = attemptsByPoint.get(a.pointId);
    if (list) list.push(a);
    else attemptsByPoint.set(a.pointId, [a]);
  }

  const evaluated = scoped.map((point) => {
    const pointAttempts = attemptsByPoint.get(point.id) ?? [];
    const { level, needsReview, correctCount } = evaluate(pointAttempts, now);
    const lastAttemptAt =
      pointAttempts.length > 0
        ? pointAttempts
            .map((a) => a.at)
            .sort()
            .slice(-1)[0]
        : null;
    return { point, level, needsReview, correctCount, lastAttemptAt };
  });

  const levelById = new Map(evaluated.map((e) => [e.point.id, e.level]));

  return evaluated.map((e) => ({
    ...e,
    locked: !isUnlocked(e.point, levelById),
    weight: weightOf(e.point, faculty),
  }));
}

export const LEVEL_LABEL: Record<MasteryLevel, string> = {
  untouched: "未着手",
  touched: "あやしい",
  solved: "解けた",
  mastered: "定着",
};

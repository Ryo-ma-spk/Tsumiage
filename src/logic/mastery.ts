import type {
  Attempt,
  Faculty,
  KnowledgePoint,
  MasteryLevel,
  PointStatus,
} from "../types";
import { analyzeGraph } from "./graph";

/** 定着と判定するために必要な連続正答の回数 */
const MASTERED_CORRECT_COUNT = 2;
/** 直前の正答からこれだけ日が空いていないと定着とみなさない */
const MASTERED_SPAN_DAYS = 3;

/** 定着直後に見込む保持日数の下限 */
const RETENTION_MIN_DAYS = 4;
/** 保持できた間隔は、次はこの倍率まで伸びると見込む */
const RETENTION_GROWTH = 2.2;
/** これ以上先は予測しない（予測が当たらなくなる範囲） */
const RETENTION_MAX_DAYS = 120;
/** 一度忘れた観点は保持期間を割り引く。忘れた回数だけ掛かる */
const LAPSE_DISCOUNT = 0.6;

/**
 * 想起にかかった時間の区切り（ミリ秒）。
 *
 * 観点を見てから頭の中で答えを作るので、まじめにやれば数秒はかかる。
 * ここより速い判定は「思い出せた」証拠ではなく「想起していない」疑いなので、
 * 保持日数を伸ばさない。速いほど良いという単調な関係にはしない。
 */
const LATENCY_SKIPPED_MS = 1_500;
/** ここまでに出たなら即座に思い出せたとみなす */
const LATENCY_QUICK_MS = 8_000;
/** ここを超えたら難産 */
const LATENCY_SLOW_MS = 25_000;
/** これを超えたら別のことをしていたとみなして補正しない */
const LATENCY_ABANDONED_MS = 120_000;

/**
 * 「完璧」として振ったときに保持日数へ掛ける倍率。
 *
 * ここは倍率であって、忘却からの離脱ではない。列から消す信号は危険で、
 * 間隔を動かすだけの信号は安全、という線を守るための形。
 * 判定が甘くても、遅れて戻ってきて実際の結果で上書きされる。
 */
const PERFECT_BONUS = 1.5;

/**
 * 想起にかかった時間から保持日数の補正倍率を出す。
 *
 * 問題文を持たないぶんこの信号は弱いので、幅は狭めにとってある。
 * 計測できていない履歴（古いデータ）は補正なし。
 */
export function latencyFactor(latencyMs: number | undefined): number {
  if (latencyMs === undefined) return 1;
  if (latencyMs > LATENCY_ABANDONED_MS) return 1;
  if (latencyMs < LATENCY_SKIPPED_MS) return 1;
  if (latencyMs < LATENCY_QUICK_MS) return 1.2;
  if (latencyMs < LATENCY_SLOW_MS) return 1;
  return 0.9;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(value: string | Date): number {
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * 暦日で数えた日数の差。
 *
 * 経過ミリ秒ではなく日付で数える。夜に解いた人と朝に解いた人で
 * 「3日あけた」の判定が割れないようにするため。
 */
export function daysBetween(a: string | Date, b: string | Date): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
}

function addDays(value: string | Date, days: number): string {
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export interface Evaluation {
  level: MasteryLevel;
  /** 一度でも定着に到達したか。忘れても取り消されない */
  everMastered: boolean;
  /** 初めて定着に到達した日 */
  firstMasteredAt: string | null;
  /** 鮮度が切れると予測される日。いま定着していなければ null */
  staleAt: string | null;
  /** いまの鮮度 0〜1 */
  freshness: number;
  needsReview: boolean;
  correctCount: number;
}

/** 直前の正答から数えて、この正答で定着に届くか */
function reachesMastery(streak: Attempt[]): boolean {
  if (streak.length < MASTERED_CORRECT_COUNT) return false;
  const last = streak[streak.length - 1];
  const prev = streak[streak.length - 2];
  return daysBetween(prev.at, last.at) >= MASTERED_SPAN_DAYS;
}

/**
 * 次に忘れるまでの日数を見込む。
 *
 * 「実際に保持できた間隔」を土台にして、それより少し先まで持つと予測する。
 * 過去に忘れた回数だけ割り引くので、何度も落としている観点は早く戻ってくる。
 * 直近の判定にかかった時間でも微調整する。
 */
function predictRetentionDays(streak: Attempt[], lapses: number): number {
  const last = streak[streak.length - 1];
  const prev = streak[streak.length - 2];
  const heldDays = Math.max(daysBetween(prev.at, last.at), MASTERED_SPAN_DAYS);

  const predicted =
    heldDays *
    RETENTION_GROWTH *
    LAPSE_DISCOUNT ** lapses *
    latencyFactor(last.latencyMs) *
    (last.perfect ? PERFECT_BONUS : 1);
  return Math.min(
    RETENTION_MAX_DAYS,
    Math.max(RETENTION_MIN_DAYS, Math.round(predicted))
  );
}

/**
 * 判定の履歴だけから到達度と鮮度を計算する。
 *
 * 1回の判定では到達度が動かないのが肝。定着とみなすには、間隔をあけて
 * 複数回続く必要がある。読んだだけで「できた」と振った観点は、
 * 間隔が空いた2回目で落ちるので、時間が申告を検証してくれる。
 */
export function evaluate(
  attempts: Attempt[],
  now: Date = new Date()
): Evaluation {
  const empty: Evaluation = {
    level: "untouched",
    everMastered: false,
    firstMasteredAt: null,
    staleAt: null,
    freshness: 0,
    needsReview: false,
    correctCount: 0,
  };

  if (attempts.length === 0) return empty;

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );

  // 履歴を順に再生して、定着に到達した瞬間と忘れた回数を数える
  let streak: Attempt[] = [];
  let lapses = 0;
  let firstMasteredAt: string | null = null;
  let masteredInStreak = false;
  let correctCount = 0;

  for (const attempt of sorted) {
    if (attempt.correct) {
      correctCount += 1;
      streak.push(attempt);
      if (!masteredInStreak && reachesMastery(streak)) {
        masteredInStreak = true;
        if (firstMasteredAt === null) firstMasteredAt = attempt.at;
      }
    } else {
      // 定着まで積み上げたものを落とした場合だけ「忘れた」と数える
      if (masteredInStreak) lapses += 1;
      streak = [];
      masteredInStreak = false;
    }
  }

  const everMastered = firstMasteredAt !== null;

  if (correctCount === 0) {
    return { ...empty, level: "touched", everMastered, firstMasteredAt };
  }

  // 直近で間違えているなら定着とは呼ばない
  if (streak.length === 0) {
    return {
      ...empty,
      level: "touched",
      everMastered,
      firstMasteredAt,
      correctCount,
      // 一度踏破した観点を落としているので、復習の対象には戻す
      needsReview: everMastered,
    };
  }

  if (!masteredInStreak) {
    return {
      ...empty,
      level: "solved",
      everMastered,
      firstMasteredAt,
      correctCount,
      needsReview: everMastered,
    };
  }

  const lastCorrect = streak[streak.length - 1];
  const retentionDays = predictRetentionDays(streak, lapses);
  const staleAt = addDays(lastCorrect.at, retentionDays);

  const daysLeft = daysBetween(now, staleAt);
  const freshness = Math.max(0, Math.min(1, daysLeft / retentionDays));

  return {
    level: "mastered",
    everMastered: true,
    firstMasteredAt,
    staleAt,
    freshness,
    needsReview: freshness <= 0,
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
 * 絞り込み済みの観点それぞれについて到達度・鮮度・開放状態・重みを計算する。
 * 画面はすべてこの結果だけを見る。
 *
 * 並び順は観点マスタの記述順ではなく、依存関係から導いた順序になる。
 */
export function buildStatuses(
  points: KnowledgePoint[],
  attempts: Attempt[],
  faculty: Faculty | null,
  now: Date = new Date()
): PointStatus[] {
  const scoped = filterByFaculty(points, faculty);
  const { order, depthById, descendantsById } = analyzeGraph(scoped);

  const attemptsByPoint = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const list = attemptsByPoint.get(a.pointId);
    if (list) list.push(a);
    else attemptsByPoint.set(a.pointId, [a]);
  }

  const evaluated = order.map((point) => {
    const pointAttempts = attemptsByPoint.get(point.id) ?? [];
    const evaluation = evaluate(pointAttempts, now);
    const lastAttemptAt =
      pointAttempts.length > 0
        ? pointAttempts
            .map((a) => a.at)
            .sort()
            .slice(-1)[0]
        : null;
    return { point, ...evaluation, lastAttemptAt };
  });

  const levelById = new Map(evaluated.map((e) => [e.point.id, e.level]));

  return evaluated.map((e) => ({
    ...e,
    locked: !isUnlocked(e.point, levelById),
    weight: weightOf(e.point, faculty),
    depth: depthById.get(e.point.id) ?? 0,
    descendants: descendantsById.get(e.point.id) ?? 0,
  }));
}

export const LEVEL_LABEL: Record<MasteryLevel, string> = {
  untouched: "未着手",
  touched: "あやしい",
  solved: "できた",
  mastered: "定着",
};

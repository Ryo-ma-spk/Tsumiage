import type { Attempt, KnowledgePoint, PointStatus } from "../types";
import { daysBetween } from "./mastery";

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

  /**
   * 本番予測を出していいか。
   *
   * 踏破が1つも無いうちは実績ペースが 0 にしかならず、予測は必ず 0% になる。
   * 始めたばかりの人に赤い 0% を見せるのは、事実としても間違っている。
   * 「まだ測れない」と「足りない」は別のことなので、混ぜない。
   */
  measurable: boolean;
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
    measurable: walkedWeight > 0,
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

  /**
   * その観点の鍵（先行観点）を、最後に触った時刻。
   *
   * 直前に開けたばかりのものほど大きくなるので、これを優先すると
   * 「開いた続きをそのままやる」順になる。
   */
  const lastSeen = new Map(
    statuses.map((s) => [
      s.point.id,
      s.lastAttemptAt ? new Date(s.lastAttemptAt).getTime() : 0,
    ])
  );
  const openedAt = (s: PointStatus): number =>
    s.point.prereqIds.reduce((max, id) => Math.max(max, lastSeen.get(id) ?? 0), 0);

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
    // 土台が未達でも候補から外さない。順番が下がるだけで、やりたい人はやれる
    .filter((s) => score(s) <= 4)
    .sort((a, b) => {
      const diff = score(a) - score(b);
      if (diff !== 0) return diff;

      // 復習系は切れるのが近い順
      if (score(a) === 0 || score(a) === 3) {
        const gap = daysToStale(a) - daysToStale(b);
        if (gap !== 0) return gap;
      }

      // 直前に開けた続きを先に出す。
      // 深さ順だけで並べると全体を横なめする幅優先になり、
      // 一次関数の翌日に平面図形が出て、二次関数はずっと先、という順になる。
      // 工程がつながっているほうが学習効率が高いので、こちらを先に見る。
      if (openedAt(a) !== openedAt(b)) return openedAt(b) - openedAt(a);

      // まだ何も触っていないときはここに落ちる。道の手前から、
      // 先に長い道が伸びるほうを優先する
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
 * 候補を、工程がつながる順に取り出す。
 *
 * 優先度順の上位から N 枚とるだけだと、1回のセッションの中で
 * 一次関数と二次関数がばらばらの日に散る。直前に出したものを土台にする
 * 観点が候補にあれば、それを次に continue する。
 */
function walkChain(candidates: PointStatus[], size: number): PointStatus[] {
  const rest = [...candidates];
  const out: PointStatus[] = [];

  while (out.length < size && rest.length > 0) {
    const prev = out[out.length - 1];
    const next = prev
      ? rest.findIndex((s) => s.point.prereqIds.includes(prev.point.id))
      : -1;
    out.push(rest.splice(next >= 0 ? next : 0, 1)[0]);
  }
  return out;
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

  const picked = {
    review: review.slice(0, takeReview),
    // 新しく進むぶんは、鎖がつながる順に取る
    fresh: walkChain(fresh, takeFresh),
  };

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

/**
 * このセッションで確認カードに回す観点を1つ選ぶ。
 *
 * 自己申告では「逆で覚えていた」を拾えない。逆に覚えている人は流暢に、
 * 確信をもって思い出すので、即答して「完璧」に振り、保持日数が伸びて
 * いちばん出てこなくなる。だから狙うのは、**申告がいちばん強かったもの**。
 *
 * 全部を確認すると問題集になるので、1セッション1枚だけにする。
 */
export function pickAudit(
  queue: KnowledgePoint[],
  statuses: PointStatus[],
  attempts: Attempt[],
  checkableIds: Set<string>
): string | null {
  const statusById = new Map(statuses.map((s) => [s.point.id, s]));

  /** 最後に確認カードを出した時刻。まだなら 0 */
  const lastAudit = new Map<string, number>();
  /** 直近の申告が「完璧」だったか */
  const claimedPerfect = new Map<string, boolean>();

  for (const a of [...attempts].sort((x, y) => x.at.localeCompare(y.at))) {
    const t = new Date(a.at).getTime();
    if (a.audit) lastAudit.set(a.pointId, t);
    if (a.correct) claimedPerfect.set(a.pointId, a.perfect === true);
  }

  const candidates = queue
    .filter((p) => checkableIds.has(p.id))
    .filter((p) => statusById.get(p.id)?.everMastered)
    .sort((a, b) => {
      // 「完璧」と言い切っているものほど、外れていたときの害が大きい
      const pa = claimedPerfect.get(a.id) ? 0 : 1;
      const pb = claimedPerfect.get(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      // 長く確認していないものから
      return (lastAudit.get(a.id) ?? 0) - (lastAudit.get(b.id) ?? 0);
    });

  return candidates[0]?.id ?? null;
}

/**
 * 勘違いの疑いがある観点。
 *
 * 定着させたはずなのに、確認カードで外したもの。忘却なら時間が自己修正するが、
 * 勘違いは安定していて自己修正しないので、名前で出して当たり直させる。
 */
export function suspectedMisconceptions(
  statuses: PointStatus[],
  attempts: Attempt[]
): PointStatus[] {
  const lastAuditResult = new Map<string, boolean>();
  for (const a of [...attempts].sort((x, y) => x.at.localeCompare(y.at))) {
    if (a.audit) lastAuditResult.set(a.pointId, a.correct);
  }

  return statuses.filter(
    (s) => s.everMastered && lastAuditResult.get(s.point.id) === false
  );
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
    .filter((s) => !s.everMastered && s.level === "touched")
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

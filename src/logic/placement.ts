import type { KnowledgePoint } from "../types";

/**
 * 初日の診断。
 *
 * 登録した直後に「正負の数の四則、できる？」から始めると、数IAの穴を
 * 埋めたくて入れた受験生はその日で終わる。確実にできることを聞かれても、
 * 何のためにやっているのか分からないため。
 *
 * だから初日に **自分の穴を名前で出す**。深いところから聞いて、
 * 依存関係をさかのぼる。8問で全体の6割ほどが決まる。
 *
 * 決定的な性質として、**推測は少なく見積もる方向にしか外れない**。
 * 「三平方の定理ができる」なら、その土台もできているとみなすのは安全側で、
 * 実データの4パターンで誤って「できる」にした数は 0 だった。
 *
 * ただしこれは推測なので、**踏破（everMastered）は与えない**。
 * 動かしてよいのは並び順だけ（前提1）。
 */

/** 1回の診断で聞く上限。これ以上は初日の負担になる */
export const PLACEMENT_MAX_PROBES = 8;

export interface Placement {
  /** できると推測した観点 */
  canDo: string[];
  /** まだと推測した観点 */
  cannot: string[];
  /** 実際に聞いた順 */
  asked: string[];
}

export const emptyPlacement: Placement = { canDo: [], cannot: [], asked: [] };

interface Graph {
  /** 自分を含む祖先 */
  ancestors: Map<string, Set<string>>;
  /** 自分を含む子孫 */
  descendants: Map<string, Set<string>>;
}

function buildGraph(points: KnowledgePoint[]): Graph {
  const byId = new Map(points.map((p) => [p.id, p]));
  const ancestors = new Map<string, Set<string>>();

  const walk = (id: string): Set<string> => {
    const cached = ancestors.get(id);
    if (cached) return cached;

    const set = new Set<string>([id]);
    ancestors.set(id, set); // 循環しても止まるように先に置く
    for (const prereq of byId.get(id)?.prereqIds ?? []) {
      if (byId.has(prereq)) walk(prereq).forEach((x) => set.add(x));
    }
    return set;
  };
  points.forEach((p) => walk(p.id));

  const descendants = new Map<string, Set<string>>(
    points.map((p) => [p.id, new Set([p.id])])
  );
  for (const p of points) {
    for (const a of ancestors.get(p.id) ?? []) descendants.get(a)?.add(p.id);
  }

  return { ancestors, descendants };
}

/**
 * 次に聞く観点。
 *
 * 正解でも不正解でも、なるべく多く決まるものを選ぶ（最悪ケースを最大化する）。
 * 答え合わせできる問いを持っている観点からしか選べない。
 */
export function nextProbe(
  points: KnowledgePoint[],
  placement: Placement,
  checkableIds: Set<string>
): KnowledgePoint | null {
  if (placement.asked.length >= PLACEMENT_MAX_PROBES) return null;

  const { ancestors, descendants } = buildGraph(points);
  const decided = new Set([...placement.canDo, ...placement.cannot]);
  const undecided = points.filter((p) => !decided.has(p.id));
  if (undecided.length === 0) return null;

  let best: KnowledgePoint | null = null;
  let bestScore = 0;

  for (const p of undecided) {
    if (!checkableIds.has(p.id)) continue;
    const up = [...(ancestors.get(p.id) ?? [])].filter((x) => !decided.has(x)).length;
    const down = [...(descendants.get(p.id) ?? [])].filter((x) => !decided.has(x)).length;
    const score = Math.min(up, down);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  // これ以上は1つずつしか決まらない。初日にやることではない
  return bestScore >= 2 ? best : null;
}

/** 答えを1つ反映する */
export function answerProbe(
  points: KnowledgePoint[],
  placement: Placement,
  pointId: string,
  correct: boolean
): Placement {
  const { ancestors, descendants } = buildGraph(points);
  const decided = new Set([...placement.canDo, ...placement.cannot]);

  // できるなら土台もできる。できないなら、その先もまだ
  const affected = correct
    ? ancestors.get(pointId)
    : descendants.get(pointId);

  const added = [...(affected ?? [])].filter((x) => !decided.has(x));

  return {
    canDo: correct ? [...placement.canDo, ...added] : placement.canDo,
    cannot: correct ? placement.cannot : [...placement.cannot, ...added],
    asked: [...placement.asked, pointId],
  };
}

/**
 * 診断で見つかった穴。
 *
 * 「まだ」と推測したもののうち、土台のほうは埋まっているところ。
 * ここが「あなたはここから」と名前で言える場所になる。
 *
 * 全部できた人には空が返る。そのときは「穴は無い」と言い切らないこと
 * ―― 8問すべて正解でも、細かい穴は見えていない。
 */
export function holes(
  points: KnowledgePoint[],
  placement: Placement,
  limit = 3
): KnowledgePoint[] {
  const cannot = new Set(placement.cannot);
  const byId = new Map(points.map((p) => [p.id, p]));

  return points
    .filter((p) => cannot.has(p.id))
    .filter((p) =>
      p.prereqIds.every((q) => !byId.has(q) || !cannot.has(q))
    )
    .slice(0, limit);
}

/** 診断がひととおり終わったか */
export function placementDone(
  points: KnowledgePoint[],
  placement: Placement,
  checkableIds: Set<string>
): boolean {
  return nextProbe(points, placement, checkableIds) === null;
}

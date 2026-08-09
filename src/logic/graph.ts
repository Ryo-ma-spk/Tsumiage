import type { KnowledgePoint } from "../types";

/**
 * 観点の依存関係（prereqIds）から、道の順序と位置を出す。
 *
 * マップの並び順も優先度づけの並び順も、ここが出した結果だけを使う。
 * 配列に書いた順ではなく依存関係が順序を決める、というのがこのファイルの役目。
 */
export interface GraphInfo {
  /** 依存を満たす順に並べ替えた観点。マップの一本道の順序そのもの */
  order: KnowledgePoint[];
  /** 依存グラフ上の深さ。0 は先行観点を持たない出発点 */
  depthById: Map<string, number>;
  /** その観点を踏むことで先に進める観点の総数（推移的な子孫の数） */
  descendantsById: Map<string, number>;
}

/**
 * 依存を満たす順に並べる（トポロジカルソート）。
 *
 * 同時に開放される観点が複数あるときは、観点マスタに書かれた順を保つ。
 * これで単元のまとまりが崩れず、かつ順序は依存関係から導かれた状態になる。
 */
function topologicalOrder(
  points: KnowledgePoint[],
  prereqsById: Map<string, string[]>
): KnowledgePoint[] {
  const indexById = new Map(points.map((p, i) => [p.id, i]));
  const remaining = new Map<string, number>();
  for (const p of points) {
    remaining.set(p.id, prereqsById.get(p.id)?.length ?? 0);
  }

  // 先行観点 -> それを必要とする観点
  const dependents = new Map<string, string[]>();
  for (const p of points) {
    for (const prereq of prereqsById.get(p.id) ?? []) {
      const list = dependents.get(prereq);
      if (list) list.push(p.id);
      else dependents.set(prereq, [p.id]);
    }
  }

  const pointById = new Map(points.map((p) => [p.id, p]));
  const ready = points
    .filter((p) => (remaining.get(p.id) ?? 0) === 0)
    .map((p) => p.id);

  const ordered: KnowledgePoint[] = [];
  const taken = new Set<string>();

  while (ready.length > 0) {
    // 開放済みのうち、マスタでいちばん先に書かれているものから取る
    ready.sort((a, b) => (indexById.get(a) ?? 0) - (indexById.get(b) ?? 0));
    const id = ready.shift() as string;
    if (taken.has(id)) continue;
    taken.add(id);

    const point = pointById.get(id);
    if (point) ordered.push(point);

    for (const next of dependents.get(id) ?? []) {
      const left = (remaining.get(next) ?? 0) - 1;
      remaining.set(next, left);
      if (left === 0) ready.push(next);
    }
  }

  // 依存が循環している観点が残っても道からは落とさない
  for (const p of points) {
    if (!taken.has(p.id)) ordered.push(p);
  }

  return ordered;
}

/**
 * 依存グラフを解析する。
 *
 * `points` は志望校で絞り込んだあとの集合を渡す。絞り込みで消えた先行観点は
 * 依存から除く（開放条件と同じ扱い。`isUnlocked` を参照）。
 */
export function analyzeGraph(points: KnowledgePoint[]): GraphInfo {
  const present = new Set(points.map((p) => p.id));

  const prereqsById = new Map<string, string[]>(
    points.map((p) => [p.id, p.prereqIds.filter((id) => present.has(id))])
  );

  const order = topologicalOrder(points, prereqsById);

  const depthById = new Map<string, number>();
  for (const p of order) {
    const prereqs = prereqsById.get(p.id) ?? [];
    const depth =
      prereqs.length === 0
        ? 0
        : Math.max(...prereqs.map((id) => (depthById.get(id) ?? 0) + 1));
    depthById.set(p.id, depth);
  }

  const children = new Map<string, string[]>();
  for (const p of points) {
    for (const prereq of prereqsById.get(p.id) ?? []) {
      const list = children.get(prereq);
      if (list) list.push(p.id);
      else children.set(prereq, [p.id]);
    }
  }

  // 子孫の集合を後ろから前に向かって畳む（order は依存を満たす順なので逆順で解ける）
  const descendantSets = new Map<string, Set<string>>();
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i].id;
    const set = new Set<string>();
    for (const child of children.get(id) ?? []) {
      set.add(child);
      for (const grand of descendantSets.get(child) ?? []) set.add(grand);
    }
    descendantSets.set(id, set);
  }

  const descendantsById = new Map<string, number>();
  for (const [id, set] of descendantSets) descendantsById.set(id, set.size);

  return { order, depthById, descendantsById };
}

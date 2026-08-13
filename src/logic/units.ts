import type { PointStatus } from "../types";

/**
 * 単元ごとのまとまり。
 *
 * 全体（55個）を見出しにすると、同じ画面が上位層には燃料に、
 * 下位層には壁になる。分母は「いま手の届く単元」に置き替えるので、
 * その単位をここで作る。単元は21個・1つ2〜4個なので、
 * どの学力でも「次の完成」までの距離が同じくらいになる。
 */
export interface UnitSummary {
  unit: string;
  points: PointStatus[];
  total: number;
  /** 積んだ数。一度でも定着したもの（減らない） */
  done: number;
  /** 全部積んだ。この印は薄れても外れない */
  complete: boolean;
  /** そろうまであと何個 */
  remaining: number;
  /** まだ1つも手をつけていない */
  untouched: boolean;
}

/** 観点の並び順（依存から導いた順）を保ったまま、単元ごとにまとめる */
export function summarizeUnits(statuses: PointStatus[]): UnitSummary[] {
  const order: string[] = [];
  const byUnit = new Map<string, PointStatus[]>();

  for (const s of statuses) {
    const list = byUnit.get(s.point.unit);
    if (list) list.push(s);
    else {
      byUnit.set(s.point.unit, [s]);
      order.push(s.point.unit);
    }
  }

  return order.map((unit) => {
    const points = byUnit.get(unit) ?? [];
    const done = points.filter((s) => s.everMastered).length;
    return {
      unit,
      points,
      total: points.length,
      done,
      complete: done === points.length && points.length > 0,
      remaining: points.length - done,
      untouched: points.every((s) => s.lastAttemptAt === null),
    };
  });
}

/**
 * 見出しに出す単元。
 *
 * 次にやる観点が入っている単元をそのまま使う。「いまやること」と
 * 「いま埋めている場所」がずれないようにするため。
 */
export function focusUnit(
  units: UnitSummary[],
  next: PointStatus | null
): UnitSummary | null {
  if (next) {
    const found = units.find((u) => u.unit === next.point.unit);
    if (found) return found;
  }
  return units.find((u) => !u.complete) ?? units[0] ?? null;
}

export interface Dex {
  /** あと1つでそろう。ここを最初に見せる */
  near: UnitSummary[];
  /** 手をつけていて、まだ途中 */
  active: UnitSummary[];
  /** そろった */
  complete: UnitSummary[];
  /** まだ手つかず。壁になるので最後に置く */
  untouched: UnitSummary[];
}

/**
 * 図鑑の並び。近い順に置き、手つかずは最後にする。
 *
 * 記述順に並べると、始めたばかりの人には空のマスが先に来て壁になる。
 * 「もうすぐそろう」を上に置くと、どの学力でも最初に見えるのが達成になる。
 */
export function buildDex(units: UnitSummary[]): Dex {
  const near: UnitSummary[] = [];
  const active: UnitSummary[] = [];
  const complete: UnitSummary[] = [];
  const untouched: UnitSummary[] = [];

  for (const u of units) {
    if (u.complete) complete.push(u);
    else if (u.untouched) untouched.push(u);
    else if (u.remaining === 1) near.push(u);
    else active.push(u);
  }

  // 途中のものは、残りが少ない順
  active.sort((a, b) => a.remaining - b.remaining);

  return { near, active, complete, untouched };
}

/** そろった単元の数。進捗の見出しに使う */
export function completedUnitCount(units: UnitSummary[]): number {
  return units.filter((u) => u.complete).length;
}

/** 積んだ数。分母を付けずに、この絶対値を見出しにする */
export function builtCount(statuses: PointStatus[]): number {
  return statuses.filter((s) => s.everMastered).length;
}

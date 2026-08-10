import { describe, expect, it } from "vitest";
import { analyzeGraph } from "./graph";
import { POINTS } from "../data/curriculum";
import type { KnowledgePoint } from "../types";

function point(
  id: string,
  prereqIds: string[] = [],
  extra: Partial<KnowledgePoint> = {}
): KnowledgePoint {
  return {
    id,
    subjectId: "s",
    unit: "u",
    name: id,
    ask: `${id} を説明できる？`,
    prereqIds,
    weight: 1,
    ...extra,
  };
}

describe("analyzeGraph", () => {
  it("先行観点が必ず先に来る順序を返す", () => {
    // わざとマスタの記述順を依存と逆にしておく
    const points = [
      point("c", ["b"]),
      point("b", ["a"]),
      point("a"),
    ];

    const ids = analyzeGraph(points).order.map((p) => p.id);

    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("同時に開放される観点はマスタの記述順を保つ", () => {
    const points = [point("root"), point("x", ["root"]), point("y", ["root"])];

    expect(analyzeGraph(points).order.map((p) => p.id)).toEqual([
      "root",
      "x",
      "y",
    ]);
  });

  it("深さは先行観点のうち最も深いものから決まる", () => {
    const points = [
      point("a"),
      point("b", ["a"]),
      point("c", ["a"]),
      point("d", ["b", "c"]),
      // 浅い枝と深い枝が合流したら、深いほうに合わせる
      point("e", ["a", "d"]),
    ];

    const { depthById } = analyzeGraph(points);

    expect(depthById.get("a")).toBe(0);
    expect(depthById.get("b")).toBe(1);
    expect(depthById.get("d")).toBe(2);
    expect(depthById.get("e")).toBe(3);
  });

  it("子孫の数は推移的に数える", () => {
    const points = [
      point("a"),
      point("b", ["a"]),
      point("c", ["b"]),
      point("solo"),
    ];

    const { descendantsById } = analyzeGraph(points);

    expect(descendantsById.get("a")).toBe(2); // b と c
    expect(descendantsById.get("b")).toBe(1);
    expect(descendantsById.get("c")).toBe(0);
    expect(descendantsById.get("solo")).toBe(0);
  });

  it("合流する枝の子孫を重複して数えない", () => {
    const points = [
      point("a"),
      point("b", ["a"]),
      point("c", ["a"]),
      point("d", ["b", "c"]),
    ];

    // b と c の両方から d に届くが、子孫は b, c, d の3つ
    expect(analyzeGraph(points).descendantsById.get("a")).toBe(3);
  });

  it("志望校の絞り込みで消えた先行観点は依存から外す", () => {
    // "gone" は集合に含まれていない
    const points = [point("only", ["gone"])];

    const { order, depthById } = analyzeGraph(points);

    expect(order.map((p) => p.id)).toEqual(["only"]);
    expect(depthById.get("only")).toBe(0);
  });

  it("依存が循環していても観点を落とさない", () => {
    const points = [point("x", ["y"]), point("y", ["x"])];

    expect(analyzeGraph(points).order).toHaveLength(2);
  });
});

describe("観点マスタ", () => {
  it("すべての先行観点が自分より前に並ぶ", () => {
    const order = analyzeGraph(POINTS).order;
    const positionById = new Map(order.map((p, i) => [p.id, i]));

    for (const p of POINTS) {
      for (const prereq of p.prereqIds) {
        expect(
          positionById.get(prereq),
          `${p.id} の先行観点 ${prereq} が後ろに来ている`
        ).toBeLessThan(positionById.get(p.id) as number);
      }
    }
  });

  it("先行観点として存在しない ID を指していない", () => {
    const ids = new Set(POINTS.map((p) => p.id));

    for (const p of POINTS) {
      for (const prereq of p.prereqIds) {
        expect(ids.has(prereq), `${p.id} が未知の観点 ${prereq} を指している`).toBe(
          true
        );
      }
    }
  });
});

describe("観点マスタ（中学数学）が開発の確認に足りているか", () => {
  const { depthById, descendantsById } = analyzeGraph(POINTS);
  const byId = new Map(POINTS.map((p) => [p.id, p]));

  it("依存が浅いフラットな一覧になっていない", () => {
    // 深さがないと、道の順序も開放条件も実質はたらいていないのと変わらない
    expect(Math.max(...depthById.values())).toBeGreaterThanOrEqual(6);
  });

  it("学年をまたぐ依存がある", () => {
    // 目次の並びをなぞっただけなら、ここは 0 本になる
    const crossYear = POINTS.flatMap((p) =>
      p.prereqIds.filter(
        (q) => byId.get(q)!.unit.slice(0, 2) !== p.unit.slice(0, 2)
      )
    );

    expect(crossYear.length).toBeGreaterThan(0);
  });

  it("平方根を踏まないと三平方の定理に進めない", () => {
    // 参考書の目次では章が違うので見えない依存。ここが引けているかが要
    expect(byId.get("m3-pythagoras")?.prereqIds).toContain("m3-sqrt-calc");
  });

  it("先の観点をいちばん多く開く観点を挙げられる", () => {
    const [topId, count] = [...descendantsById.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0];

    // 「戻るべき場所」を名前で出せるかは、この数字が意味を持つかで決まる
    expect(count).toBeGreaterThan(POINTS.length / 2);
    expect(byId.get(topId)?.unit).toContain("中1");
  });
});

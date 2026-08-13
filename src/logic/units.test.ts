import { describe, expect, it } from "vitest";
import { buildStatuses } from "./mastery";
import { buildDex, builtCount, focusUnit, summarizeUnits } from "./units";
import type { Attempt, KnowledgePoint } from "../types";

const NOW = new Date("2026-08-10T12:00:00");

function point(id: string, unit: string): KnowledgePoint {
  return {
    id,
    subjectId: "s",
    unit,
    name: id,
    ask: `${id} を説明できる？`,
    prereqIds: [],
    weight: 1,
  };
}

function at(pointId: string, day: string, correct = true): Attempt {
  return { pointId, at: new Date(`${day}T09:00:00`).toISOString(), correct };
}

/** 間隔をあけて2回できた＝積んだ */
function built(pointId: string): Attempt[] {
  return [at(pointId, "2026-08-01"), at(pointId, "2026-08-05")];
}

describe("summarizeUnits", () => {
  const points = [
    point("a1", "中1 数と式"),
    point("a2", "中1 数と式"),
    point("b1", "中1 図形"),
  ];

  it("単元ごとに、積んだ数と残りを数える", () => {
    const statuses = buildStatuses(points, built("a1"), null, NOW);
    const units = summarizeUnits(statuses);

    expect(units.map((u) => u.unit)).toEqual(["中1 数と式", "中1 図形"]);
    expect(units[0]).toMatchObject({ done: 1, total: 2, remaining: 1, complete: false });
    expect(units[1]).toMatchObject({ done: 0, total: 1, untouched: true });
  });

  it("全部積むとそろう", () => {
    const attempts = [...built("a1"), ...built("a2")];
    const units = summarizeUnits(buildStatuses(points, attempts, null, NOW));

    expect(units[0].complete).toBe(true);
  });

  it("薄れても、そろった印は外れない", () => {
    // ずっと前に積んで、いまは鮮度が切れている
    const stale = [
      at("a1", "2026-01-01"), at("a1", "2026-01-10"),
      at("a2", "2026-01-01"), at("a2", "2026-01-10"),
    ];
    const units = summarizeUnits(buildStatuses(points, stale, null, NOW));

    expect(units[0].points.every((s) => s.needsReview)).toBe(true);
    expect(units[0].complete).toBe(true);
  });

  it("間違えただけの単元は「手つかず」にしない", () => {
    const statuses = buildStatuses(points, [at("b1", "2026-08-09", false)], null, NOW);
    const units = summarizeUnits(statuses);

    expect(units.find((u) => u.unit === "中1 図形")?.untouched).toBe(false);
  });
});

describe("focusUnit — 見出しに出す分母", () => {
  const points = [
    point("a1", "中1 数と式"),
    point("b1", "中1 図形"),
  ];

  it("次にやる観点が入っている単元を出す", () => {
    const statuses = buildStatuses(points, [], null, NOW);
    const units = summarizeUnits(statuses);
    const next = statuses.find((s) => s.point.id === "b1")!;

    expect(focusUnit(units, next)?.unit).toBe("中1 図形");
  });

  it("次が無ければ、まだそろっていない単元を出す", () => {
    const statuses = buildStatuses(points, built("a1"), null, NOW);
    const units = summarizeUnits(statuses);

    expect(focusUnit(units, null)?.unit).toBe("中1 図形");
  });
});

describe("buildDex — 壁を上に置かない", () => {
  it("もうすぐ→途中→そろった→手つかず の順に分ける", () => {
    const points = [
      point("n1", "もうすぐ"), point("n2", "もうすぐ"),
      point("a1", "とちゅう"), point("a2", "とちゅう"), point("a3", "とちゅう"),
      point("c1", "そろった"),
      point("u1", "てつかず"),
    ];
    const attempts = [...built("n1"), ...built("a1"), ...built("c1")];
    const dex = buildDex(summarizeUnits(buildStatuses(points, attempts, null, NOW)));

    expect(dex.near.map((u) => u.unit)).toEqual(["もうすぐ"]);
    expect(dex.active.map((u) => u.unit)).toEqual(["とちゅう"]);
    expect(dex.complete.map((u) => u.unit)).toEqual(["そろった"]);
    expect(dex.untouched.map((u) => u.unit)).toEqual(["てつかず"]);
  });

  it("始めたばかりでも、手つかずが先頭に来ない", () => {
    // 下位層の初日。ここで空のマスが先に来ると壁になる
    const points = [
      point("x1", "いま"), point("x2", "いま"),
      point("y1", "まだ1"), point("y2", "まだ2"),
    ];
    const dex = buildDex(
      summarizeUnits(buildStatuses(points, built("x1"), null, NOW))
    );

    expect(dex.near[0]?.unit).toBe("いま");
    expect(dex.untouched.length).toBe(2);
  });
});

describe("builtCount", () => {
  it("積んだ数は分母を持たない", () => {
    const points = [point("a1", "u"), point("a2", "u")];
    const statuses = buildStatuses(points, built("a1"), null, NOW);

    expect(builtCount(statuses)).toBe(1);
  });
});

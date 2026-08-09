import { describe, expect, it } from "vitest";
import { buildStatuses } from "./mastery";
import {
  examRiskPoints,
  prioritize,
  settledPoints,
  summarize,
  weakPoints,
} from "./pace";
import type { Attempt, KnowledgePoint } from "../types";

const NOW = new Date("2026-08-10T12:00:00");
const EXAM = "2026-12-01";

function point(
  id: string,
  prereqIds: string[] = [],
  weight = 1
): KnowledgePoint {
  return {
    id,
    subjectId: "s",
    unit: "u",
    name: id,
    prereqIds,
    weight,
    questions: [],
  };
}

function at(pointId: string, day: string, correct: boolean): Attempt {
  return { pointId, at: new Date(`${day}T09:00:00`).toISOString(), correct };
}

/** 間隔をあけて2回正答＝定着させる */
function mastered(pointId: string, first: string, second: string): Attempt[] {
  return [at(pointId, first, true), at(pointId, second, true)];
}

describe("summarize — 踏破率は後退しない", () => {
  const points = [point("a"), point("b")];
  // a は 6/1 と 6/10 に正答して定着。以後まったく触っていない
  const attempts = mastered("a", "2026-06-01", "2026-06-10");

  it("鮮度が切れても踏破率は下がらない", () => {
    const fresh = summarize(
      buildStatuses(points, attempts, null, new Date("2026-06-11T09:00:00")),
      attempts,
      EXAM,
      new Date("2026-06-11T09:00:00")
    );
    const stale = summarize(
      buildStatuses(points, attempts, null, NOW),
      attempts,
      EXAM,
      NOW
    );

    expect(fresh.progressPct).toBe(50);
    expect(stale.progressPct).toBe(50);
  });

  it("代わりにコンディションが下がる", () => {
    const fresh = summarize(
      buildStatuses(points, attempts, null, new Date("2026-06-11T09:00:00")),
      attempts,
      EXAM,
      new Date("2026-06-11T09:00:00")
    );
    const stale = summarize(
      buildStatuses(points, attempts, null, NOW),
      attempts,
      EXAM,
      NOW
    );

    expect(fresh.conditionPct).toBeGreaterThan(90);
    expect(stale.conditionPct).toBe(0);
  });

  it("落として、あやしいに戻っても踏破率は下がらない", () => {
    const withLapse = [...attempts, at("a", "2026-08-09", false)];
    const summary = summarize(
      buildStatuses(points, withLapse, null, NOW),
      withLapse,
      EXAM,
      NOW
    );

    expect(summary.progressPct).toBe(50);
  });
});

describe("summarize — 必要ペース", () => {
  it("未踏破だけでなく、受験日までに切れるぶんも需要に数える", () => {
    const points = [point("a"), point("b")];
    const attempts = mastered("a", "2026-06-01", "2026-06-10");
    const statuses = buildStatuses(points, attempts, null, NOW);

    const summary = summarize(statuses, attempts, EXAM, NOW);

    // b は未踏破、a は踏破済みだが鮮度切れ。両方やる必要がある
    expect(summary.remainingPoints).toBe(1);
    expect(summary.reviewDuePoints).toBe(1);
    expect(summary.demandWeight).toBe(2);
  });

  it("受験日まで鮮度が持つ観点は需要から外れる", () => {
    // 直前に長い間隔をあけて定着させたので、受験日まで持つ
    const points = [point("a")];
    const attempts = mastered("a", "2026-01-01", "2026-08-09");
    const statuses = buildStatuses(points, attempts, null, NOW);

    const summary = summarize(statuses, attempts, EXAM, NOW);

    expect(summary.demandWeight).toBe(0);
    expect(settledPoints(statuses)).toHaveLength(1);
  });

  it("受験日が過ぎていても壊れない", () => {
    const points = [point("a")];
    const summary = summarize(
      buildStatuses(points, [], null, NOW),
      [],
      "2020-01-01",
      NOW
    );

    expect(summary.daysLeft).toBe(0);
    expect(Number.isFinite(summary.requiredPerDay)).toBe(true);
  });
});

describe("examRiskPoints — 大丈夫だと思っている観点を先に出す", () => {
  // A: いまは鮮度が高いが、受験日までに切れる
  // B: 何度も間違えていて、まだ踏破できていない
  const points = [point("A", [], 3), point("B", [], 3)];
  const attempts: Attempt[] = [
    ...mastered("A", "2026-07-20", "2026-08-09"),
    at("B", "2026-08-08", false),
    at("B", "2026-08-09", false),
  ];
  const statuses = buildStatuses(points, attempts, null, NOW);

  it("A はいま見るかぎり問題なく見える", () => {
    const a = statuses.find((s) => s.point.id === "A");

    expect(a?.level).toBe("mastered");
    expect(a?.needsReview).toBe(false);
    expect(a?.freshness).toBeGreaterThan(0.8);
  });

  it("それでも本番までに切れるので、危険側に挙がる", () => {
    const risky = examRiskPoints(statuses, EXAM, 5, NOW);

    expect(risky.map((s) => s.point.id)).toContain("A");
  });

  it("まだ踏破していない B は「落とす」対象ではなく苦手側で扱う", () => {
    expect(examRiskPoints(statuses, EXAM, 5, NOW).map((s) => s.point.id)).not.toContain(
      "B"
    );
    expect(weakPoints(statuses).map((s) => s.point.id)).toContain("B");
  });
});

describe("prioritize — 何をやるかの決め方", () => {
  it("未着手のときは道が長く伸びるほうから始める", () => {
    // root1 は3観点の先につながる。root2 は頻出度が高いが先が短い
    const points = [
      point("root2", [], 3),
      point("child2", ["root2"], 1),
      point("root1", [], 2),
      point("child1a", ["root1"], 1),
      point("child1b", ["child1a"], 1),
      point("child1c", ["child1b"], 1),
    ];

    const statuses = buildStatuses(points, [], null, NOW);
    const first = prioritize(statuses, NOW)[0];

    expect(first.point.id).toBe("root1");
  });

  it("ロックされている観点は候補に入らない", () => {
    const points = [point("a"), point("b", ["a"])];
    const statuses = buildStatuses(points, [], null, NOW);

    expect(prioritize(statuses, NOW).map((s) => s.point.id)).toEqual(["a"]);
  });

  it("切れかけの定着観点は、未着手より先に出す", () => {
    const points = [point("keep"), point("new")];
    // 3日間隔で定着 → 保持は約7日。8/4 の6日後なのでもうすぐ切れる
    const attempts = mastered("keep", "2026-08-01", "2026-08-04");
    const statuses = buildStatuses(points, attempts, null, NOW);

    const order = prioritize(statuses, NOW).map((s) => s.point.id);

    expect(order[0]).toBe("keep");
  });

  it("鮮度が残っている定着観点は出さない", () => {
    const points = [point("fresh"), point("new")];
    const attempts = mastered("fresh", "2026-01-01", "2026-08-09");
    const statuses = buildStatuses(points, attempts, null, NOW);

    expect(prioritize(statuses, NOW).map((s) => s.point.id)).toEqual(["new"]);
  });

  it("落とした観点を最優先で拾う", () => {
    const points = [point("dropped"), point("touched"), point("new")];
    const attempts = [
      ...mastered("dropped", "2026-06-01", "2026-06-10"),
      at("touched", "2026-08-09", false),
    ];
    const statuses = buildStatuses(points, attempts, null, NOW);

    const order = prioritize(statuses, NOW).map((s) => s.point.id);

    expect(order).toEqual(["dropped", "touched", "new"]);
  });
});

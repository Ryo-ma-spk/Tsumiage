import { describe, expect, it } from "vitest";
import { buildStatuses } from "./mastery";
import {
  buildQueue,
  dailyShortfall,
  examRiskPoints,
  prioritize,
  settledPoints,
  summarize,
  summarizeToday,
  weakPoints,
  type PaceSummary,
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
    ask: `${id} を説明できる？`,
    prereqIds,
    weight,
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

  it("土台が未達でも候補から外さない。順番が下がるだけ", () => {
    // 学習の順序を決めているのは学校や本人であって、このアプリではない。
    // 授業で b をやっている人を a で止めるのは筋が違う
    const points = [point("a"), point("b", ["a"])];
    const statuses = buildStatuses(points, [], null, NOW);

    expect(prioritize(statuses, NOW).map((s) => s.point.id)).toEqual(["a", "b"]);
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

describe("buildQueue — 復習だけで埋めない", () => {
  /** 一本道で n 個。すべて独立させて開放状態にしておく */
  function chain(n: number): KnowledgePoint[] {
    return Array.from({ length: n }, (_, i) => point(`p${i}`));
  }

  it("長く空けて復習が溜まっても、新規が必ず入る", () => {
    const points = chain(10);
    // p0〜p5 は昔に定着させたきり。全部とっくに薄れている
    const attempts = points
      .slice(0, 6)
      .flatMap((p) => mastered(p.id, "2026-06-01", "2026-06-10"));
    const statuses = buildStatuses(points, attempts, null, NOW);

    const queue = buildQueue(statuses, 5, NOW);
    const fresh = queue.filter((p) => !attempts.some((a) => a.pointId === p.id));

    // 優先度順にそのまま並べると、ここが 0 になっていた
    expect(fresh.length).toBe(2);
    expect(queue.length).toBe(5);
  });

  it("復習が枯れていれば新規で埋める", () => {
    const points = chain(10);
    const statuses = buildStatuses(points, [], null, NOW);

    expect(buildQueue(statuses, 5, NOW).length).toBe(5);
  });

  it("新規が枯れていれば復習で埋める", () => {
    const points = chain(6);
    const attempts = points.flatMap((p) =>
      mastered(p.id, "2026-06-01", "2026-06-10")
    );
    const statuses = buildStatuses(points, attempts, null, NOW);

    expect(buildQueue(statuses, 5, NOW).length).toBe(5);
  });

  it("復習ばかりが頭に固まらないように混ぜる", () => {
    const points = chain(10);
    const attempts = points
      .slice(0, 6)
      .flatMap((p) => mastered(p.id, "2026-06-01", "2026-06-10"));
    const statuses = buildStatuses(points, attempts, null, NOW);
    const reviewIds = new Set(attempts.map((a) => a.pointId));

    const kinds = buildQueue(statuses, 5, NOW).map((p) =>
      reviewIds.has(p.id) ? "R" : "N"
    );

    expect(kinds).toEqual(["R", "R", "N", "R", "N"]);
  });
});

describe("summarizeToday — 今日ぶん", () => {
  function atTime(pointId: string, iso: string, correct = true): Attempt {
    return { pointId, at: new Date(iso).toISOString(), correct };
  }

  // 目標の下限(5)を下回らないよう、開放済みの観点を6つ用意しておく
  const few = ["a", "b", "c", "d", "e", "f"].map((id) => point(id));

  it("受験日が遠いうちは下限の5に張り付く", () => {
    expect(summarizeToday(few, [], null, EXAM, NOW).goal).toBe(5);
  });

  it("受験が近づくと目標が伸びる", () => {
    const many = Array.from({ length: 60 }, (_, i) => point(`p${i}`));
    const soon = "2026-08-20"; // 10日後

    expect(summarizeToday(many, [], null, soon, NOW).goal).toBe(6);
  });

  it("目標は上限の10で止まる", () => {
    const many = Array.from({ length: 300 }, (_, i) => point(`p${i}`));
    const soon = "2026-08-20";

    expect(summarizeToday(many, [], null, soon, NOW).goal).toBe(10);
  });

  it("日中に判定しても、その日の目標は動かない", () => {
    const many = Array.from({ length: 60 }, (_, i) => point(`p${i}`));
    const soon = "2026-08-20";

    // 今日20個を定着させて、受験日まで持つ状態にする
    const todayWork = many
      .slice(0, 20)
      .flatMap((p) => [
        atTime(p.id, "2026-08-05T09:00:00"),
        atTime(p.id, "2026-08-10T09:00:00"),
      ]);

    const before = summarizeToday(many, [], null, soon, NOW);
    const after = summarizeToday(many, todayWork, null, soon, NOW);

    // 必要ペース自体は下がっている（テストが空振りしていないことの確認）
    const statuses = buildStatuses(many, todayWork, null, NOW);
    expect(summarize(statuses, todayWork, soon, NOW).requiredPointsPerDay).
      toBeLessThan(6);

    // それでも今日の目標は据え置き。終わった今日ぶんが未達に戻らない
    expect(after.goal).toBe(before.goal);
  });

  it("深夜の判定は前日ぶんに数える", () => {
    // 4:00 で日を切るので、8/10 の 1:00 は 8/9 の続き
    const lateNight = new Date("2026-08-10T02:00:00");
    const attempts = [atTime("a", "2026-08-10T01:00:00")];

    expect(summarizeToday(few, attempts, null, EXAM, lateNight).done).toBe(1);
  });

  it("4:00 を回れば新しい日として数え直す", () => {
    const morning = new Date("2026-08-10T06:00:00");
    const attempts = [atTime("a", "2026-08-10T03:00:00")];

    expect(summarizeToday(few, attempts, null, EXAM, morning).done).toBe(0);
  });

  it("間違えた観点も「やった」に数える", () => {
    const attempts = [atTime("a", "2026-08-10T09:00:00", false)];

    expect(summarizeToday(few, attempts, null, EXAM, NOW).done).toBe(1);
  });

  it("同じ観点を何度振っても1つぶん", () => {
    const attempts = [
      atTime("a", "2026-08-10T09:00:00"),
      atTime("a", "2026-08-10T10:00:00"),
    ];

    expect(summarizeToday(few, attempts, null, EXAM, NOW).done).toBe(1);
  });

  it("目標に届いたら完了になる", () => {
    const many = Array.from({ length: 20 }, (_, i) => point(`p${i}`));
    const attempts = many
      .slice(0, 5)
      .map((p) => atTime(p.id, "2026-08-10T09:00:00"));

    const today = summarizeToday(many, attempts, null, EXAM, NOW);

    expect(today.goal).toBe(5);
    expect(today.completed).toBe(true);
  });
});

describe("dailyShortfall", () => {
  it("足りていれば 0", () => {
    expect(
      dailyShortfall({ requiredPointsPerDay: 2, actualPointsPerDay: 3 } as PaceSummary)
    ).toBe(0);
  });

  it("不足ぶんを整数で返す", () => {
    expect(
      dailyShortfall({ requiredPointsPerDay: 4.2, actualPointsPerDay: 1.5 } as PaceSummary)
    ).toBe(3);
  });
});

describe("summarize — 始めたばかりのペースを信用しすぎない", () => {
  it("初日に5観点やっても「1日5観点」とは読まない", () => {
    const points = Array.from({ length: 40 }, (_, i) => point(`p${i}`));
    // 今日はじめて、5観点を触っただけ
    const attempts = points
      .slice(0, 5)
      .map((p) => at(p.id, "2026-08-10", true));

    const summary = summarize(
      buildStatuses(points, attempts, null, NOW),
      attempts,
      EXAM,
      NOW
    );

    // 1日ぶんをそのまま日割りすると 5.0 になり、着地予測が 100% に張り付く
    expect(summary.actualPointsPerDay).toBeLessThan(2);
    expect(summary.projectedPct).toBeLessThan(100);
  });
});

describe("summarizeToday — 出せる数を超える目標を出さない", () => {
  it("出せる観点が少なければ、目標をその数まで切り下げる", () => {
    // 5 のままだと、そもそも振れない残数が出続けて永久に未達になる
    const points = [point("a"), point("b"), point("c")];

    expect(summarizeToday(points, [], null, EXAM, NOW).goal).toBe(3);
  });

  it("出せるぶんを振れば今日ぶんが完了する", () => {
    const points = [point("a"), point("b"), point("c")];
    const attempts = ["a", "b", "c"].map((id) => ({
      pointId: id,
      at: new Date("2026-08-10T09:00:00").toISOString(),
      correct: true,
    }));

    expect(summarizeToday(points, attempts, null, EXAM, NOW).completed).toBe(true);
  });
});

describe("summarize — 「まだ測れない」と「足りない」を混ぜない", () => {
  const points = Array.from({ length: 20 }, (_, i) => point(`p${i}`));

  it("踏破が1つも無いうちは予測を出さない", () => {
    // 初日に何問か振った直後。まだ solved どまりで踏破は 0
    const attempts = points.slice(0, 3).map((p) => at(p.id, "2026-08-10", true));
    const summary = summarize(
      buildStatuses(points, attempts, null, NOW),
      attempts,
      EXAM,
      NOW
    );

    // ここが true だと、初日から赤い 0%「このままだと足りない」が出る
    expect(summary.measurable).toBe(false);
    expect(summary.projectedPct).toBe(0);
  });

  it("1つでも踏破すれば測れるようになる", () => {
    const attempts = mastered("p0", "2026-08-01", "2026-08-05");
    const summary = summarize(
      buildStatuses(points, attempts, null, NOW),
      attempts,
      EXAM,
      NOW
    );

    expect(summary.measurable).toBe(true);
  });

  it("しばらく放置していても、踏破があるなら測る（それは本当に足りていない）", () => {
    const attempts = mastered("p0", "2026-01-01", "2026-01-10");
    const summary = summarize(
      buildStatuses(points, attempts, null, NOW),
      attempts,
      EXAM,
      NOW
    );

    expect(summary.measurable).toBe(true);
    expect(summary.actualPointsPerDay).toBe(0);
  });
});

describe("prioritize — 開けた続きをそのまま出す", () => {
  it("直前に触った観点の続きを先に出す", () => {
    // 2本の鎖。a→b→c と x→y→z
    const points = [
      point("a"), point("b", ["a"]), point("c", ["b"]),
      point("x"), point("y", ["x"]), point("z", ["y"]),
    ];
    // a も x も定着していて鮮度も残っている。ただし x のほうが直近
    const attempts = [
      ...mastered("a", "2026-07-20", "2026-08-05"),
      ...mastered("x", "2026-08-01", "2026-08-09"),
    ];
    const statuses = buildStatuses(points, attempts, null, NOW);

    // 深さ順だけで並べると b と y が同点で、配列順の b が先に出ていた
    expect(prioritize(statuses, NOW)[0].point.id).toBe("y");
  });

  it("鎖を最後まで追ってから、次の鎖に移る", () => {
    const points = [
      point("a"), point("b", ["a"]), point("c", ["b"]), point("d", ["c"]),
      point("x"), point("y", ["x"]),
    ];
    const byId = new Map(points.map((p) => [p.id, p]));
    const attempts: Attempt[] = [];
    const picked: string[] = [];

    // 出てきたものを順に定着させていく
    for (let i = 0; i < 4; i++) {
      const next = prioritize(buildStatuses(points, attempts, null, NOW), NOW)[0];
      if (!next) break;
      picked.push(next.point.id);
      attempts.push(
        at(next.point.id, "2026-08-01", true),
        at(next.point.id, "2026-08-10", true)
      );
    }

    // 最初の1つは根のどちらか。そのあとは同じ鎖が続くはず
    const chain = picked.filter((id) => ["a", "b", "c", "d"].includes(id));
    expect(chain.length).toBeGreaterThanOrEqual(3);
    // 直前の続きになっているか
    const linked = picked.slice(1).filter((id, i) =>
      byId.get(id)!.prereqIds.includes(picked[i])
    );
    expect(linked.length).toBeGreaterThanOrEqual(2);
  });

  it("復習のほうが工程の続きより優先される", () => {
    // dropped は踏破後に落としている（score 0）。y は直前に開いた続き
    const points = [point("dropped"), point("x"), point("y", ["x"])];
    const attempts = [
      ...mastered("dropped", "2026-06-01", "2026-06-10"),
      at("dropped", "2026-08-08", false),
      ...mastered("x", "2026-08-01", "2026-08-09"),
    ];
    const statuses = buildStatuses(points, attempts, null, NOW);

    expect(prioritize(statuses, NOW)[0].point.id).toBe("dropped");
  });
});

describe("buildQueue — セッションの中で工程をつなぐ", () => {
  it("土台とその続きが同じセッションに並ぶ", () => {
    // b は a を、c は b を土台にする。d と e は無関係
    const points = [
      point("a", [], 1), point("b", ["a"], 1), point("c", ["b"], 1),
      point("d", [], 3), point("e", [], 3),
    ];
    const statuses = buildStatuses(points, [], null, NOW);

    const ids = buildQueue(statuses, 5, NOW).map((p) => p.id);
    const ia = ids.indexOf("a"), ib = ids.indexOf("b"), ic = ids.indexOf("c");

    // 上位から順に取るだけだと、頻出度の高い d・e が間に割り込んでいた
    expect(ib).toBe(ia + 1);
    expect(ic).toBe(ib + 1);
  });
});

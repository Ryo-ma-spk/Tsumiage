import { describe, expect, it } from "vitest";
import { daysBetween, evaluate } from "./mastery";
import type { Attempt } from "../types";

/** 読みやすさのため、日付は "YYYY-MM-DD HH:MM" で書く */
function at(day: string, correct: boolean): Attempt {
  const [date, time = "09:00"] = day.split(" ");
  return { pointId: "p", at: new Date(`${date}T${time}:00`).toISOString(), correct };
}

const NOW = new Date("2026-08-10T12:00:00");

describe("daysBetween", () => {
  it("暦日で数える", () => {
    expect(daysBetween("2026-08-01T09:00:00", "2026-08-04T10:00:00")).toBe(3);
  });

  it("時刻の違いで日数が変わらない", () => {
    // 経過ミリ秒で数えていた頃は、これが 3 と 2 に割れていた
    const morning = daysBetween("2026-08-01T09:00:00", "2026-08-04T10:00:00");
    const night = daysBetween("2026-08-01T23:00:00", "2026-08-04T22:00:00");

    expect(morning).toBe(night);
  });
});

describe("evaluate — 到達度", () => {
  it("履歴がなければ未着手", () => {
    expect(evaluate([], NOW).level).toBe("untouched");
  });

  it("挑戦したが正答がなければ、あやしい", () => {
    expect(evaluate([at("2026-08-09", false)], NOW).level).toBe("touched");
  });

  it("正答が1回だけなら、解けた", () => {
    expect(evaluate([at("2026-08-09", true)], NOW).level).toBe("solved");
  });

  it("3日あけて2回正答すると定着", () => {
    const result = evaluate(
      [at("2026-08-01", true), at("2026-08-04", true)],
      NOW
    );

    expect(result.level).toBe("mastered");
    expect(result.everMastered).toBe(true);
  });

  it("間隔が3日に足りなければ定着しない", () => {
    const result = evaluate(
      [at("2026-08-01", true), at("2026-08-03", true)],
      NOW
    );

    expect(result.level).toBe("solved");
  });

  it("夜に解いても朝に解いても同じ判定になる", () => {
    const morning = evaluate(
      [at("2026-08-01 09:00", true), at("2026-08-04 10:00", true)],
      NOW
    );
    const night = evaluate(
      [at("2026-08-01 23:00", true), at("2026-08-04 22:00", true)],
      NOW
    );

    expect(morning.level).toBe(night.level);
    expect(morning.level).toBe("mastered");
  });

  it("初回正答日を記録する", () => {
    const result = evaluate(
      [at("2026-08-01", true), at("2026-08-04", true), at("2026-08-08", true)],
      NOW
    );

    // 定着に届いたのは2回目の正答の時点
    expect(result.firstMasteredAt).toBe(at("2026-08-04", true).at);
  });
});

describe("evaluate — 忘れたあとの扱い", () => {
  const mastered = [at("2026-06-01", true), at("2026-06-10", true)];

  it("定着後に間違えると、あやしいに落ちる", () => {
    const result = evaluate([...mastered, at("2026-08-09", false)], NOW);

    expect(result.level).toBe("touched");
  });

  it("落ちても踏破した事実は取り消されない", () => {
    const result = evaluate([...mastered, at("2026-08-09", false)], NOW);

    // すごろくのコマは戻らない
    expect(result.everMastered).toBe(true);
    expect(result.firstMasteredAt).not.toBeNull();
  });

  it("落ちたあと1回正答しただけでは定着に戻らない", () => {
    const result = evaluate(
      [...mastered, at("2026-08-08", false), at("2026-08-09", true)],
      NOW
    );

    expect(result.level).toBe("solved");
    expect(result.needsReview).toBe(true);
  });

  it("落ちたあとも間隔をあけて2回正答すれば定着に戻る", () => {
    const result = evaluate(
      [
        ...mastered,
        at("2026-08-01", false),
        at("2026-08-04", true),
        at("2026-08-08", true),
      ],
      NOW
    );

    expect(result.level).toBe("mastered");
  });
});

describe("evaluate — 鮮度の予測", () => {
  it("保持できた間隔が長いほど、次に切れるのが遅くなる", () => {
    const short = evaluate(
      [at("2026-08-01", true), at("2026-08-04", true)],
      NOW
    );
    const long = evaluate(
      [at("2026-07-15", true), at("2026-08-04", true)],
      NOW
    );

    expect(short.staleAt).not.toBeNull();
    expect(long.staleAt).not.toBeNull();
    expect(new Date(long.staleAt as string).getTime()).toBeGreaterThan(
      new Date(short.staleAt as string).getTime()
    );
  });

  it("過去に忘れている観点は早く戻ってくる", () => {
    const clean = evaluate(
      [at("2026-07-28", true), at("2026-08-04", true)],
      NOW
    );
    const lapsed = evaluate(
      [
        at("2026-06-01", true),
        at("2026-06-10", true),
        at("2026-07-01", false), // 一度忘れている
        at("2026-07-28", true),
        at("2026-08-04", true),
      ],
      NOW
    );

    expect(new Date(lapsed.staleAt as string).getTime()).toBeLessThan(
      new Date(clean.staleAt as string).getTime()
    );
  });

  it("直後は鮮度が高く、切れると 0 になる", () => {
    const attempts = [at("2026-08-01", true), at("2026-08-04", true)];

    const justAfter = evaluate(attempts, new Date("2026-08-04T20:00:00"));
    const later = evaluate(attempts, new Date("2027-01-01T09:00:00"));

    expect(justAfter.freshness).toBeGreaterThan(0.9);
    expect(justAfter.needsReview).toBe(false);
    expect(later.freshness).toBe(0);
    expect(later.needsReview).toBe(true);
  });

  it("鮮度は時間とともに単調に減る", () => {
    const attempts = [at("2026-08-01", true), at("2026-08-04", true)];

    const a = evaluate(attempts, new Date("2026-08-05T09:00:00")).freshness;
    const b = evaluate(attempts, new Date("2026-08-08T09:00:00")).freshness;
    const c = evaluate(attempts, new Date("2026-08-11T09:00:00")).freshness;

    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });

  it("定着していない観点は鮮度を持たない", () => {
    const result = evaluate([at("2026-08-09", true)], NOW);

    expect(result.staleAt).toBeNull();
    expect(result.freshness).toBe(0);
  });
});

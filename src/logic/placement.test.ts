import { describe, expect, it } from "vitest";
import { POINTS } from "../data/curriculum";
import {
  PLACEMENT_MAX_PROBES,
  answerProbe,
  emptyPlacement,
  holes,
  nextProbe,
  type Placement,
} from "./placement";
import type { KnowledgePoint } from "../types";

const ALL = new Set(POINTS.map((p) => p.id));
const BY_ID = new Map(POINTS.map((p) => [p.id, p]));

/** 「ここまではできる」と決めた仮想の受験生に、最後まで答えさせる */
function diagnose(knows: (p: KnowledgePoint) => boolean, checkable = ALL) {
  let placement: Placement = emptyPlacement;
  for (let i = 0; i < PLACEMENT_MAX_PROBES; i++) {
    const probe = nextProbe(POINTS, placement, checkable);
    if (!probe) break;
    placement = answerProbe(POINTS, placement, probe.id, knows(probe));
  }
  return placement;
}

const upTo2 = (p: KnowledgePoint) => !p.unit.startsWith("中3");
const only1 = (p: KnowledgePoint) => p.unit.startsWith("中1");
const notGeometry = (p: KnowledgePoint) =>
  !/図形|平行|三角形|相似|円|三平方/.test(p.unit);

describe("初日の診断", () => {
  it("「できる」と推測したものを、実際にできないことはない", () => {
    // ここが崩れると診断が嘘になる。少なく見積もる方向にしか外れてはいけない
    for (const knows of [upTo2, only1, notGeometry]) {
      const placement = diagnose(knows);
      const wrong = placement.canDo.filter((id) => !knows(BY_ID.get(id)!));
      expect(wrong).toEqual([]);
    }
  });

  it("8問を超えて聞かない", () => {
    const placement = diagnose(only1);

    expect(placement.asked.length).toBeLessThanOrEqual(PLACEMENT_MAX_PROBES);
    expect(nextProbe(POINTS, placement, ALL)).toBeNull();
  });

  it("中2までできる人には、中3の入口を穴として出す", () => {
    const found = holes(POINTS, diagnose(upTo2)).map((p) => p.unit);

    expect(found.length).toBeGreaterThan(0);
    expect(found.every((u) => u.startsWith("中3"))).toBe(true);
  });

  it("中1しかできない人には、中2の入口を穴として出す", () => {
    const found = holes(POINTS, diagnose(only1)).map((p) => p.unit);

    expect(found.length).toBeGreaterThan(0);
    expect(found.some((u) => u.startsWith("中2"))).toBe(true);
    expect(found.some((u) => u.startsWith("中1"))).toBe(false);
  });

  it("図形だけ穴の人には、図形の観点だけを出す", () => {
    const found = holes(POINTS, diagnose(notGeometry)).map((p) => p.unit);

    expect(found.length).toBeGreaterThan(0);
    expect(found.every((u) => /図形|平行|三角形|相似|円|三平方/.test(u))).toBe(true);
  });

  it("全問正解の人には穴を出さない（無いとは言い切れない）", () => {
    // 8問すべて正解でも見えていない観点は残る。呼び出し側で
    // 「穴は無い」と言い切らないための、空の返り値
    const placement = diagnose(() => true);

    expect(holes(POINTS, placement)).toEqual([]);
    expect(placement.cannot).toEqual([]);
    expect(placement.canDo.length).toBeLessThan(POINTS.length);
  });

  it("答え合わせできる観点からしか聞かない", () => {
    const only = new Set(["m3-pythagoras", "m3-sqrt"]);
    const probe = nextProbe(POINTS, emptyPlacement, only);

    expect(probe && only.has(probe.id)).toBe(true);
  });

  it("聞ける観点が無ければ、診断そのものを始めない", () => {
    expect(nextProbe(POINTS, emptyPlacement, new Set())).toBeNull();
  });

  it("同じ観点を2度聞かない", () => {
    const placement = diagnose(upTo2);

    expect(new Set(placement.asked).size).toBe(placement.asked.length);
  });
});

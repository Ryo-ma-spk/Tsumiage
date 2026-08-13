import type { PointStatus } from "../types";

/**
 * マス1つの見た目。積んだかどうかと、いま覚えているかを色で分ける。
 *
 * 置いたマスは外れない（クラスが空に戻らない）。忘れても薄くなるだけ。
 * 進捗を後退させないという前提を、そのまま色で表している。
 */
export function cellClass(s: PointStatus): string {
  if (!s.everMastered) return "";
  if (s.needsReview || s.freshness < 0.35) return "faded";
  return s.correctCount >= 3 ? "perfect" : "built";
}

import { useCallback, useEffect, useState } from "react";
import type { Attempt, StudyState, Target } from "../types";
import { POINTS } from "../data/curriculum";

const STORAGE_KEY = "tsumiage.v1";

const EMPTY: StudyState = { target: null, attempts: [] };

function load(): StudyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as StudyState;
    return {
      target: parsed.target ?? null,
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
    };
  } catch {
    return EMPTY;
  }
}

function save(state: StudyState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 保存できなくても操作は続行できるようにする
  }
}

export function useStudyStore() {
  const [state, setState] = useState<StudyState>(load);

  useEffect(() => {
    save(state);
  }, [state]);

  const setTarget = useCallback((target: Target) => {
    setState((prev) => ({ ...prev, target }));
  }, []);

  const recordAttempt = useCallback(
    (pointId: string, correct: boolean, latencyMs?: number) => {
      setState((prev) => ({
        ...prev,
        attempts: [
          ...prev.attempts,
          { pointId, correct, at: new Date().toISOString(), latencyMs },
        ],
      }));
    },
    []
  );

  /**
   * 直前の判定を取り消す。
   * 誤って振ったときの逃げ道で、セッション中しか呼ばれない。
   */
  const undoLastAttempt = useCallback(() => {
    setState((prev) => ({ ...prev, attempts: prev.attempts.slice(0, -1) }));
  }, []);

  const reset = useCallback(() => {
    setState(EMPTY);
  }, []);

  /** 進捗ゼロだと画面の良し悪しが判断できないので、動作確認用の履歴を流し込む */
  const seedDemo = useCallback(() => {
    setState((prev) => ({ ...prev, attempts: buildDemoAttempts() }));
  }, []);

  return { state, setTarget, recordAttempt, undoLastAttempt, reset, seedDemo };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

/**
 * 90日分のそれらしい履歴を作る。
 *
 * 依存関係の順に進み、後半ほど手が回っていない形にしている。
 * 「まだ鮮度が残っている」「もう薄れている」「いまは大丈夫に見えるが本番までに薄れる」
 * が全部そろうようにしてあり、そうしないと画面の良し悪しが判断できない。
 */
function buildDemoAttempts(): Attempt[] {
  const attempts: Attempt[] = [];

  const record = (
    pointId: string,
    days: number,
    correct = true,
    latencyMs?: number
  ) => {
    attempts.push({ pointId, correct, at: daysAgo(days), latencyMs });
  };

  POINTS.forEach((point, i) => {
    const ratio = i / POINTS.length;

    if (ratio < 0.25) {
      // 早い時期にやったきり。すでに薄れている
      record(point.id, 80, true, 12_000);
      record(point.id, 70, true, 9_000);
    } else if (ratio < 0.4) {
      // 長い間隔で2回。いまは大丈夫に見えるが、いずれ薄れる
      record(point.id, 40, true, 18_000);
      record(point.id, 6, true, 30_000); // 難産だったので伸びが鈍い
    } else if (ratio < 0.5) {
      // 最近きちんと間隔をあけた。即答できていて、しばらく持つ
      record(point.id, 12, true, 6_000);
      record(point.id, 2, true, 3_500);
    } else if (ratio < 0.58) {
      // 一度定着させたが、直近で落とした
      record(point.id, 30);
      record(point.id, 20);
      record(point.id, 1, false);
    } else if (ratio < 0.68) {
      // 正答1回。あと1回で定着
      record(point.id, 3);
    } else if (ratio < 0.78) {
      // 何度も間違えている
      record(point.id, 4, false);
      record(point.id, 1, false);
    }
    // 残りは未着手
  });

  return attempts;
}

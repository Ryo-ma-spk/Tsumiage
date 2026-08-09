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

  const recordAttempt = useCallback((pointId: string, correct: boolean) => {
    setState((prev) => ({
      ...prev,
      attempts: [
        ...prev.attempts,
        { pointId, correct, at: new Date().toISOString() },
      ],
    }));
  }, []);

  const reset = useCallback(() => {
    setState(EMPTY);
  }, []);

  /** 進捗ゼロだと画面の良し悪しが判断できないので、動作確認用の履歴を流し込む */
  const seedDemo = useCallback(() => {
    setState((prev) => ({ ...prev, attempts: buildDemoAttempts() }));
  }, []);

  return { state, setTarget, recordAttempt, reset, seedDemo };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

/**
 * 30日分のそれらしい履歴を作る。
 * 依存関係の順に進み、後半ほど手が回っていない = 現実的な形にしている。
 */
function buildDemoAttempts(): Attempt[] {
  const attempts: Attempt[] = [];
  // この観点だけは「定着後に放置された」状態を作るのでループから外す
  const reviewDemoId = "m-expand";
  const ordered = POINTS.filter((p) => p.id !== reviewDemoId);

  ordered.forEach((point, i) => {
    // 全体の 45% は定着、次の 15% は解けた、次の 12% はあやしい、残りは未着手
    const ratio = i / ordered.length;
    if (ratio < 0.45) {
      const start = 30 - Math.floor(ratio * 50);
      attempts.push({ pointId: point.id, correct: true, at: daysAgo(start) });
      attempts.push({
        pointId: point.id,
        correct: true,
        at: daysAgo(Math.max(1, start - 8)),
      });
    } else if (ratio < 0.6) {
      attempts.push({ pointId: point.id, correct: true, at: daysAgo(3) });
    } else if (ratio < 0.72) {
      attempts.push({ pointId: point.id, correct: false, at: daysAgo(2) });
    }
  });

  // 定着したが放置されて復習に戻った状態（最終正答から21日以上）
  attempts.push({ pointId: reviewDemoId, correct: true, at: daysAgo(60) });
  attempts.push({ pointId: reviewDemoId, correct: true, at: daysAgo(40) });

  return attempts;
}

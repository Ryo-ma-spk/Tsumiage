import { useMemo, useState } from "react";
import { BottomNav, type Tab } from "./components/BottomNav";
import { SetupScreen } from "./components/SetupScreen";
import { SwipeSession } from "./components/SwipeSession";
import { TodayScreen } from "./screens/TodayScreen";
import { MapScreen } from "./screens/MapScreen";
import { StatsScreen } from "./screens/StatsScreen";
import { useStudyStore } from "./hooks/useStudyStore";
import { buildStatuses } from "./logic/mastery";
import { pickAudit, pickNext, summarize, summarizeToday } from "./logic/pace";
import { CHECKABLE_IDS, CHECKS, POINTS, findFaculty } from "./data/curriculum";
import type { KnowledgePoint } from "./types";
import "./app.css";

export default function App() {
  const { state, setTarget, recordAttempt, undoLastAttempt, reset, seedDemo } =
    useStudyStore();
  const [tab, setTab] = useState<Tab>("today");
  const [session, setSession] = useState<KnowledgePoint[] | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState(false);

  const faculty = state.target
    ? findFaculty(state.target.universityId, state.target.facultyId).faculty
    : null;

  const statuses = useMemo(
    () => buildStatuses(POINTS, state.attempts, faculty),
    [state.attempts, faculty]
  );

  const examDate =
    state.target?.examDate ?? new Date().toISOString().slice(0, 10);

  const summary = useMemo(
    () => summarize(statuses, state.attempts, examDate),
    [statuses, state.attempts, examDate]
  );

  const today = useMemo(
    () => summarizeToday(POINTS, state.attempts, faculty, examDate),
    [state.attempts, faculty, examDate]
  );

  const next = useMemo(() => pickNext(statuses), [statuses]);

  const lastSeenById = useMemo(
    () => new Map(statuses.map((s) => [s.point.id, s.lastAttemptAt])),
    [statuses]
  );
  const builtById = useMemo(
    () => new Map(statuses.map((s) => [s.point.id, s.everMastered])),
    [statuses]
  );

  if (!state.target || editingTarget) {
    return (
      <div className="app">
        <SetupScreen
          initial={state.target}
          onSave={(target) => {
            setTarget(target);
            setEditingTarget(false);
          }}
          onCancel={state.target ? () => setEditingTarget(false) : undefined}
        />
      </div>
    );
  }

  if (session) {
    return (
      <div className="app">
        <SwipeSession
          points={session}
          lastSeenById={lastSeenById}
          auditPointId={auditId}
          checkFor={(id) => CHECKS[id]}
          isBuilt={(id) => builtById.get(id) === true}
          onRecord={(pointId, correct, latencyMs, opts) =>
            recordAttempt(pointId, correct, latencyMs, opts)
          }
          onUndo={undoLastAttempt}
          onClose={() => {
            setSession(null);
            setAuditId(null);
          }}
        />
      </div>
    );
  }

  const start = (points: KnowledgePoint[]) => {
    if (points.length === 0) return;
    // 確認カードは1セッションに1枚まで。ここで決めて、あとは動かさない
    setAuditId(pickAudit(points, statuses, state.attempts, CHECKABLE_IDS));
    setSession(points);
  };

  return (
    <div className="app">
      <main className="app-main">
        {tab === "today" && (
          <>
            <TodayScreen
              statuses={statuses}
              summary={summary}
              today={today}
              next={next}
              onStart={start}
            />
            {state.attempts.length === 0 && (
              <div style={{ padding: "0 16px" }}>
                <button className="btn-ghost wide" onClick={seedDemo}>
                  動作確認用のデモ履歴を入れる
                </button>
              </div>
            )}
          </>
        )}

        {tab === "map" && <MapScreen statuses={statuses} onStart={start} />}

        {tab === "me" && (
          <StatsScreen
            statuses={statuses}
            attempts={state.attempts}
            summary={summary}
            target={state.target}
            onEditTarget={() => setEditingTarget(true)}
            onReset={reset}
          />
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

import { useMemo, useState } from "react";
import { BottomNav, type Tab } from "./components/BottomNav";
import { SetupScreen } from "./components/SetupScreen";
import { SwipeSession } from "./components/SwipeSession";
import { TodayScreen } from "./screens/TodayScreen";
import { MapScreen } from "./screens/MapScreen";
import { StatsScreen } from "./screens/StatsScreen";
import { useStudyStore } from "./hooks/useStudyStore";
import { buildStatuses } from "./logic/mastery";
import { pickNext, summarize, summarizeToday } from "./logic/pace";
import { POINTS, findFaculty } from "./data/curriculum";
import type { KnowledgePoint } from "./types";
import "./app.css";

export default function App() {
  const { state, setTarget, recordAttempt, undoLastAttempt, reset, seedDemo } =
    useStudyStore();
  const [tab, setTab] = useState<Tab>("today");
  const [session, setSession] = useState<KnowledgePoint[] | null>(null);
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
          onRecord={recordAttempt}
          onUndo={undoLastAttempt}
          onClose={() => setSession(null)}
        />
      </div>
    );
  }

  const start = (points: KnowledgePoint[]) => {
    if (points.length > 0) setSession(points);
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
              <button className="btn-ghost wide" onClick={seedDemo}>
                動作確認用のデモ履歴を入れる
              </button>
            )}
          </>
        )}

        {tab === "map" && <MapScreen statuses={statuses} onStart={start} />}

        {tab === "me" && (
          <StatsScreen
            statuses={statuses}
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

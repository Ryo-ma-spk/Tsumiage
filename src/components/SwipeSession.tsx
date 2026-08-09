import { useMemo, useRef, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import type { KnowledgePoint } from "../types";
import { SUBJECT_BY_ID } from "../data/curriculum";

/** これ以上横に動かしたら判定を確定する（px） */
const SWIPE_THRESHOLD = 90;

interface Props {
  points: KnowledgePoint[];
  onRecord: (pointId: string, correct: boolean) => void;
  onClose: () => void;
}

interface Result {
  point: KnowledgePoint;
  correct: boolean;
}

export function SwipeSession({ points, onRecord, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const startX = useRef(0);

  // セッション中は同じ問題を出し続ける
  const questions = useMemo(
    () =>
      points.map(
        (p) => p.questions[Math.floor(Math.random() * p.questions.length)]
      ),
    [points]
  );

  const current = points[index];
  const question = questions[index];

  const commit = (correct: boolean) => {
    if (!current) return;
    onRecord(current.id, correct);
    setResults((prev) => [...prev, { point: current, correct }]);
    setDrag(0);
    setDragging(false);
    setShowAnswer(false);
    setIndex((i) => i + 1);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDrag(e.clientX - startX.current);
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    if (Math.abs(drag) >= SWIPE_THRESHOLD) {
      commit(drag > 0);
      return;
    }
    setDrag(0);
    setDragging(false);
  };

  if (!current) {
    const correctCount = results.filter((r) => r.correct).length;
    return (
      <div className="session session-done">
        <div className="done-score">
          {correctCount}
          <span> / {results.length}</span>
        </div>
        <p className="done-caption">おつかれさま</p>

        <ul className="done-list">
          {results.map((r) => (
            <li key={r.point.id}>
              <span className={r.correct ? "dot ok" : "dot ng"} />
              <span className="done-name">{r.point.name}</span>
              <span className="done-mark">
                {r.correct ? "解けた" : "あやしい"}
              </span>
            </li>
          ))}
        </ul>

        <button className="btn-primary wide" onClick={onClose}>
          もどる
        </button>
      </div>
    );
  }

  const subject = SUBJECT_BY_ID.get(current.subjectId);
  const intent = drag >= SWIPE_THRESHOLD ? "ok" : drag <= -SWIPE_THRESHOLD ? "ng" : "";

  return (
    <div className="session">
      <div className="session-bar">
        <button className="icon-btn" onClick={onClose} aria-label="閉じる">
          <X size={22} />
        </button>
        <div className="session-progress">
          <div
            className="session-progress-fill"
            style={{ width: `${(index / points.length) * 100}%` }}
          />
        </div>
        <span className="session-count">
          {index + 1}/{points.length}
        </span>
      </div>

      <div className="card-stage">
        {points[index + 1] && <div className="card card-behind" />}

        <div
          className={`card card-front ${intent}`}
          style={{
            transform: `translateX(${drag}px) rotate(${drag * 0.04}deg)`,
            transition: dragging ? "none" : "transform 0.25s ease",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="card-meta" style={{ color: subject?.color }}>
            {subject?.name} ・ {current.unit}
          </div>
          <div className="card-point">{current.name}</div>
          <p className="card-prompt">{question.prompt}</p>

          {showAnswer ? (
            <p className="card-answer">{question.answer}</p>
          ) : (
            <button
              className="btn-reveal"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setShowAnswer(true)}
            >
              答えを見る
            </button>
          )}

          <div className="card-stamp stamp-ok">解けた</div>
          <div className="card-stamp stamp-ng">あやしい</div>
        </div>
      </div>

      <div className="session-actions">
        <button className="round-btn ng" onClick={() => commit(false)}>
          <RotateCcw size={26} />
          <span>あやしい</span>
        </button>
        <button className="round-btn ok" onClick={() => commit(true)}>
          <Check size={26} />
          <span>解けた</span>
        </button>
      </div>

      <p className="session-hint">左右にスワイプでも判定できます</p>
    </div>
  );
}

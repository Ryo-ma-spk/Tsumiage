import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw, Sparkles, Undo2, X } from "lucide-react";
import type { KnowledgePoint } from "../types";
import { SUBJECT_BY_ID } from "../data/curriculum";
import { daysBetween } from "../logic/mastery";

/** これ以上横に動かしたら判定を確定する（px） */
const SWIPE_THRESHOLD = 90;
/** 上に振って「完璧」にするしきい値。誤爆しないよう横より深くとる */
const PERFECT_THRESHOLD = 120;

interface Props {
  points: KnowledgePoint[];
  /** 最後にその観点を触った日。「何日ぶり」の表示に使う */
  lastSeenById: Map<string, string | null>;
  onRecord: (
    pointId: string,
    correct: boolean,
    latencyMs: number,
    perfect?: boolean
  ) => void;
  onUndo: () => void;
  onClose: () => void;
}

interface Result {
  point: KnowledgePoint;
  correct: boolean;
  perfect?: boolean;
}

/**
 * 1枚1観点のカードを振って判定する。
 *
 * 問題文と答えは出さない。観点の問いかけを見て、頭の中で答えを作れたかを
 * その場で振る。アプリは参考書ではないので、学習そのものは教科書側でやる。
 */
export function SwipeSession({
  points,
  lastSeenById,
  onRecord,
  onUndo,
  onClose,
}: Props) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragUp, setDragUp] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const startX = useRef(0);
  const startY = useRef(0);
  /**
   * 判定に使う移動量。表示用の state とは別に ref でも持つ。
   * 素早く振ると pointerup が直前の setState より先に走ることがあり、
   * state だけを見ていると振ったのに確定しない。
   */
  const offset = useRef({ x: 0, y: 0 });
  /** そのカードが表示された時刻。想起にかけた時間を測る起点 */
  const shownAt = useRef(Date.now());

  const current = points[index];

  // カードが変わるたびに計測を測り直す
  useEffect(() => {
    shownAt.current = Date.now();
  }, [index]);

  const commit = (correct: boolean, perfect = false) => {
    if (!current) return;
    onRecord(current.id, correct, Date.now() - shownAt.current, perfect || undefined);
    setResults((prev) => [...prev, { point: current, correct, perfect }]);
    offset.current = { x: 0, y: 0 };
    setDrag(0);
    setDragUp(0);
    setDragging(false);
    setIndex((i) => i + 1);
  };

  const undo = () => {
    if (results.length === 0) return;
    onUndo();
    setResults((prev) => prev.slice(0, -1));
    offset.current = { x: 0, y: 0 };
    setDrag(0);
    setDragUp(0);
    setDragging(false);
    setIndex((i) => Math.max(0, i - 1));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    offset.current = { x: 0, y: 0 };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    // 動きの主な向きだけを採る。斜めに振れて両方が立つのを避ける
    const next =
      Math.abs(dy) > Math.abs(dx)
        ? { x: 0, y: Math.min(0, dy) }
        : { x: dx, y: 0 };

    offset.current = next;
    setDrag(next.x);
    setDragUp(next.y);
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    const { x, y } = offset.current;

    if (y <= -PERFECT_THRESHOLD) {
      commit(true, true);
      return;
    }
    if (Math.abs(x) >= SWIPE_THRESHOLD) {
      commit(x > 0);
      return;
    }
    offset.current = { x: 0, y: 0 };
    setDrag(0);
    setDragUp(0);
    setDragging(false);
  };

  if (!current) {
    const correctCount = results.filter((r) => r.correct).length;
    const shaky = results.filter((r) => !r.correct);

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
                {!r.correct ? "あやしい" : r.perfect ? "完璧" : "できた"}
              </span>
            </li>
          ))}
        </ul>

        {shaky.length > 0 && (
          <p className="done-followup">
            あやしかった{shaky.length}個は、教科書や問題集で当たり直しておくと
            次に出てきたとき戻せます。
          </p>
        )}

        <button className="btn-primary wide" onClick={onClose}>
          もどる
        </button>
      </div>
    );
  }

  const subject = SUBJECT_BY_ID.get(current.subjectId);
  const intent =
    dragUp <= -PERFECT_THRESHOLD
      ? "perfect"
      : drag >= SWIPE_THRESHOLD
      ? "ok"
      : drag <= -SWIPE_THRESHOLD
      ? "ng"
      : "";

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
            transform: `translate(${drag}px, ${dragUp}px) rotate(${drag * 0.04}deg)`,
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
          <p className="card-ask">{current.ask}</p>
          <div className="card-since">{sinceLabel(lastSeenById.get(current.id))}</div>

          <div className="card-stamp stamp-ok">できた</div>
          <div className="card-stamp stamp-ng">あやしい</div>
          <div className="card-stamp stamp-perfect">完璧</div>
        </div>
      </div>

      {/* 上スワイプと同じ向きに置いて、位置で意味が分かるようにする */}
      <button className="btn-perfect" onClick={() => commit(true, true)}>
        <Sparkles size={15} />
        完璧
      </button>

      <div className="session-actions">
        <button className="round-btn ng" onClick={() => commit(false)}>
          <RotateCcw size={26} />
          <span>あやしい</span>
        </button>
        <button className="round-btn ok" onClick={() => commit(true)}>
          <Check size={26} />
          <span>できた</span>
        </button>
      </div>

      <div className="session-foot">
        {results.length > 0 ? (
          <button className="btn-undo" onClick={undo}>
            <Undo2 size={16} />
            1つもどす
          </button>
        ) : (
          <p className="session-hint">左右・上にスワイプでも判定できます</p>
        )}
      </div>
    </div>
  );
}

/** 前回いつ触ったか。判定の目安になるので出す */
function sinceLabel(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return "はじめて";
  const days = daysBetween(lastSeenAt, new Date());
  if (days <= 0) return "今日やったところ";
  if (days === 1) return "きのうぶり";
  return `${days}日ぶり`;
}

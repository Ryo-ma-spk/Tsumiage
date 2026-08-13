import { useEffect, useRef, useState } from "react";
import { Undo2, X } from "lucide-react";
import type { CheckQuestion, KnowledgePoint } from "../types";
import { daysBetween } from "../logic/mastery";

/** これ以上横に動かしたら判定を確定する（px） */
const SWIPE_THRESHOLD = 90;
/** 上に振って「完璧」にするしきい値。誤爆しないよう横より深くとる */
const PERFECT_THRESHOLD = 120;

interface Props {
  points: KnowledgePoint[];
  /** 最後にその観点を触った日。「何日ぶり」の表示に使う */
  lastSeenById: Map<string, string | null>;
  /** 確認カードに回す観点。1セッションに1つだけ */
  auditPointId: string | null;
  checkFor: (pointId: string) => CheckQuestion | undefined;
  /** その観点を「積んだ」ことになっているか。外したときの言い方が変わる */
  isBuilt: (pointId: string) => boolean;
  onRecord: (
    pointId: string,
    correct: boolean,
    latencyMs: number,
    opts?: { perfect?: boolean; audit?: boolean }
  ) => void;
  onUndo: () => void;
  onClose: () => void;
}

interface Result {
  point: KnowledgePoint;
  correct: boolean;
  perfect?: boolean;
  audit?: boolean;
}

/**
 * 1枚1観点のカードを振って判定する。
 *
 * 問題文と答えは出さない。観点の問いかけを見て、頭の中で答えを作れたかを
 * その場で振る。ただし自己申告では「逆で覚えていた」を拾えないので、
 * 数回に1度だけ、答えと突き合わせられる確認カードを混ぜる。
 */
export function SwipeSession({
  points,
  lastSeenById,
  auditPointId,
  checkFor,
  isBuilt,
  onRecord,
  onUndo,
  onClose,
}: Props) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragUp, setDragUp] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  /** 確認カードを外した直後に出す画面 */
  const [missed, setMissed] = useState<{
    point: KnowledgePoint;
    picked: string;
    right: string;
    wasBuilt: boolean;
  } | null>(null);

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
  const check = current && current.id === auditPointId ? checkFor(current.id) : undefined;

  useEffect(() => {
    shownAt.current = Date.now();
  }, [index]);

  const commit = (
    correct: boolean,
    opts?: { perfect?: boolean; audit?: boolean }
  ) => {
    if (!current) return;
    onRecord(current.id, correct, Date.now() - shownAt.current, opts);
    setResults((prev) => [...prev, { point: current, correct, ...opts }]);
    offset.current = { x: 0, y: 0 };
    setDrag(0);
    setDragUp(0);
    setDragging(false);
    setIndex((i) => i + 1);
  };

  const answerCheck = (i: number) => {
    if (!current || !check) return;
    const correct = i === check.answerIndex;
    if (!correct) {
      setMissed({
        point: current,
        picked: check.choices[i],
        right: check.choices[check.answerIndex],
        wasBuilt: isBuilt(current.id),
      });
    }
    commit(correct, { audit: true });
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
    if (y <= -PERFECT_THRESHOLD) return commit(true, { perfect: true });
    if (Math.abs(x) >= SWIPE_THRESHOLD) return commit(x > 0);
    offset.current = { x: 0, y: 0 };
    setDrag(0);
    setDragUp(0);
    setDragging(false);
  };

  /* ---- 確認カードを外した直後。点はつけず、絵が変わったことを伝える ---- */
  if (missed) {
    return (
      <div className="session">
        <div className="fix">
          <div className="fix-move" aria-hidden>
            <i style={{ background: "var(--gold)" }} />
            <span className="ar">→</span>
            <i style={{ background: "var(--line)" }} />
          </div>
          <h2>1つ、まだだった</h2>
          <div className="fix-name">{missed.point.name}</div>

          <div className="fix-ans">
            <div className="k">えらんだの</div>
            <div className="picked">{missed.picked}</div>
            <div className="k" style={{ marginTop: 9 }}>
              ほんとうは
            </div>
            <div className="right">{missed.right}</div>
          </div>

          <p className="fix-note">
            {missed.wasBuilt ? (
              <>
                <b>逆で覚えていました。</b>
                ここは積んだことになっていた場所なので、放っておくと
                いちばん出てこなくなるところでした。見つかってよかったやつです。
              </>
            ) : (
              <>
                <b>逆で覚えていました。</b>
                こういうのは自分では気づけないので、たまに確認しています。
              </>
            )}
          </p>

          <button className="btn-primary" onClick={() => setMissed(null)}>
            つづける
          </button>
        </div>
      </div>
    );
  }

  /* ---- おわり ---- */
  if (!current) {
    const ok = results.filter((r) => r.correct).length;
    const followUp = results.filter((r) => !r.correct);

    return (
      <div className="session session-done">
        <div className="done-score">
          {ok} / {results.length}
        </div>
        <p className="done-caption">おつかれさま</p>

        <ul className="done-list">
          {results.map((r) => (
            <li key={r.point.id}>
              <span className="em">{resultEmoji(r)}</span>
              <span className="done-name">{r.point.name}</span>
              <span className={`done-mark ${resultClass(r)}`}>
                {resultLabel(r)}
              </span>
            </li>
          ))}
        </ul>

        {followUp.length > 0 && (
          <p className="done-followup">
            🤔 と 🔍 の{followUp.length}つは、教科書や問題集で当たり直しておくと、
            次に出てきたとき戻せます。
          </p>
        )}

        <button className="btn-primary green" onClick={onClose}>
          もどる
        </button>
      </div>
    );
  }

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

      {check ? (
        /* ---- 確認カード。テストではなく、鏡のゆがみを見ている ---- */
        <>
          <div className="check-head">
            🔍 たまに、ほんとうに合っているか見ています
          </div>
          <p className="check-q">{check.prompt}</p>
          <div className="check-opts">
            {check.choices.map((c, i) => (
              <button key={c} className="check-opt" onClick={() => answerCheck(i)}>
                {c}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
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
              <div className="card-meta">{current.unit}</div>
              <p className="card-ask">{current.ask}</p>
              <span className="card-since">
                {sinceLabel(lastSeenById.get(current.id))}
              </span>

              <div className="card-stamp stamp-ok">できた</div>
              <div className="card-stamp stamp-ng">あやしい</div>
              <div className="card-stamp stamp-perfect">完璧</div>
            </div>
          </div>

          {/* 上スワイプと同じ向きに置いて、位置で意味が分かるようにする */}
          <button className="btn-perfect" onClick={() => commit(true, { perfect: true })}>
            ⭐️ 完璧
          </button>

          <div className="session-actions">
            <button className="round-btn ng" onClick={() => commit(false)}>
              <span className="em">🤔</span>あやしい
            </button>
            <button className="round-btn ok" onClick={() => commit(true)}>
              <span className="em">👍</span>できた
            </button>
          </div>

          <div className="session-foot">
            {results.length > 0 ? (
              <button className="btn-undo" onClick={undo}>
                <Undo2 size={15} />
                1つもどす
              </button>
            ) : (
              <p className="session-hint">左右・上にスワイプでもOK</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function resultEmoji(r: Result): string {
  if (r.audit) return "🔍";
  if (!r.correct) return "🤔";
  return r.perfect ? "⭐️" : "👍";
}
function resultLabel(r: Result): string {
  if (r.audit) return r.correct ? "合ってた" : "まだだった";
  if (!r.correct) return "あやしい";
  return r.perfect ? "完璧" : "できた";
}
function resultClass(r: Result): string {
  if (!r.correct) return "ng";
  return r.perfect ? "perfect" : "";
}

/** 前回いつ触ったか。判定の目安になるので出す */
function sinceLabel(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return "はじめて";
  const days = daysBetween(lastSeenAt, new Date());
  if (days <= 0) return "今日やったところ";
  if (days === 1) return "きのうぶり";
  return `${days}日ぶり`;
}

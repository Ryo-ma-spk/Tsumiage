import { Play } from "lucide-react";
import type { KnowledgePoint, PointStatus } from "../types";
import { buildQueue, dailyShortfall, type PaceSummary, type TodaySummary } from "../logic/pace";
import { daysBetween } from "../logic/mastery";
import { SUBJECT_BY_ID } from "../data/curriculum";

interface Props {
  statuses: PointStatus[];
  summary: PaceSummary;
  today: TodaySummary;
  next: PointStatus | null;
  onStart: (points: KnowledgePoint[]) => void;
}

/**
 * 今日やることを1つだけ出す画面。
 * 選択肢を並べない。決めるのはアプリ側の仕事。
 *
 * 今日ぶんを踏み終えたら、はっきり終わりだと言い切る。
 * 終わりが来ないと、どれだけ進んでも安心には変わらない。
 */
export function TodayScreen({ statuses, summary, today, next, onStart }: Props) {
  const queue = buildQueue(statuses);
  const subject = next ? SUBJECT_BY_ID.get(next.point.subjectId) : undefined;
  const shortfall = dailyShortfall(summary);

  const signal = !summary.measurable
    ? { text: "まだ測っていません", tone: "idle" }
    : summary.projectedPct >= 95
    ? { text: "間に合う", tone: "good" }
    : summary.projectedPct >= 75
    ? { text: "きわどい", tone: "warn" }
    : { text: "このままだと足りない", tone: "bad" };

  return (
    <div className="screen">
      <header className="today-head">
        <div className="countdown">
          受験まで <strong>{summary.daysLeft}</strong> 日
        </div>
        <div className={`signal ${signal.tone}`}>
          {summary.measurable ? (
            <span className="signal-pct">
              {Math.round(summary.projectedPct)}%
            </span>
          ) : (
            <span className="signal-pct signal-pct-idle">—</span>
          )}
          <span className="signal-text">{signal.text}</span>
        </div>
        <p className="signal-sub">
          {!summary.measurable
            ? "同じ観点を、日をあけてもう一度できたら見込みが出せます"
            : shortfall > 0
            ? `1日あと ${shortfall}つ 増やせば間に合います`
            : "今のペースのまま受験日を迎えたときに、覚えている見込みの割合"}
        </p>
      </header>

      {!next ? (
        <section className="next-card">
          <h2 className="next-name">今日ぶんは終わりました</h2>
          <p className="next-reason">
            出題範囲はすべて、受験日まで持つ見込みです。
          </p>
        </section>
      ) : today.completed ? (
        <section className="next-card done">
          <h2 className="next-name">今日ぶん、終わりました</h2>
          <div className="today-dots" aria-hidden>
            {Array.from({ length: today.goal }, (_, i) => (
              <span key={i} className="today-dot filled" />
            ))}
          </div>
          <p className="next-reason">ここまで {Math.round(summary.progressPct)}% 踏破</p>

          <button className="btn-ghost" onClick={() => onStart(queue)}>
            まだやる
          </button>
        </section>
      ) : (
        <section className="next-card">
          <div className="next-label">つぎはこれ</div>
          <div className="next-subject" style={{ color: subject?.color }}>
            {subject?.name} ・ {next.point.unit}
          </div>
          <h2 className="next-name">{next.point.name}</h2>
          <div className="next-reason">{reasonFor(next)}</div>

          <div className="today-dots" aria-hidden>
            {Array.from({ length: today.goal }, (_, i) => (
              <span
                key={i}
                className={`today-dot ${i < today.done ? "filled" : ""}`}
              />
            ))}
          </div>
          <p className="today-remain">
            今日ぶん あと {Math.max(0, today.goal - today.done)}つ
          </p>

          <button className="btn-primary wide" onClick={() => onStart(queue)}>
            <Play size={20} />
            {queue.length}問はじめる
          </button>
        </section>
      )}
    </div>
  );
}

function reasonFor(status: PointStatus): string {
  if (status.everMastered && status.needsReview) {
    return "一度は思い出せていた観点。取り戻すのは早い";
  }
  if (status.level === "touched") return "前回つまずいた観点";
  if (status.level === "solved") return "あと1回で定着";

  if (status.level === "mastered" && status.staleAt) {
    const left = Math.max(0, daysBetween(new Date(), status.staleAt));
    return `あと${left}日で薄れる見込み。いま戻すと長く持ちます`;
  }

  // 先が大きく開く観点は、頻出であることより「進める」ほうが効く
  if (status.descendants >= 3) {
    return `ここを踏むと、先の${status.descendants}観点に進めます`;
  }
  if (status.weight >= 3) return "志望校でよく出る観点";
  if (status.descendants > 0) {
    return `ここを踏むと、先の${status.descendants}観点に進めます`;
  }
  return "まだ手をつけていない観点";
}

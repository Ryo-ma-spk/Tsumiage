import { Play } from "lucide-react";
import type { KnowledgePoint, PointStatus } from "../types";
import { buildQueue, type PaceSummary } from "../logic/pace";
import { SUBJECT_BY_ID } from "../data/curriculum";

interface Props {
  statuses: PointStatus[];
  summary: PaceSummary;
  next: PointStatus | null;
  onStart: (points: KnowledgePoint[]) => void;
}

/**
 * 今日やることを1つだけ出す画面。
 * 選択肢を並べない。決めるのはアプリ側の仕事。
 */
export function TodayScreen({ statuses, summary, next, onStart }: Props) {
  const queue = buildQueue(statuses);
  const subject = next ? SUBJECT_BY_ID.get(next.point.subjectId) : undefined;

  const signal = summary.projectedPct >= 95
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
          <span className="signal-pct">{Math.round(summary.projectedPct)}%</span>
          <span className="signal-text">{signal.text}</span>
        </div>
        <p className="signal-sub">
          今のペースのまま受験日を迎えたときの到達率
        </p>
      </header>

      {next ? (
        <section className="next-card">
          <div className="next-label">つぎはこれ</div>
          <div
            className="next-subject"
            style={{ color: subject?.color }}
          >
            {subject?.name} ・ {next.point.unit}
          </div>
          <h2 className="next-name">{next.point.name}</h2>
          <div className="next-reason">{reasonFor(next)}</div>

          <button className="btn-primary wide" onClick={() => onStart(queue)}>
            <Play size={20} />
            {queue.length}問はじめる
          </button>
        </section>
      ) : (
        <section className="next-card">
          <h2 className="next-name">今日ぶんは終わりました</h2>
          <p className="next-reason">出題範囲はすべて定着しています。</p>
        </section>
      )}

      <div className="today-stats">
        <div className="stat">
          <span className="stat-value">{summary.remainingPoints}</span>
          <span className="stat-label">残りの観点</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {summary.requiredPointsPerDay.toFixed(1)}
          </span>
          <span className="stat-label">1日あたり必要</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {summary.actualPointsPerDay.toFixed(1)}
          </span>
          <span className="stat-label">いまのペース</span>
        </div>
      </div>
    </div>
  );
}

function reasonFor(status: PointStatus): string {
  if (status.needsReview) return "しばらく空いたので復習のタイミング";
  if (status.level === "touched") return "前回つまずいた観点";
  if (status.level === "solved") return "あと1回で定着";
  return status.weight >= 3 ? "志望校でよく出る観点" : "まだ手をつけていない観点";
}

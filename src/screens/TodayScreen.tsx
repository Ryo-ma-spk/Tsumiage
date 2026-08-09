import { Play } from "lucide-react";
import type { KnowledgePoint, PointStatus } from "../types";
import { buildQueue, type PaceSummary } from "../logic/pace";
import { daysBetween } from "../logic/mastery";
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
  const started = statuses.some((s) => s.lastAttemptAt !== null);

  const signal = !started
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
          {started ? (
            <span className="signal-pct">
              {Math.round(summary.projectedPct)}%
            </span>
          ) : (
            <span className="signal-pct signal-pct-idle">—</span>
          )}
          <span className="signal-text">{signal.text}</span>
        </div>
        <p className="signal-sub">
          {started
            ? "今のペースのまま受験日を迎えたときに、覚えている見込みの割合"
            : "何回か解くと、受験日の見込みが出せるようになります"}
        </p>
      </header>

      {next ? (
        <section className="next-card">
          <div className="next-label">つぎはこれ</div>
          <div className="next-subject" style={{ color: subject?.color }}>
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
          <p className="next-reason">
            出題範囲はすべて、受験日まで持つ見込みです。
          </p>
        </section>
      )}

      <div className="today-stats">
        <div className="stat">
          <span className="stat-value">{Math.round(summary.progressPct)}%</span>
          <span className="stat-label">ここまで踏破</span>
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
  if (status.everMastered && status.needsReview) {
    return "一度は解けていた観点。取り戻すのは早い";
  }
  if (status.level === "touched") return "前回つまずいた観点";
  if (status.level === "solved") return "あと1回で定着";

  if (status.level === "mastered" && status.staleAt) {
    const left = Math.max(0, daysBetween(new Date(), status.staleAt));
    return `あと${left}日で薄れる見込み。いま戻すと長く持ちます`;
  }

  if (status.weight >= 3) return "志望校でよく出る観点";
  if (status.descendants > 0) {
    return `ここを踏むと、先の${status.descendants}観点に進めます`;
  }
  return "まだ手をつけていない観点";
}

import { Settings } from "lucide-react";
import type { Attempt, PointStatus, Target } from "../types";
import type { PaceSummary } from "../logic/pace";
import { examRiskPoints, suspectedMisconceptions } from "../logic/pace";
import { daysBetween } from "../logic/mastery";
import { builtCount, completedUnitCount, summarizeUnits } from "../logic/units";
import { findFaculty } from "../data/curriculum";
import { cellClass } from "../components/pointVisual";

interface Props {
  statuses: PointStatus[];
  attempts: Attempt[];
  summary: PaceSummary;
  target: Target;
  onEditTarget: () => void;
  onReset: () => void;
}

/**
 * 全体をまとめて見る場所。
 *
 * 55個の帯はここにだけ置く。見出しには出さない（壁になるので）が、
 * 見たい人のために閉じてもいない。
 */
export function StatsScreen({
  statuses,
  attempts,
  summary,
  target,
  onEditTarget,
  onReset,
}: Props) {
  const { uni, faculty } = findFaculty(target.universityId, target.facultyId);
  const units = summarizeUnits(statuses);
  const built = builtCount(statuses);
  const sealed = completedUnitCount(units);

  const misconceptions = suspectedMisconceptions(statuses, attempts);
  const atRisk = examRiskPoints(statuses, target.examDate);

  const fresh = statuses.filter(
    (s) => s.everMastered && !s.needsReview && s.freshness >= 0.35
  ).length;
  const faded = built - fresh;

  return (
    <div className="screen">
      <header className="me-head">
        <div>
          <div className="me-target">{uni?.name}</div>
          <div className="me-faculty">{faculty?.name}</div>
        </div>
        <button className="icon-btn" onClick={onEditTarget} aria-label="志望校を変更">
          <Settings size={20} />
        </button>
      </header>

      <div className="mirror" style={{ marginTop: 12 }}>
        <div className="mirror-top">
          <span className="mirror-n">{built}</span>
          <span className="mirror-of">個 積んだ</span>
          <span className="mirror-cap">
            🏅 {sealed} / {units.length} 単元
          </span>
        </div>
        <div className="strip">
          {statuses.map((s) => (
            <i key={s.point.id} className={`blk ${cellClass(s)}`} />
          ))}
        </div>
        <div className="legend">
          <span>
            <i style={{ background: "var(--amber)" }} />
            覚えている {fresh}
          </span>
          <span>
            <i style={{ background: "var(--amber-pale)" }} />
            薄れてきた {faded}
          </span>
          <span>
            <i style={{ background: "var(--line)" }} />
            これから {statuses.length - built}
          </span>
        </div>
      </div>

      <div className="duo">
        <div className="duo-cell">
          <b>{summary.daysLeft}</b>
          <small>受験まで（日）</small>
        </div>
        <div className="duo-cell">
          <b>{statuses.length - built}</b>
          <small>まだ入っていない</small>
        </div>
      </div>

      {misconceptions.length > 0 && (
        <section className="block">
          <h3>🔍 勘違いかも</h3>
          <p className="block-note">
            覚えたつもりだったけれど、確認で外したところ
          </p>
          <ul className="point-list">
            {misconceptions.map((s) => (
              <li key={s.point.id} className="misconception">
                <span className="point-name">{s.point.name}</span>
                <span className="point-tag hot">もう一度</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="block">
        <h3>そろそろ薄れそう</h3>
        <p className="block-note">この順で戻ってきます</p>
        {atRisk.length === 0 ? (
          <p className="empty">いまのところなし</p>
        ) : (
          <ul className="point-list">
            {atRisk.map((s) => (
              <li key={s.point.id}>
                <span className="point-name">{s.point.name}</span>
                <span className={`point-tag ${staleHot(s) ? "hot" : ""}`}>
                  {staleLabel(s)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button className="btn-ghost wide danger" onClick={onReset}>
        学習データを消す
      </button>
    </div>
  );
}

function staleHot(s: PointStatus): boolean {
  return s.staleAt === null || daysBetween(new Date(), s.staleAt) <= 0;
}

function staleLabel(s: PointStatus): string {
  if (staleHot(s)) return "いま薄れてる";
  return `あと${daysBetween(new Date(), s.staleAt as string)}日`;
}

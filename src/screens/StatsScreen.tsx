import { AlertTriangle, CheckCircle2, Settings } from "lucide-react";
import type { PointStatus } from "../types";
import type { PaceSummary } from "../logic/pace";
import { riskyPoints, settledPoints } from "../logic/pace";
import { SUBJECTS, SUBJECT_BY_ID, findFaculty } from "../data/curriculum";
import type { Target } from "../types";

interface Props {
  statuses: PointStatus[];
  summary: PaceSummary;
  target: Target;
  onEditTarget: () => void;
  onReset: () => void;
}

export function StatsScreen({
  statuses,
  summary,
  target,
  onEditTarget,
  onReset,
}: Props) {
  const { uni, faculty } = findFaculty(target.universityId, target.facultyId);
  const risky = riskyPoints(statuses);
  const settled = settledPoints(statuses);

  const bySubject = SUBJECTS.map((s) => {
    const items = statuses.filter((st) => st.point.subjectId === s.id);
    const done = items.filter(
      (st) => st.level === "mastered" && !st.needsReview
    ).length;
    return { subject: s, done, total: items.length };
  }).filter((row) => row.total > 0);

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

      <Ring pct={summary.progressPct} />

      <div className="pace-grid">
        <div className="pace-item">
          <span className="pace-value">{summary.daysLeft}</span>
          <span className="pace-label">受験まで（日）</span>
        </div>
        <div className="pace-item">
          <span className="pace-value">{summary.remainingPoints}</span>
          <span className="pace-label">残りの観点</span>
        </div>
        <div className="pace-item">
          <span className="pace-value">
            {summary.requiredPointsPerDay.toFixed(1)}
          </span>
          <span className="pace-label">1日あたり必要</span>
        </div>
        <div className={`pace-item ${summary.onTrack ? "good" : "bad"}`}>
          <span className="pace-value">
            {summary.actualPointsPerDay.toFixed(1)}
          </span>
          <span className="pace-label">いまのペース</span>
        </div>
      </div>

      <section className="block">
        <h3>科目ごと</h3>
        {bySubject.map(({ subject, done, total }) => (
          <div key={subject.id} className="subject-row">
            <span className="subject-name">{subject.name}</span>
            <div className="subject-track">
              <div
                className="subject-fill"
                style={{
                  width: `${total === 0 ? 0 : (done / total) * 100}%`,
                  background: subject.color,
                }}
              />
            </div>
            <span className="subject-count">
              {done}/{total}
            </span>
          </div>
        ))}
      </section>

      <section className="block">
        <h3>
          <AlertTriangle size={16} /> ここが不安
        </h3>
        <p className="block-note">よく出るのに、まだ定着していない観点</p>
        {risky.length === 0 ? (
          <p className="empty">いまのところなし</p>
        ) : (
          <ul className="point-list">
            {risky.map((s) => (
              <li key={s.point.id}>
                <span
                  className="pill"
                  style={{
                    background: SUBJECT_BY_ID.get(s.point.subjectId)?.color,
                  }}
                />
                <span className="point-name">{s.point.name}</span>
                <span className="point-tag">
                  {s.needsReview ? "要復習" : s.level === "touched" ? "あやしい" : "未着手"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="block">
        <h3>
          <CheckCircle2 size={16} /> もう見なくていい
        </h3>
        <p className="block-note">
          間隔をあけて2回以上正答した観点。{settled.length}個ぶんの時間が浮いています。
        </p>
        {settled.length === 0 ? (
          <p className="empty">まだありません</p>
        ) : (
          <div className="settled-tags">
            {settled.slice(0, 12).map((s) => (
              <span key={s.point.id} className="settled-tag">
                {s.point.name}
              </span>
            ))}
            {settled.length > 12 && (
              <span className="settled-tag more">ほか{settled.length - 12}個</span>
            )}
          </div>
        )}
      </section>

      <button className="btn-ghost wide danger" onClick={onReset}>
        学習データを消す
      </button>
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 68;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(100, pct) / 100);

  return (
    <div className="ring-wrap">
      <svg viewBox="0 0 160 160" className="ring">
        <circle cx="80" cy="80" r={r} className="ring-track" />
        <circle
          cx="80"
          cy="80"
          r={r}
          className="ring-fill"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-center">
        <span className="ring-pct">{Math.round(pct)}%</span>
        <span className="ring-label">定着</span>
      </div>
    </div>
  );
}

import { AlertTriangle, CheckCircle2, Settings, TrendingDown } from "lucide-react";
import type { PointStatus, Target } from "../types";
import type { PaceSummary } from "../logic/pace";
import { examRiskPoints, settledPoints, weakPoints } from "../logic/pace";
import { daysBetween } from "../logic/mastery";
import { SUBJECTS, SUBJECT_BY_ID, findFaculty } from "../data/curriculum";

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
  const atRisk = examRiskPoints(statuses, target.examDate);
  const weak = weakPoints(statuses);
  const settled = settledPoints(statuses);

  const bySubject = SUBJECTS.map((s) => {
    const items = statuses.filter((st) => st.point.subjectId === s.id);
    const done = items.filter((st) => st.everMastered).length;
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

      <Ring pct={summary.progressPct} condition={summary.conditionPct} />

      <div className="pace-grid">
        <div className="pace-item">
          <span className="pace-value">{summary.daysLeft}</span>
          <span className="pace-label">受験まで（日）</span>
        </div>
        <div className="pace-item">
          <span className="pace-value">{summary.remainingPoints}</span>
          <span className="pace-label">まだ踏んでいない</span>
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
        <p className="block-note">一度でも定着させた観点の数。ここは減りません</p>
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
          <TrendingDown size={16} /> 本番までに薄れる観点
        </h3>
        <p className="block-note">
          一度は解けた観点。薄れるのが近い順に、この並びで復習に戻ってきます
        </p>
        {atRisk.length === 0 ? (
          <p className="empty">いまのところなし</p>
        ) : (
          <ul className="point-list">
            {atRisk.map((s) => (
              <li key={s.point.id}>
                <span
                  className="pill"
                  style={{
                    background: SUBJECT_BY_ID.get(s.point.subjectId)?.color,
                  }}
                />
                <span className="point-name">{s.point.name}</span>
                <span className="point-tag">{staleLabel(s)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="block">
        <h3>
          <AlertTriangle size={16} /> つまずいている
        </h3>
        <p className="block-note">まだ一度も定着していない観点</p>
        {weak.length === 0 ? (
          <p className="empty">いまのところなし</p>
        ) : (
          <ul className="point-list">
            {weak.map((s) => (
              <li key={s.point.id}>
                <span
                  className="pill"
                  style={{
                    background: SUBJECT_BY_ID.get(s.point.subjectId)?.color,
                  }}
                />
                <span className="point-name">{s.point.name}</span>
                <span className="point-tag">頻出度 {"★".repeat(s.weight)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="block">
        <h3>
          <CheckCircle2 size={16} /> いま見なくていい
        </h3>
        <p className="block-note">
          まだ覚えている見込みの観点。{settled.length}個ぶんの時間が浮いています。
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

function staleLabel(status: PointStatus): string {
  if (status.staleAt === null) return "取りこぼし中";
  const left = daysBetween(new Date(), status.staleAt);
  if (left <= 0) return "いま薄れている";
  return `あと${left}日`;
}

/** 外側の輪が踏破率、内側の弧がいまのコンディション */
function Ring({ pct, condition }: { pct: number; condition: number }) {
  const r = 68;
  const inner = 52;
  const circumference = 2 * Math.PI * r;
  const innerCircumference = 2 * Math.PI * inner;

  const offset = circumference * (1 - Math.min(100, pct) / 100);
  const innerOffset =
    innerCircumference * (1 - (Math.min(100, condition) / 100) * (pct / 100));

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
        <circle
          cx="80"
          cy="80"
          r={inner}
          className="ring-fill ring-fill-inner"
          strokeDasharray={innerCircumference}
          strokeDashoffset={innerOffset}
        />
      </svg>
      <div className="ring-center">
        <span className="ring-pct">{Math.round(pct)}%</span>
        <span className="ring-label">踏破</span>
      </div>
      <p className="ring-note">
        踏破したうち、いま覚えている {Math.round(condition)}%
      </p>
    </div>
  );
}

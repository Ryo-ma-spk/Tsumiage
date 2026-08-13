import type { KnowledgePoint, PointStatus } from "../types";
import { buildQueue, dailyShortfall, type PaceSummary } from "../logic/pace";
import { daysBetween } from "../logic/mastery";
import {
  builtCount,
  focusUnit,
  summarizeUnits,
  type UnitSummary,
} from "../logic/units";
import { cellClass } from "../components/pointVisual";

interface Props {
  statuses: PointStatus[];
  summary: PaceSummary;
  next: PointStatus | null;
  onStart: (points: KnowledgePoint[]) => void;
}

/**
 * 次にやることを1つだけ出す画面。
 *
 * いちばん大きいのは「覚えた数」。受験日の見込みは1行に落とす。
 * このアプリの性格は「自分が覚えたことの可視化」であって、
 * 間に合うかどうかの予測は主役ではないため。
 */
export function TodayScreen({ statuses, summary, next, onStart }: Props) {
  const queue = buildQueue(statuses);
  const units = summarizeUnits(statuses);
  const focus = focusUnit(units, next);
  const built = builtCount(statuses);
  const shortfall = dailyShortfall(summary);

  return (
    <div className="screen">
      <Mirror built={built} focus={focus} caption={`受験まで ${summary.daysLeft}日`} />

      <p className="signal-line">
        {!summary.measurable
          ? "日をあけて同じところをもう一度できると、受験日の見込みが出せます"
          : shortfall > 0
          ? `いまのペースだと、受験日に覚えているのは ${Math.round(
              summary.projectedPct
            )}%。1日あと${shortfall}つ増やすと間に合います`
          : `いまのペースだと、受験日に覚えているのは ${Math.round(
              summary.projectedPct
            )}%。間に合います`}
      </p>

      {!next ? (
        <section className="panel next-card">
          <h2 className="next-name">いま見直すところはありません</h2>
          <p className="next-reason">
            覚えたところは、受験日まで持つ見込みです。
          </p>
        </section>
      ) : (
        <section className="panel next-card">
          <span className="tag">つぎ</span>
          <h2 className="next-name">{next.point.name}</h2>
          <p className="next-reason">{reasonFor(next)}</p>

          <button className="btn-primary" onClick={() => onStart(queue)}>
            {queue.length}つ はじめる
          </button>
        </section>
      )}
    </div>
  );
}

/**
 * 覚えた数と、いま進めている単元。
 *
 * 分母に全体（55個）を置かない。同じ 3/55 が、学力の高い子には燃料になり
 * まだ始めたばかりの子には壁になるため。分母はいつも手の届く単元にする。
 */
export function Mirror({
  built,
  focus,
  caption,
}: {
  built: number;
  focus: UnitSummary | null;
  caption: string;
}) {
  return (
    <div className="mirror">
      <div className="mirror-top">
        <span className="mirror-n">{built}</span>
        <span className="mirror-of">覚えた</span>
        <span className="mirror-cap">{caption}</span>
      </div>

      {focus && (
        <div className="near">
          <span className="near-unit">{focus.unit}</span>
          <span className="near-cells">
            {focus.points.map((s) => (
              <i key={s.point.id} className={`cell ${cellClass(s)}`} />
            ))}
          </span>
          <span
            className={`near-left ${
              focus.complete && focus.fading === 0 ? "done" : ""
            }`}
          >
            {!focus.complete
              ? `あと${focus.remaining}つ`
              : focus.fading > 0
              ? `${focus.fading}つ 忘れかけ`
              : "ぜんぶ覚えた"}
          </span>
        </div>
      )}
    </div>
  );
}

function reasonFor(status: PointStatus): string {
  if (status.everMastered && status.needsReview) {
    return "前に覚えたところ。戻すのは早いはずです";
  }
  if (status.level === "touched") return "前回できなかったところ";
  if (status.level === "solved") return "もう一度できれば、覚えたことになります";

  if (status.level === "mastered" && status.staleAt) {
    const left = Math.max(0, daysBetween(new Date(), status.staleAt));
    return `あと${left}日で忘れそうです。いま戻すと長く持ちます`;
  }

  if (status.needsFoundation) {
    return "土台がまだ。先に戻ったほうが早いかもしれません";
  }
  if (status.descendants >= 3) {
    return `この先 ${status.descendants}つ の土台になります`;
  }
  if (status.weight >= 3) return "志望校でよく出るところ";
  return "まだやっていないところ";
}

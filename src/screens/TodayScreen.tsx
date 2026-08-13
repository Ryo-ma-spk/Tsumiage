import type { KnowledgePoint, PointStatus } from "../types";
import {
  buildQueue,
  dailyShortfall,
  type PaceSummary,
  type TodaySummary,
} from "../logic/pace";
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
  today: TodaySummary;
  next: PointStatus | null;
  onStart: (points: KnowledgePoint[]) => void;
}

/**
 * 今日やることを1つだけ出す画面。
 *
 * いちばん大きいのは「積んだ数」。受験日の見込みは1行に落とす。
 * このアプリの性格は「自分が覚えたことの可視化」であって、
 * 間に合うかどうかの予測は主役ではないため。
 */
export function TodayScreen({ statuses, summary, today, next, onStart }: Props) {
  const queue = buildQueue(statuses);
  const units = summarizeUnits(statuses);
  const focus = focusUnit(units, next);
  const built = builtCount(statuses);
  const shortfall = dailyShortfall(summary);

  return (
    <div className="screen">
      <Mirror
        built={built}
        focus={focus}
        caption={`受験まで ${summary.daysLeft}日`}
      />

      <p className="signal-line">
        {!summary.measurable
          ? "受験日の見込みは、同じところを日をあけてもう一度できたら出ます"
          : shortfall > 0
          ? `このままだと本番で ${Math.round(summary.projectedPct)}%。` +
            `1日あと${shortfall}つ 増やせば間に合います`
          : `このままだと本番で ${Math.round(summary.projectedPct)}%。間に合います`}
      </p>

      {!next ? (
        <section className="panel next-card">
          <h2 className="next-name">ぜんぶ そろっています</h2>
          <p className="next-reason">
            いまのところ、受験日まで持つ見込みです。
          </p>
        </section>
      ) : today.completed ? (
        <section className="panel next-card">
          <div className="done-hero">
            <div className="em">🧱</div>
            <h2>今日ぶん、おわり</h2>
            <p>{today.goal}つ積み上げました</p>
            <button className="btn-ghost" onClick={() => onStart(queue)}>
              まだやる
            </button>
          </div>
        </section>
      ) : (
        <section className="panel next-card">
          <span className="tag">つぎはこれ</span>
          <h2 className="next-name">{next.point.name}</h2>
          <div className="next-reason">{reasonFor(next)}</div>

          <div className="pips" aria-hidden>
            {Array.from({ length: today.goal }, (_, i) => (
              <span key={i} className={`pip ${i < today.done ? "on" : ""}`} />
            ))}
          </div>
          <p className="pips-note">
            今日ぶん あと {Math.max(0, today.goal - today.done)}つ
          </p>

          <button className="btn-primary" onClick={() => onStart(queue)}>
            はじめる
          </button>
        </section>
      )}
    </div>
  );
}

/**
 * 積んだ数と、いま埋めている単元。
 *
 * 分母に全体（55個）を置かない。同じ 3/55 が、上位層には燃料になり
 * 下位層には壁になるため。分母はいつも手の届く単元にする。
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
        <span className="mirror-of">個 積んだ</span>
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
          <span className={`near-left ${focus.complete ? "done" : ""}`}>
            {focus.complete
              ? "🏅 そろった"
              : built === 0
              ? `${focus.remaining}つで さいしょの🏅`
              : `あと${focus.remaining}つ`}
          </span>
        </div>
      )}
    </div>
  );
}


function reasonFor(status: PointStatus): string {
  if (status.everMastered && status.needsReview) {
    return "一度は思い出せていたところ。取り戻すのは早い";
  }
  if (status.level === "touched") return "前回つまずいたところ";
  if (status.level === "solved") return "あと1回で自分のものになります";

  if (status.level === "mastered" && status.staleAt) {
    const left = Math.max(0, daysBetween(new Date(), status.staleAt));
    return `あと${left}日で薄れる見込み。いま戻すと長く持ちます`;
  }

  if (status.needsFoundation) {
    return "土台がまだですが、やってもOKです";
  }
  if (status.descendants >= 3) {
    return "ここは、この先いろんなところの土台になります";
  }
  if (status.weight >= 3) return "志望校でよく出るところ";
  return "まだ手をつけていないところ";
}

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { KnowledgePoint, PointStatus } from "../types";
import { buildDex, completedUnitCount, summarizeUnits, type UnitSummary } from "../logic/units";
import { builtCount } from "../logic/units";
import { daysBetween } from "../logic/mastery";
import { cellClass } from "../components/pointVisual";

interface Props {
  statuses: PointStatus[];
  onStart: (points: KnowledgePoint[]) => void;
}

/**
 * マップ。地図の形にせず、単元ごとの図鑑にする。
 *
 * 並びは「もうすぐそろう → いま埋めている → そろった → まだ手つかず」。
 * 記述順に並べると、始めたばかりの人には空のマスが先に来て壁になる。
 */
export function MapScreen({ statuses, onStart }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const units = summarizeUnits(statuses);

  const opened = units.find((u) => u.unit === open);
  if (opened) {
    return (
      <UnitDetail
        unit={opened}
        statuses={statuses}
        onBack={() => setOpen(null)}
        onStart={onStart}
      />
    );
  }

  const dex = buildDex(units);
  const done = completedUnitCount(units);

  return (
    <div className="screen">
      <div className="dex-head">
        <div>
          <span className="n">🏅 {done}</span> <small>単元そろった</small>
        </div>
        <span className="tag">{builtCount(statuses)} 個</span>
      </div>

      <Group title="もうすぐそろう" units={dex.near} kind="near" onOpen={setOpen} />
      {dex.near.length > 0 && (
        <p className="dex-note">
          ✨ <b>あと1つずつ</b>です<br />
          {dex.near.map((u) => {
            const left = u.points.find((s) => !s.everMastered);
            return (
              <span key={u.unit}>
                {u.unit} …… {left?.point.name}
                <br />
              </span>
            );
          })}
        </p>
      )}

      <Group title="いま埋めている" units={dex.active} onOpen={setOpen} />
      <Group
        title={`そろった ${dex.complete.length}`}
        units={dex.complete}
        kind="complete"
        onOpen={setOpen}
      />
      <Group
        title={`まだ手をつけていない ${dex.untouched.length}`}
        units={dex.untouched}
        kind="untouched"
        onOpen={setOpen}
      />
    </div>
  );
}

function Group({
  title,
  units,
  kind = "",
  onOpen,
}: {
  title: string;
  units: UnitSummary[];
  kind?: string;
  onOpen: (unit: string) => void;
}) {
  if (units.length === 0) return null;
  return (
    <>
      <div className="dex-group">{title}</div>
      <div className="dex-list">
        {units.map((u) => (
          <button
            key={u.unit}
            className={`unit-row ${kind}`}
            onClick={() => onOpen(u.unit)}
          >
            <span className="unit-name">{u.unit}</span>
            <span className="unit-cells">
              {u.points.map((s) => (
                <i key={s.point.id} className={`cell ${cellClass(s)}`} />
              ))}
            </span>
            <span className="unit-count">
              {u.done}/{u.total}
            </span>
            <span className="unit-seal">
              {u.complete ? "🏅" : u.remaining === 1 ? "✨" : ""}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

/** 単元を開いたとき。何を土台にしているかを名前で出す */
function UnitDetail({
  unit,
  statuses,
  onBack,
  onStart,
}: {
  unit: UnitSummary;
  statuses: PointStatus[];
  onBack: () => void;
  onStart: (points: KnowledgePoint[]) => void;
}) {
  const byId = new Map(statuses.map((s) => [s.point.id, s]));

  return (
    <div className="screen">
      <button className="btn-ghost" onClick={onBack}>
        <ChevronLeft size={14} style={{ verticalAlign: -2 }} /> もどる
      </button>

      <div className="unit-detail-head" style={{ marginTop: 14 }}>
        <span className="t">{unit.unit}</span>
        <span className="tag">
          {unit.done} / {unit.total}
        </span>
      </div>
      <div className="meter">
        <i style={{ width: `${(unit.done / unit.total) * 100}%` }} />
      </div>

      <div style={{ marginTop: 15 }}>
        {unit.points.map((s) => (
          <div key={s.point.id}>
            <button
              className="point-row"
              style={{ width: "100%" }}
              onClick={() => onStart([s.point])}
            >
              <i className={`dot ${cellClass(s)}`} />
              <span className="nm">{s.point.name}</span>
              <span className="tg">{stateLabel(s)}</span>
            </button>
            {s.point.prereqIds.length > 0 && (
              <div className="foundation">
                {s.point.prereqIds.map((id) => {
                  const k = byId.get(id);
                  if (!k) return null;
                  const ok = k.everMastered;
                  return (
                    <div key={id}>
                      {ok ? <span className="ok">✓</span> : "○"} {k.point.name}{" "}
                      <span className="gr">{k.point.unit.slice(0, 2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {unit.points.some((s) => s.needsFoundation) && (
        <p className="dex-note" style={{ background: "var(--amber-pale)", color: "#7A4600" }}>
          土台がまだでも、いまやってOKです。ただ、そろってからのほうが早く終わります。
        </p>
      )}
    </div>
  );
}

function stateLabel(s: PointStatus): string {
  if (!s.everMastered) {
    if (s.level === "touched") return "あやしい";
    if (s.level === "solved") return "あと1回";
    return "まだ";
  }
  if (s.needsReview) return "薄れている";
  if (s.staleAt) {
    const left = Math.max(0, daysBetween(new Date(), s.staleAt));
    if (left >= 14) return `${Math.round(left / 7)}週間もちます`;
    return `あと${left}日`;
  }
  return "積んだ";
}

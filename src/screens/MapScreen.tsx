import { useState } from "react";
import { Check, Lock, RotateCcw } from "lucide-react";
import type { KnowledgePoint, PointStatus } from "../types";
import { SUBJECTS } from "../data/curriculum";
import { LEVEL_LABEL, daysBetween } from "../logic/mastery";

interface Props {
  statuses: PointStatus[];
  onStart: (points: KnowledgePoint[]) => void;
}

/**
 * 観点の依存関係をそのまま1本道として見せる画面。
 * 並び順は `buildStatuses` が依存関係から導いた順序をそのまま使う。
 *
 * 「あと何%」は数字ではなく、残っている道の長さで伝える。
 * 一度通ったマスは、鮮度が切れても通ったままにする。
 */
export function MapScreen({ statuses, onStart }: Props) {
  const available = SUBJECTS.filter((s) =>
    statuses.some((st) => st.point.subjectId === s.id)
  );
  const [subjectId, setSubjectId] = useState(available[0]?.id ?? "");
  const [selected, setSelected] = useState<PointStatus | null>(null);

  const subject = available.find((s) => s.id === subjectId) ?? available[0];
  const points = statuses.filter((s) => s.point.subjectId === subject?.id);

  const walked = points.filter((s) => s.everMastered);
  const pct = points.length === 0 ? 0 : (walked.length / points.length) * 100;

  // 単元ごとに区切って表示する（並び自体は依存順のまま）
  const units: { unit: string; items: PointStatus[] }[] = [];
  for (const s of points) {
    const last = units[units.length - 1];
    if (last && last.unit === s.point.unit) last.items.push(s);
    else units.push({ unit: s.point.unit, items: [s] });
  }

  let row = 0;

  return (
    <div className="screen">
      <div className="subject-chips">
        {available.map((s) => (
          <button
            key={s.id}
            className={`chip ${s.id === subject?.id ? "is-active" : ""}`}
            style={
              s.id === subject?.id
                ? { background: s.color, borderColor: s.color }
                : { borderColor: `${s.color}66`, color: s.color }
            }
            onClick={() => setSubjectId(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="map-progress">
        <div className="map-progress-track">
          <div
            className="map-progress-fill"
            style={{ width: `${pct}%`, background: subject?.color }}
          />
        </div>
        <div className="map-progress-text">
          {walked.length} / {points.length} 観点
          <strong>{Math.round(pct)}%</strong>
        </div>
      </div>

      <div className="path">
        {units.map(({ unit, items }, unitIndex) => (
          <div key={`${unit}-${unitIndex}`} className="path-unit">
            <div className="unit-title">{unit}</div>
            {items.map((s) => (
              <div
                key={s.point.id}
                className="path-row"
                style={{ transform: `translateX(${offsetFor(row++)}px)` }}
              >
                <button
                  className={`node ${nodeClass(s)}`}
                  style={
                    s.everMastered
                      ? { background: subject?.color, borderColor: subject?.color }
                      : undefined
                  }
                  onClick={() => setSelected(s)}
                >
                  {s.locked ? (
                    <Lock size={20} />
                  ) : s.everMastered && s.needsReview ? (
                    <RotateCcw size={20} />
                  ) : s.everMastered ? (
                    <Check size={22} />
                  ) : (
                    <span className="node-weight">{"★".repeat(s.weight)}</span>
                  )}
                </button>
                <div className="node-label">{s.point.name}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {selected && (
        <div className="sheet-backdrop" onClick={() => setSelected(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-unit">{selected.point.unit}</div>
            <h3>{selected.point.name}</h3>
            <div className="sheet-tags">
              <span className={`tag ${nodeClass(selected)}`}>
                {selected.everMastered && selected.needsReview
                  ? "薄れている"
                  : LEVEL_LABEL[selected.level]}
              </span>
              <span className="tag">頻出度 {"★".repeat(selected.weight)}</span>
              <span className="tag">正答 {selected.correctCount} 回</span>
            </div>

            {selected.everMastered && (
              <p className="sheet-note walked">
                通過済み。{freshnessNote(selected)}
              </p>
            )}

            {selected.locked ? (
              <p className="sheet-note">
                先に前の観点を解けるようにする必要があります。
              </p>
            ) : (
              <button
                className="btn-primary wide"
                onClick={() => {
                  onStart([selected.point]);
                  setSelected(null);
                }}
              >
                この観点をやる
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function freshnessNote(status: PointStatus): string {
  if (status.staleAt === null) return "いまは取りこぼしています";
  const left = daysBetween(new Date(), status.staleAt);
  if (left <= 0) return "そろそろ薄れている頃です";
  return `あと${left}日は覚えている見込みです`;
}

/** 一本道に見せるための左右の振れ幅 */
function offsetFor(index: number): number {
  return Math.round(Math.sin(index * 0.9) * 46);
}

function nodeClass(s: PointStatus): string {
  if (s.locked) return "locked";
  if (s.everMastered && s.needsReview) return "review";
  if (s.everMastered) return "mastered";
  return s.level;
}

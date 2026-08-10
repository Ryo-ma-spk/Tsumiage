import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { UNIVERSITIES } from "../data/curriculum";
import type { Target } from "../types";

interface Props {
  initial: Target | null;
  onSave: (target: Target) => void;
  onCancel?: () => void;
}

function defaultExamDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}

export function SetupScreen({ initial, onSave, onCancel }: Props) {
  const [universityId, setUniversityId] = useState(
    initial?.universityId ?? UNIVERSITIES[0].id
  );
  const [facultyId, setFacultyId] = useState(
    initial?.facultyId ?? UNIVERSITIES[0].faculties[0].id
  );
  const [examDate, setExamDate] = useState(initial?.examDate ?? defaultExamDate());

  const university =
    UNIVERSITIES.find((u) => u.id === universityId) ?? UNIVERSITIES[0];
  const faculties = university.faculties;
  const validFacultyId = faculties.some((f) => f.id === facultyId)
    ? facultyId
    : faculties[0].id;

  return (
    <div className="setup">
      <div className="setup-head">
        <h1>志望校を決めよう</h1>
        <p>やらなくていい範囲を切り落とすところから始めます。</p>
      </div>

      <label className="field">
        <span className="field-label">学校</span>
        <select
          value={universityId}
          onChange={(e) => {
            const next = e.target.value;
            setUniversityId(next);
            const uni = UNIVERSITIES.find((u) => u.id === next);
            if (uni) setFacultyId(uni.faculties[0].id);
          }}
        >
          {UNIVERSITIES.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">学科・コース</span>
        <select
          value={validFacultyId}
          onChange={(e) => setFacultyId(e.target.value)}
        >
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">受験日</span>
        <input
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
        />
      </label>

      <p className="disclaimer">
        ※ 入試科目・出題範囲はプロトタイプ用のサンプルデータです。実際の募集要項ではありません。
      </p>

      <div className="setup-actions">
        {onCancel && (
          <button className="btn-ghost" onClick={onCancel}>
            もどる
          </button>
        )}
        <button
          className="btn-primary"
          onClick={() =>
            onSave({ universityId, facultyId: validFacultyId, examDate })
          }
        >
          はじめる
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

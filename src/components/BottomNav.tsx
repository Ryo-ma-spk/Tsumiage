import { BarChart3, Map, Zap } from "lucide-react";

export type Tab = "today" | "map" | "me";

const TABS: { id: Tab; label: string; Icon: typeof Zap }[] = [
  { id: "today", label: "今日", Icon: Zap },
  { id: "map", label: "マップ", Icon: Map },
  { id: "me", label: "じぶん", Icon: BarChart3 },
];

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`nav-item ${active === id ? "is-active" : ""}`}
          onClick={() => onChange(id)}
        >
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export type Tab = "today" | "map" | "me";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "today", label: "今日", icon: "⚡" },
  { id: "map", label: "マップ", icon: "🗺️" },
  { id: "me", label: "じぶん", icon: "🧱" },
];

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={active === t.id ? "active" : ""}
          onClick={() => onChange(t.id)}
        >
          <span
            style={{
              fontSize: 18,
              filter: active === t.id ? "none" : "grayscale(1) opacity(0.45)",
            }}
          >
            {t.icon}
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}

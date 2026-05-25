import { APPS } from "../data/apps";

export default function AppStrip({ selected, onSelect }) {
  return (
    <div style={{
      display: "flex",
      overflowX: "auto",
      background: "#080A0E",
      borderBottom: "1px solid #1C2030",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    }}>
      {APPS.map((a) => {
        const isActive = selected === a.id;
        return (
          <button
            key={a.id}
            onClick={() => onSelect(a.id)}
            style={{
              flexShrink: 0,
              background: isActive ? `${a.accent}18` : "none",
              border: "none",
              borderBottom: isActive ? `2px solid ${a.accent}` : "2px solid transparent",
              padding: "10px 14px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              fontFamily: "inherit",
              minWidth: 64,
              minHeight: 56,
            }}
          >
            <span style={{ fontSize: 18 }}>{a.icon}</span>
            <div style={{
              fontSize: 8,
              color: isActive ? a.accent : "#4A5A70",
              letterSpacing: 0.5,
              whiteSpace: "nowrap",
              fontWeight: isActive ? 700 : 400,
            }}>
              {a.category.split(" ")[0]}
            </div>
          </button>
        );
      })}
    </div>
  );
}

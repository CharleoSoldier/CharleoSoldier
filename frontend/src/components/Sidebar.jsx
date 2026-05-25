import { APPS } from "../data/apps";

export default function Sidebar({ selected, onSelect }) {
  return (
    <div style={{
      width: 200,
      borderRight: "1px solid #1C2030",
      overflowY: "auto",
      flexShrink: 0,
      background: "#080A0E",
    }}>
      <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #1C2030" }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: "#3A4A60" }}>15 APP PRDs</div>
      </div>
      {APPS.map((a) => (
        <button
          key={a.id}
          onClick={() => onSelect(a.id)}
          style={{
            width: "100%",
            textAlign: "left",
            background: selected === a.id ? `${a.accent}15` : "none",
            border: "none",
            borderLeft: selected === a.id ? `2px solid ${a.accent}` : "2px solid transparent",
            padding: "10px 14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.1s",
            fontFamily: "inherit",
            minHeight: 44,
          }}
        >
          <span style={{ fontSize: 14 }}>{a.icon}</span>
          <div>
            <div style={{
              fontSize: 10,
              color: selected === a.id ? a.accent : "#5A6A80",
              fontWeight: selected === a.id ? 700 : 400,
              lineHeight: 1.3,
            }}>
              {a.category}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

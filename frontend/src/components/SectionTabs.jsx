import { SECTION_LABELS } from "../data/apps";

export default function SectionTabs({ active, onChange, accent, isMobile }) {
  return (
    <div style={{
      display: "flex",
      gap: 0,
      borderBottom: "1px solid #1C2030",
      overflowX: "auto",
      flexShrink: 0,
      background: "#080A0E",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    }}>
      {Object.entries(SECTION_LABELS).map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            padding: isMobile ? "12px 12px" : "10px 14px",
            fontSize: 9,
            letterSpacing: isMobile ? 1 : 2,
            whiteSpace: "nowrap",
            color: active === key ? accent : "#3A4A60",
            borderBottom: active === key ? `2px solid ${accent}` : "2px solid transparent",
            transition: "all 0.1s",
            minHeight: 44,
          }}
        >
          {isMobile ? label.split(" ")[0] : label}
        </button>
      ))}
    </div>
  );
}

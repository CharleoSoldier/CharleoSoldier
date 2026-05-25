export default function ASO({ app, isMobile }) {
  return (
    <div style={{ maxWidth: isMobile ? "100%" : 560 }}>
      <div style={{
        background: "#0D1120",
        border: `1px solid ${app.accent}30`,
        borderRadius: 8,
        padding: isMobile ? 14 : 20,
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 9, color: app.accent, letterSpacing: 2, marginBottom: 10 }}>
          PRIMARY KEYWORD (WIN THIS FIRST)
        </div>
        <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: 700, color: "#F0F4FF" }}>
          "{app.aso.primary}"
        </div>
      </div>
      <div style={{ fontSize: 9, color: "#3A4A60", letterSpacing: 2, marginBottom: 10 }}>SECONDARY KEYWORDS</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {app.aso.secondary.map((k) => (
          <div key={k} style={{
            background: "#0D1120",
            border: "1px solid #1C2030",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: isMobile ? 10 : 11,
            color: "#5A6A80",
          }}>
            {k}
          </div>
        ))}
      </div>
    </div>
  );
}

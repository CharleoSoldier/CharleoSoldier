export default function Persona({ app, isMobile }) {
  return (
    <div style={{ maxWidth: isMobile ? "100%" : 480 }}>
      <div style={{
        background: "#0D1120",
        border: `1px solid ${app.accent}30`,
        borderRadius: 10,
        padding: isMobile ? 16 : 24,
      }}>
        <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: "#F0F4FF", marginBottom: 4 }}>
          {app.persona.name}
        </div>
        <div style={{ fontSize: 9, color: app.accent, letterSpacing: 2, marginBottom: 16 }}>PRIMARY PERSONA</div>
        {app.persona.traits.map((t) => (
          <div key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: app.accent, marginTop: 5, flexShrink: 0 }} />
            <div style={{ fontSize: isMobile ? 11 : 12, color: "#8BA4C0", lineHeight: 1.6 }}>{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Tech({ app, isMobile }) {
  return (
    <div style={{ maxWidth: isMobile ? "100%" : 500 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {app.tech.map((t) => (
          <div key={t} style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#0D1120",
            borderRadius: 6,
            padding: isMobile ? "10px 14px" : "12px 16px",
            minHeight: 44,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: app.accent, flexShrink: 0 }} />
            <div style={{ fontSize: isMobile ? 11 : 12, color: "#8BA4C0" }}>{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

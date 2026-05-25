export default function KPIs({ app, isMobile }) {
  return (
    <div style={{ maxWidth: isMobile ? "100%" : 560 }}>
      {app.kpis.map((k, i) => (
        <div key={k} style={{
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          padding: isMobile ? "10px 12px" : "12px 16px",
          background: "#0D1120",
          borderRadius: 6,
          marginBottom: 4,
          minHeight: 44,
        }}>
          <div style={{ fontSize: 9, color: app.accent, fontWeight: 700, marginTop: 1, minWidth: 18 }}>
            {String(i + 1).padStart(2, "0")}
          </div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: "#8BA4C0", lineHeight: 1.6 }}>{k}</div>
        </div>
      ))}
    </div>
  );
}

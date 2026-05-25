export default function N8nFlows({ app, isMobile }) {
  return (
    <div style={{ maxWidth: isMobile ? "100%" : 700 }}>
      {app.n8n.map((flow, i) => (
        <div key={i} style={{
          background: "#0D1120",
          border: `1px solid ${app.accent}20`,
          borderLeft: `3px solid ${app.accent}`,
          borderRadius: "0 8px 8px 0",
          padding: isMobile ? 14 : 18,
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 9, color: "#3A4A60", letterSpacing: 2, marginBottom: 10 }}>
            FLOW {String(i + 1).padStart(2, "0")}
          </div>
          <div style={{
            display: "flex",
            gap: 12,
            alignItems: "stretch",
            flexDirection: isMobile ? "column" : "row",
          }}>
            <div style={{ flex: 1, background: "#080A0E", borderRadius: 6, padding: "10px 14px" }}>
              <div style={{ fontSize: 9, color: "#00C8FF", letterSpacing: 2, marginBottom: 5 }}>TRIGGER</div>
              <div style={{ fontSize: isMobile ? 10 : 11, color: "#8BA4C0", lineHeight: 1.5 }}>⚡ {flow.trigger}</div>
            </div>
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", color: "#3A4A60", fontSize: 16 }}>→</div>
            )}
            <div style={{ flex: 1, background: "#080A0E", borderRadius: 6, padding: "10px 14px" }}>
              <div style={{ fontSize: 9, color: app.accent, letterSpacing: 2, marginBottom: 5 }}>ACTION</div>
              <div style={{ fontSize: isMobile ? 10 : 11, color: "#8BA4C0", lineHeight: 1.5 }}>✓ {flow.action}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MVP({ app, isMobile }) {
  return (
    <div style={{ maxWidth: isMobile ? "100%" : 600 }}>
      <div style={{ marginBottom: 8, fontSize: 9, color: "#3A4A60", letterSpacing: 2 }}>
        SHIP THIS. NOTHING ELSE.
      </div>
      {app.mvp.map((f, i) => (
        <div key={f} style={{
          display: "flex",
          gap: isMobile ? 10 : 14,
          alignItems: "flex-start",
          padding: isMobile ? "10px 12px" : "12px 16px",
          background: i % 2 === 0 ? "#0D1120" : "transparent",
          borderRadius: 6,
          marginBottom: 2,
          minHeight: 44,
        }}>
          <div style={{ fontSize: 9, color: app.accent, fontWeight: 700, marginTop: 1, minWidth: 18 }}>
            {String(i + 1).padStart(2, "0")}
          </div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: "#8BA4C0", lineHeight: 1.6 }}>{f}</div>
        </div>
      ))}
      {app.postMvp && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 9, color: "#3A4A60", letterSpacing: 2, marginBottom: 10 }}>
            POST-MVP (DON'T TOUCH UNTIL RETENTION PROVEN)
          </div>
          {app.postMvp.map((f) => (
            <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8, opacity: 0.5 }}>
              <div style={{ width: 4, height: 1, background: "#3A4A60", marginTop: 7, flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: "#4A6080" }}>{f}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

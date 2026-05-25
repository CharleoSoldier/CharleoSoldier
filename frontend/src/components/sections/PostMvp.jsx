export default function PostMvp({ app, isMobile }) {
  return (
    <div style={{ maxWidth: isMobile ? "100%" : 600 }}>
      <div style={{
        marginBottom: 16,
        padding: "10px 14px",
        background: "#1A0800",
        border: "1px solid #FF6B3530",
        borderRadius: 6,
        fontSize: isMobile ? 10 : 11,
        color: "#FF6B35",
      }}>
        ⚠️ Do not build these until D30 retention ≥ 40% is proven.
      </div>
      {app.postMvp.map((f, i) => (
        <div key={f} style={{
          display: "flex",
          gap: 14,
          padding: isMobile ? "10px 12px" : "12px 16px",
          background: "#0D1120",
          borderRadius: 6,
          marginBottom: 4,
          minHeight: 44,
          alignItems: "flex-start",
        }}>
          <div style={{ fontSize: 9, color: "#3A4A60", fontWeight: 700, marginTop: 1, minWidth: 18 }}>
            {String(i + 1).padStart(2, "0")}
          </div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: "#5A6A80", lineHeight: 1.6 }}>{f}</div>
        </div>
      ))}
    </div>
  );
}

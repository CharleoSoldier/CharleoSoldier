export default function Risks({ app, isMobile }) {
  return (
    <div style={{ maxWidth: isMobile ? "100%" : 620 }}>
      <div style={{
        background: "#1A0800",
        border: "1px solid #FF6B3540",
        borderLeft: "3px solid #FF6B35",
        borderRadius: "0 8px 8px 0",
        padding: isMobile ? 14 : 20,
      }}>
        <div style={{ fontSize: 9, color: "#FF6B35", letterSpacing: 2, marginBottom: 12 }}>
          PRIMARY RISK & MITIGATION
        </div>
        <div style={{ fontSize: isMobile ? 11 : 12, color: "#8BA4C0", lineHeight: 1.8 }}>
          {app.risks}
        </div>
      </div>
    </div>
  );
}

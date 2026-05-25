export default function AppHeader({ app, isMobile }) {
  return (
    <div style={{
      borderBottom: "1px solid #1C2030",
      padding: isMobile ? "14px 16px" : "20px 28px",
      background: `linear-gradient(135deg, ${app.dark} 0%, #0A0C10 100%)`,
      flexShrink: 0,
    }}>
      <div style={{
        display: "flex",
        alignItems: isMobile ? "flex-start" : "flex-start",
        justifyContent: "space-between",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 12 : 0,
      }}>
        <div style={{ display: "flex", gap: isMobile ? 12 : 16, alignItems: "center" }}>
          <div style={{
            width: isMobile ? 40 : 48,
            height: isMobile ? 40 : 48,
            borderRadius: 12,
            background: `${app.accent}20`,
            border: `1px solid ${app.accent}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isMobile ? 18 : 22,
            flexShrink: 0,
          }}>
            {app.icon}
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: app.accent, marginBottom: 4 }}>
              {app.category.toUpperCase()}
            </div>
            <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: "#F0F4FF", marginBottom: 3 }}>
              {app.name}
            </div>
            <div style={{ fontSize: isMobile ? 10 : 11, color: "#4A6080", fontStyle: "italic" }}>
              {app.tagline}
            </div>
          </div>
        </div>
        <div style={{
          display: "flex",
          gap: isMobile ? 20 : 24,
          textAlign: isMobile ? "left" : "right",
          marginLeft: isMobile ? 52 : 0,
        }}>
          <div>
            <div style={{ fontSize: 9, color: "#3A4A60", letterSpacing: 2, marginBottom: 4 }}>PRO PRICE</div>
            <div style={{ fontSize: isMobile ? 13 : 15, color: app.accent, fontWeight: 700 }}>
              {app.monetization.pro.split("—")[0].trim()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#3A4A60", letterSpacing: 2, marginBottom: 4 }}>LTV</div>
            <div style={{ fontSize: isMobile ? 13 : 15, color: "#F0F4FF", fontWeight: 700 }}>
              {app.monetization.ltv}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

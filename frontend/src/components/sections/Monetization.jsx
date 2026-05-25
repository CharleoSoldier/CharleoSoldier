export default function Monetization({ app, isMobile }) {
  return (
    <div style={{ maxWidth: isMobile ? "100%" : 560 }}>
      <div style={{
        display: "flex",
        gap: 14,
        marginBottom: 20,
        flexDirection: isMobile ? "column" : "row",
      }}>
        {[
          { label: "FREE TIER", value: app.monetization.free, color: "#3A4A60" },
          { label: "PRO TIER", value: app.monetization.pro, color: app.accent },
        ].map((tier) => (
          <div key={tier.label} style={{
            flex: 1,
            background: "#0D1120",
            border: `1px solid ${tier.color}40`,
            borderRadius: 8,
            padding: isMobile ? 14 : 18,
          }}>
            <div style={{ fontSize: 9, color: tier.color, letterSpacing: 2, marginBottom: 10 }}>{tier.label}</div>
            <div style={{ fontSize: isMobile ? 10 : 11, color: "#8BA4C0", lineHeight: 1.7 }}>{tier.value}</div>
          </div>
        ))}
      </div>
      <div style={{
        background: "#0D1120",
        borderRadius: 8,
        padding: isMobile ? 14 : 18,
        border: "1px solid #FFD70030",
      }}>
        <div style={{ fontSize: 9, color: "#FFD700", letterSpacing: 2, marginBottom: 8 }}>
          TARGET LTV / USER / YEAR
        </div>
        <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: "#FFD700" }}>
          {app.monetization.ltv}
        </div>
      </div>
    </div>
  );
}

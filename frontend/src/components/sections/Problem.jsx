export default function Problem({ app, isMobile }) {
  return (
    <div style={{ maxWidth: isMobile ? "100%" : 680 }}>
      <div style={{
        fontSize: isMobile ? 12 : 13,
        color: "#8BA4C0",
        lineHeight: 1.8,
        padding: isMobile ? "14px 16px" : "16px 20px",
        background: "#0D1120",
        borderLeft: `3px solid ${app.accent}`,
        borderRadius: "0 8px 8px 0",
      }}>
        {app.problem}
      </div>
    </div>
  );
}

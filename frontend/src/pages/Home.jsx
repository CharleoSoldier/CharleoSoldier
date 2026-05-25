import { useNavigate } from "react-router-dom";
import { APPS } from "../data/apps";
import { useBreakpoint } from "../hooks/useBreakpoint";

export default function Home() {
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0C10",
      color: "#D4D8E2",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{
        padding: isMobile ? "24px 16px 16px" : "40px 40px 24px",
        borderBottom: "1px solid #1C2030",
      }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: "#3A4A60", marginBottom: 8 }}>
          CHARLEOSOLDIER / APP PORTFOLIO
        </div>
        <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: "#F0F4FF", marginBottom: 6 }}>
          15 App PRDs
        </div>
        <div style={{ fontSize: isMobile ? 11 : 13, color: "#4A6080" }}>
          Wellness &amp; productivity micro-SaaS — tap any to explore the full PRD
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "repeat(2, 1fr)"
          : bp === "tablet"
          ? "repeat(3, 1fr)"
          : "repeat(4, 1fr)",
        gap: isMobile ? 10 : 16,
        padding: isMobile ? 12 : 32,
      }}>
        {APPS.map((a) => (
          <button
            key={a.id}
            onClick={() => navigate(`/${a.id}`)}
            style={{
              background: "#0D1120",
              border: `1px solid ${a.accent}25`,
              borderRadius: 10,
              padding: isMobile ? "14px 12px" : "18px 16px",
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              transition: "all 0.15s",
              minHeight: 100,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${a.accent}12`;
              e.currentTarget.style.borderColor = `${a.accent}60`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0D1120";
              e.currentTarget.style.borderColor = `${a.accent}25`;
            }}
          >
            <div style={{ fontSize: isMobile ? 22 : 26, marginBottom: 8 }}>{a.icon}</div>
            <div style={{ fontSize: 9, color: a.accent, letterSpacing: 2, marginBottom: 4 }}>
              {a.category.toUpperCase()}
            </div>
            <div style={{ fontSize: isMobile ? 10 : 11, color: "#8BA4C0", lineHeight: 1.4 }}>
              {a.tagline}
            </div>
            <div style={{
              marginTop: 10,
              fontSize: 10,
              color: a.accent,
              fontWeight: 700,
            }}>
              {a.monetization.pro.split("—")[0].trim()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { APPS } from "../data/apps";
import { useBreakpoint } from "../hooks/useBreakpoint";
import Sidebar from "../components/Sidebar";
import AppStrip from "../components/AppStrip";
import AppHeader from "../components/AppHeader";
import SectionTabs from "../components/SectionTabs";
import Problem from "../components/sections/Problem";
import Persona from "../components/sections/Persona";
import MVP from "../components/sections/MVP";
import PostMvp from "../components/sections/PostMvp";
import N8nFlows from "../components/sections/N8nFlows";
import Tech from "../components/sections/Tech";
import Monetization from "../components/sections/Monetization";
import ASO from "../components/sections/ASO";
import KPIs from "../components/sections/KPIs";
import Risks from "../components/sections/Risks";

const SECTIONS = {
  problem: Problem,
  persona: Persona,
  mvp: MVP,
  postMvp: PostMvp,
  n8n: N8nFlows,
  tech: Tech,
  monetization: Monetization,
  aso: ASO,
  kpis: KPIs,
  risks: Risks,
};

export default function AppDetail() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const app = APPS.find((a) => a.id === appId) ?? APPS[0];
  const [activeSection, setActiveSection] = useState("problem");

  const handleAppSelect = (id) => {
    navigate(`/${id}`);
    setActiveSection("problem");
  };

  const SectionComponent = SECTIONS[activeSection];

  if (isMobile) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0A0C10",
        color: "#D4D8E2",
        fontFamily: "'JetBrains Mono', monospace",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Back to home */}
        <div style={{ background: "#080A0E", borderBottom: "1px solid #1C2030", padding: "8px 16px" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "none",
              color: "#3A4A60",
              fontFamily: "inherit",
              fontSize: 10,
              letterSpacing: 2,
              cursor: "pointer",
              padding: "4px 0",
            }}
          >
            ← ALL APPS
          </button>
        </div>

        {/* App picker strip */}
        <AppStrip selected={app.id} onSelect={handleAppSelect} />

        {/* App header */}
        <AppHeader app={app} isMobile />

        {/* Section tabs */}
        <SectionTabs active={activeSection} onChange={setActiveSection} accent={app.accent} isMobile />

        {/* Section content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 32px" }}>
          <SectionComponent app={app} isMobile />
        </div>
      </div>
    );
  }

  /* Tablet: same as desktop but narrower sidebar collapsed to icons */
  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "#0A0C10",
      color: "#D4D8E2",
      fontFamily: "'JetBrains Mono', monospace",
      overflow: "hidden",
    }}>
      {!isTablet && <Sidebar selected={app.id} onSelect={handleAppSelect} />}
      {isTablet && (
        <div style={{
          width: 64,
          borderRight: "1px solid #1C2030",
          overflowY: "auto",
          flexShrink: 0,
          background: "#080A0E",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 12,
          gap: 4,
        }}>
          <div style={{ fontSize: 8, color: "#3A4A60", letterSpacing: 1, marginBottom: 8 }}>PRDs</div>
          {APPS.map((a) => (
            <button
              key={a.id}
              onClick={() => handleAppSelect(a.id)}
              title={a.category}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: app.id === a.id ? `${a.accent}20` : "none",
                border: app.id === a.id ? `1px solid ${a.accent}50` : "1px solid transparent",
                cursor: "pointer",
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {a.icon}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AppHeader app={app} isMobile={false} />
        <SectionTabs active={activeSection} onChange={setActiveSection} accent={app.accent} isMobile={false} />
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <SectionComponent app={app} isMobile={false} />
        </div>
      </div>
    </div>
  );
}

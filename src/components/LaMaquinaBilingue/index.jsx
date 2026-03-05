import React, { useState } from "react";
import MaquinaHeader from "./MaquinaHeader";
import MaquinaFooter from "./MaquinaFooter";
import LiveFeed from "./LiveFeed";
import DivergenceExplorer from "./DivergenceExplorer";
import Trends from "./Trends";
import EmotionTranslator from "./EmotionTranslator";
import SystemHealth from "./SystemHealth";
import { useMaquinaData } from "./useMaquinaData";
import { TABS } from "./constants";

const LaMaquinaBilingue = () => {
  const [activeTab, setActiveTab] = useState("feed");
  const {
    pairs,
    trends,
    health,
    loading,
    error,
    fetchTrends,
    analyzeHeadline,
  } = useMaquinaData();

  const renderTab = () => {
    switch (activeTab) {
      case "feed":
        return <LiveFeed pairs={pairs} loading={loading} />;
      case "divergence":
        return <DivergenceExplorer pairs={pairs} />;
      case "trends":
        return <Trends trends={trends} fetchTrends={fetchTrends} />;
      case "translator":
        return <EmotionTranslator analyzeHeadline={analyzeHeadline} />;
      case "system":
        return <SystemHealth health={health} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-maq-bg text-maq-text">
      <MaquinaHeader />

      {/* Tab navigation */}
      <nav className="border-b border-maq-border bg-maq-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-xs font-mono-maq rounded transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-maq-surface-alt text-maq-text border border-maq-border"
                    : "text-maq-text-secondary hover:text-maq-text hover:bg-maq-surface"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Error banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-maq-anger/10 border border-maq-anger/30 rounded-lg px-4 py-2">
            <p className="text-xs text-maq-anger font-mono-maq">
              API Error: {error}
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderTab()}
      </main>

      <MaquinaFooter />
    </div>
  );
};

export default LaMaquinaBilingue;

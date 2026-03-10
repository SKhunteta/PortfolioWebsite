import React from "react";
import { Link } from "react-router-dom";
import useMarketData from "./useMarketData";
import { EMOTIONS, EMOTION_ORDER } from "./constants";
import EmotionCard from "./EmotionCard";
import NewsTicker from "./NewsTicker";
import HeadlinesPanel from "./HeadlinesPanel";
import VolatilityBar from "./VolatilityBar";
import LoadingState from "./LoadingState";

const EmotionalLaborExchange = () => {
  const { marketData, priceHistory, loading, error, lastUpdate, refreshMarket } =
    useMarketData();

  const emotions = marketData?.emotions;
  const headlines = marketData?.headlines;
  const marketMood = marketData?.market_mood;
  const volatility = marketData?.volatility_index;

  return (
    <div className="min-h-screen bg-ele-bg font-sans-ele">
      {/* Header */}
      <header className="border-b border-ele-border bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-3">
                <h1 className="font-serif text-3xl text-ele-text tracking-tight">
                  ELE
                </h1>
                <span className="font-sans-ele text-xs font-medium text-ele-text-secondary uppercase tracking-widest hidden sm:inline">
                  Emotional Labor Exchange
                </span>
              </div>
              <p className="font-sans-ele text-xs italic text-ele-text-tertiary mt-0.5">
                Pricing human feeling since 2032
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-ele-text-tertiary font-sans-ele">
              <Link
                to="/"
                className="text-sm text-ele-text-secondary hover:text-ele-text transition-colors font-sans-ele"
              >
                &larr; Back
              </Link>
              {loading && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ele-anxiety animate-pulse" />
                  Updating
                </span>
              )}
              {lastUpdate && (
                <span>
                  Last updated{" "}
                  {lastUpdate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Ticker — only show when we have data */}
      {headlines && headlines.length > 0 && (
        <NewsTicker headlines={headlines} />
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && !marketData ? (
          <LoadingState />
        ) : error && !marketData ? (
          <div className="text-center py-16">
            <p className="font-serif text-2xl text-ele-text mb-2">
              Exchange Temporarily Closed
            </p>
            <p className="font-sans-ele text-ele-text-secondary mb-6 max-w-md mx-auto">
              {error}
            </p>
            <button
              onClick={refreshMarket}
              className="font-sans-ele text-sm font-medium px-5 py-2.5 rounded-md border border-ele-border text-ele-text hover:bg-white transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Market Commentary + Volatility */}
            {(marketMood || volatility != null) && (
              <section className="space-y-3">
                {marketMood && (
                  <p className="font-sans-ele text-sm text-ele-text-secondary italic leading-relaxed">
                    {marketMood}
                  </p>
                )}
                {volatility != null && <VolatilityBar value={volatility} />}
              </section>
            )}

            {/* Emotion Price Grid */}
            {emotions && (
              <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {EMOTION_ORDER.map((key) => {
                    const data = emotions[key];
                    if (!data) return null;
                    return (
                      <EmotionCard
                        key={key}
                        emotionKey={key}
                        data={data}
                        history={priceHistory[key] || []}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Headlines Panel */}
            {headlines && headlines.length > 0 && (
              <HeadlinesPanel headlines={headlines} />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-ele-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={refreshMarket}
              disabled={loading}
              className="font-sans-ele text-sm font-medium px-5 py-2.5 rounded-md border border-ele-border text-ele-text hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Refreshing..." : "Refresh Market"}
            </button>
            <Link
              to="/invoice"
              className="font-sans-ele text-sm font-medium px-5 py-2.5 rounded-md bg-ele-text text-white hover:bg-ele-text/90 transition-colors"
            >
              Generate Invoice
            </Link>
          </div>
          <p className="font-sans-ele text-xs text-ele-text-tertiary text-center sm:text-right max-w-lg">
            ELE v0.1 — Fictional market. Prices derived from real news via AI
            analysis. From the world of{" "}
            <em>The Happiness Liability</em> by Shreyans Khunteta.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default EmotionalLaborExchange;

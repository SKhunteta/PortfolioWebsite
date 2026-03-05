import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { api } from './api';
import type { Headline, MatchedPair, Stats } from './api';
import HeadlineList from './components/HeadlineList';
import Navbar from './components/Navbar';
import PairsView from './components/PairsView';
import StatsCards from './components/StatsCards';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [headlinesEn, setHeadlinesEn] = useState<Headline[]>([]);
  const [headlinesEs, setHeadlinesEs] = useState<Headline[]>([]);
  const [pairs, setPairs] = useState<MatchedPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, en, es, p] = await Promise.all([
        api.getStats(),
        api.getHeadlines('en', 50),
        api.getHeadlines('es', 50),
        api.getPairs(50),
      ]);
      setStats(s);
      setHeadlinesEn(en);
      setHeadlinesEs(es);
      setPairs(p);
    } catch (e) {
      setError(
        'Could not connect to API. Make sure the FastAPI server is running on port 8000.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleIngest = async () => {
    setIngesting(true);
    try {
      await api.triggerIngest();
      await loadData();
    } catch {
      setError('Ingestion failed. Check the API server logs.');
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="app">
      <Navbar
        activeTab={tab}
        onTabChange={setTab}
        onIngest={handleIngest}
        ingesting={ingesting}
      />

      <main className="main-content">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="dashboard">
            <h2>Dashboard</h2>
            <StatsCards stats={stats} loading={loading} />

            <div className="dashboard-columns">
              <div className="dashboard-col">
                <h3>
                  <span className="lang-badge lang-en">EN</span> Latest
                  English Headlines
                </h3>
                <HeadlineList
                  headlines={headlinesEn.slice(0, 10)}
                  loading={loading}
                />
              </div>
              <div className="dashboard-col">
                <h3>
                  <span className="lang-badge lang-es">ES</span> Latest
                  Spanish Headlines
                </h3>
                <HeadlineList
                  headlines={headlinesEs.slice(0, 10)}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'headlines' && (
          <div className="headlines-page">
            <h2>All Headlines</h2>
            <div className="dashboard-columns">
              <div className="dashboard-col">
                <h3>
                  <span className="lang-badge lang-en">EN</span> English
                  ({headlinesEn.length})
                </h3>
                <HeadlineList headlines={headlinesEn} loading={loading} />
              </div>
              <div className="dashboard-col">
                <h3>
                  <span className="lang-badge lang-es">ES</span> Spanish
                  ({headlinesEs.length})
                </h3>
                <HeadlineList headlines={headlinesEs} loading={loading} />
              </div>
            </div>
          </div>
        )}

        {tab === 'pairs' && (
          <div className="pairs-page">
            <h2>Matched Pairs</h2>
            <p className="page-desc">
              Cross-lingual story matches — the same event covered in English
              and Spanish, with emotion analysis side by side.
            </p>
            <PairsView pairs={pairs} loading={loading} />
          </div>
        )}
      </main>
    </div>
  );
}

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onIngest: () => void;
  ingesting: boolean;
}

export default function Navbar({ activeTab, onTabChange, onIngest, ingesting }: Props) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'headlines', label: 'Headlines' },
    { id: 'pairs', label: 'Matched Pairs' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">⚙</span>
        <span className="brand-text">La Máquina Bilingüe</span>
      </div>
      <div className="navbar-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button
        className="ingest-btn"
        onClick={onIngest}
        disabled={ingesting}
      >
        {ingesting ? 'Ingesting...' : 'Fetch Headlines'}
      </button>
    </nav>
  );
}

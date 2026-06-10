const TickerContent = ({ items }) => (
  <div className="flex shrink-0 items-center">
    {items.map((message, i) => (
      <span
        key={`${i}-${message}`}
        className="font-mono text-[10px] uppercase tracking-wider text-mr-text-muted whitespace-nowrap px-6"
      >
        <span className="text-mr-accent pr-2" aria-hidden="true">
          ▸
        </span>
        {message}
      </span>
    ))}
  </div>
);

const MarketTicker = ({ history, reducedMotion }) => {
  const items = history.length > 0 ? history : ["Awaiting emotional output…"];

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 bg-mr-surface/90 backdrop-blur border-t border-mr-border overflow-hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-hidden="true"
    >
      {reducedMotion ? (
        <div className="py-1.5 px-4 truncate">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mr-text-muted">
            <span className="text-mr-accent pr-2">▸</span>
            {items[items.length - 1]}
          </span>
        </div>
      ) : (
        <div className="py-1.5 flex w-max animate-ticker-scroll">
          <TickerContent items={items} />
          <TickerContent items={items} />
        </div>
      )}
    </div>
  );
};

export default MarketTicker;

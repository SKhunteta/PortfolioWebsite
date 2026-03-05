import React from "react";

const MetricCard = ({ label, value, unit, status }) => (
  <div className="bg-maq-surface rounded-lg border border-maq-border p-4">
    <p className="text-xs text-maq-text-muted font-mono-maq mb-1">{label}</p>
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-bold font-mono-maq text-maq-text">{value}</span>
      {unit && <span className="text-xs text-maq-text-secondary font-mono-maq">{unit}</span>}
    </div>
    {status && (
      <span
        className={`text-xs font-mono-maq mt-1 inline-block ${
          status === "ok" ? "text-maq-joy" : status === "warn" ? "text-maq-fear" : "text-maq-anger"
        }`}
      >
        {status === "ok" ? "Healthy" : status === "warn" ? "Warning" : "Error"}
      </span>
    )}
  </div>
);

const SystemHealth = ({ health }) => {
  if (!health) {
    return (
      <div className="text-center py-20">
        <p className="text-maq-text-secondary font-mono-maq text-sm">
          Loading system health...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono-maq text-maq-text-secondary">System Health</h3>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              health.status === "ok" ? "bg-maq-joy" : "bg-maq-anger"
            }`}
          />
          <span className="text-xs font-mono-maq text-maq-text-secondary">
            {health.status === "ok" ? "All systems operational" : "Issues detected"}
          </span>
        </div>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Model Version"
          value={health.model_version || "v1"}
          status="ok"
        />
        <MetricCard
          label="Uptime"
          value={health.uptime || "—"}
          status="ok"
        />
        <MetricCard
          label="EN Headlines"
          value={health.headline_count_en || 0}
          status="ok"
        />
        <MetricCard
          label="ES Headlines"
          value={health.headline_count_es || 0}
          status="ok"
        />
      </div>

      {/* Model performance */}
      <div className="bg-maq-surface rounded-lg border border-maq-border p-4">
        <h4 className="text-xs text-maq-text-muted font-mono-maq mb-3">Model Performance</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-maq-en font-mono-maq">EN F1 (macro)</p>
            <p className="text-lg font-bold font-mono-maq text-maq-text">
              {health.model_f1_en ? (health.model_f1_en * 100).toFixed(1) + "%" : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-maq-es font-mono-maq">ES F1 (macro)</p>
            <p className="text-lg font-bold font-mono-maq text-maq-text">
              {health.model_f1_es ? (health.model_f1_es * 100).toFixed(1) + "%" : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-maq-text-muted font-mono-maq">p50 Latency</p>
            <p className="text-lg font-bold font-mono-maq text-maq-text">
              {health.latency_p50 ? health.latency_p50 + "ms" : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-maq-text-muted font-mono-maq">p95 Latency</p>
            <p className="text-lg font-bold font-mono-maq text-maq-text">
              {health.latency_p95 ? health.latency_p95 + "ms" : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline status */}
      <div className="bg-maq-surface rounded-lg border border-maq-border p-4">
        <h4 className="text-xs text-maq-text-muted font-mono-maq mb-3">Pipeline Status</h4>
        <div className="space-y-2">
          {[
            { name: "RSS Ingestion", status: health.ingestion_status || "ok" },
            { name: "Cross-Lingual Matching", status: health.matching_status || "ok" },
            { name: "Emotion Inference", status: health.inference_status || "ok" },
            { name: "Drift Monitoring", status: health.drift_status || "ok" },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between py-1">
              <span className="text-xs text-maq-text font-mono-maq">{item.name}</span>
              <span
                className={`text-xs font-mono-maq ${
                  item.status === "ok"
                    ? "text-maq-joy"
                    : item.status === "warn"
                    ? "text-maq-fear"
                    : "text-maq-anger"
                }`}
              >
                {item.status === "ok" ? "Operational" : item.status === "warn" ? "Degraded" : "Down"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;

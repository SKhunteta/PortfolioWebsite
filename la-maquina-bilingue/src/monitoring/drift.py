"""Per-language drift detection using Evidently AI."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pandas as pd
import yaml
from evidently import ColumnMapping
from evidently.metric_preset import DataDriftPreset
from evidently.report import Report

from src.config import CONFIGS_DIR, config
from src.ingestion.headline_store import HeadlineStore

logger = logging.getLogger(__name__)


def load_monitoring_config() -> dict[str, Any]:
    """Load monitoring configuration from YAML."""
    config_path = CONFIGS_DIR / "monitoring_config.yaml"
    with open(config_path) as f:
        result: dict[str, Any] = yaml.safe_load(f)
    return result


def _headlines_to_dataframe(headlines: list[dict[str, Any]]) -> pd.DataFrame:
    """Convert headline dicts to a DataFrame with features for drift detection."""
    rows = []
    for h in headlines:
        emotions = h.get("emotions")
        if isinstance(emotions, str):
            emotions = json.loads(emotions)

        row: dict[str, Any] = {
            "headline_length": len(h.get("title", "")),
            "vocabulary_diversity": len(set(h.get("title", "").lower().split()))
            / max(len(h.get("title", "").split()), 1),
            "language": h.get("language", ""),
        }

        if emotions and isinstance(emotions, dict):
            for emotion, score in emotions.items():
                row[f"emotion_{emotion}"] = score

        rows.append(row)

    return pd.DataFrame(rows)


class DriftMonitor:
    """Monitor data and prediction drift per language."""

    def __init__(self, store: HeadlineStore | None = None) -> None:
        self.store = store or HeadlineStore()
        self.config = load_monitoring_config()
        self.output_dir = Path(
            self.config.get("reporting", {}).get("output_dir", "data/monitoring_reports")
        )
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _get_reference_and_current(
        self, language: str
    ) -> tuple[pd.DataFrame, pd.DataFrame]:
        """Split headlines into reference (older) and current (recent) windows."""
        ref_days = self.config["drift_detection"]["reference_window_days"]

        all_headlines = self.store.get_by_language(language, limit=5000)
        if not all_headlines:
            return pd.DataFrame(), pd.DataFrame()

        cutoff = datetime.now(UTC) - timedelta(days=ref_days)

        reference = [
            h for h in all_headlines if h.get("published_at") and h["published_at"] < cutoff
        ]
        current = [
            h for h in all_headlines if h.get("published_at") and h["published_at"] >= cutoff
        ]

        return _headlines_to_dataframe(reference), _headlines_to_dataframe(current)

    def check_drift(self, language: str) -> dict[str, Any]:
        """Run drift detection for a single language. Returns summary dict."""
        reference_df, current_df = self._get_reference_and_current(language)

        if reference_df.empty or current_df.empty:
            logger.warning("Not enough data for drift detection (%s)", language)
            return {"language": language, "status": "insufficient_data"}

        # Numeric columns only for drift detection
        numeric_cols = [c for c in reference_df.columns if c != "language"]
        column_mapping = ColumnMapping(
            numerical_features=[c for c in numeric_cols if c in current_df.columns]
        )

        report = Report(metrics=[DataDriftPreset()])
        report.run(
            reference_data=reference_df[numeric_cols],
            current_data=current_df[numeric_cols],
            column_mapping=column_mapping,
        )

        # Save HTML report
        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        report_path = self.output_dir / f"drift_{language}_{timestamp}.html"
        report.save_html(str(report_path))

        # Extract results
        report_dict = report.as_dict()
        drift_detected = report_dict.get("metrics", [{}])[0].get("result", {}).get(
            "dataset_drift", False
        )

        result = {
            "language": language,
            "status": "drift_detected" if drift_detected else "no_drift",
            "report_path": str(report_path),
            "reference_size": len(reference_df),
            "current_size": len(current_df),
            "timestamp": timestamp,
        }

        logger.info(
            "Drift check [%s]: %s (ref=%d, cur=%d)",
            language, result["status"], result["reference_size"], result["current_size"],
        )
        return result

    def run_all(self) -> list[dict[str, Any]]:
        """Run drift detection for all configured languages."""
        languages: list[str] = self.config["drift_detection"].get("per_language", {}).get(
            "languages", ["en", "es"]
        )
        results = []
        for lang in languages:
            result = self.check_drift(lang)
            results.append(result)

        self._log_results(results)
        return results

    def _log_results(self, results: list[dict[str, Any]]) -> None:
        """Log drift results to MLflow and W&B (per CLAUDE.md: always log to both)."""
        try:
            import mlflow
            import wandb

            mlflow.set_tracking_uri(config.mlflow_tracking_uri)
            mlflow.set_experiment("drift-monitoring")

            with mlflow.start_run(run_name="drift-check"):
                for r in results:
                    lang = r["language"]
                    mlflow.log_metric(f"drift_{lang}_ref_size", r.get("reference_size", 0))
                    mlflow.log_metric(f"drift_{lang}_cur_size", r.get("current_size", 0))
                    mlflow.log_metric(
                        f"drift_{lang}_detected", 1 if r["status"] == "drift_detected" else 0
                    )
                    if "report_path" in r:
                        mlflow.log_artifact(r["report_path"])

            if wandb.run is None:
                wandb.init(project=config.wandb_project, job_type="monitoring")
            for r in results:
                lang = r["language"]
                wandb.log({
                    f"drift_{lang}_detected": 1 if r["status"] == "drift_detected" else 0,
                    f"drift_{lang}_ref_size": r.get("reference_size", 0),
                    f"drift_{lang}_cur_size": r.get("current_size", 0),
                })
            wandb.finish()
        except Exception:
            logger.warning("Could not log to MLflow/W&B (services may be unavailable)")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    monitor = DriftMonitor()
    monitor.run_all()

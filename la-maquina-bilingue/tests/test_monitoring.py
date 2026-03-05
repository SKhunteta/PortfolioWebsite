"""Tests for the monitoring module."""

from __future__ import annotations

import pytest

pd = pytest.importorskip("pandas", reason="pandas not available in CI")
pytest.importorskip("evidently", reason="evidently not available in CI")


class TestMonitoringConfig:
    def test_load_monitoring_config(self):
        """Monitoring config loads from YAML."""
        from src.monitoring.drift import load_monitoring_config

        cfg = load_monitoring_config()
        assert "drift_detection" in cfg
        assert "reporting" in cfg
        assert cfg["drift_detection"]["reference_window_days"] == 30

    def test_config_languages(self):
        """Config specifies EN and ES monitoring."""
        from src.monitoring.drift import load_monitoring_config

        cfg = load_monitoring_config()
        langs = cfg["drift_detection"]["per_language"]["languages"]
        assert "en" in langs
        assert "es" in langs

    def test_headlines_to_dataframe_empty(self):
        """Empty headline list produces empty DataFrame."""
        from src.monitoring.drift import _headlines_to_dataframe

        df = _headlines_to_dataframe([])
        assert len(df) == 0

    def test_headlines_to_dataframe_with_data(self):
        """Headlines are converted to DataFrame with correct features."""
        from src.monitoring.drift import _headlines_to_dataframe

        headlines = [
            {
                "title": "Breaking news about technology",
                "language": "en",
                "emotions": {"anger": 0.1, "joy": 0.5, "fear": 0.4},
            }
        ]
        df = _headlines_to_dataframe(headlines)
        assert len(df) == 1
        assert "headline_length" in df.columns
        assert "vocabulary_diversity" in df.columns
        assert "emotion_anger" in df.columns
        assert "emotion_joy" in df.columns

    def test_headlines_to_dataframe_json_emotions(self):
        """Handles emotions stored as JSON string."""
        from src.monitoring.drift import _headlines_to_dataframe

        headlines = [
            {
                "title": "Test headline",
                "language": "en",
                "emotions": '{"anger": 0.2, "joy": 0.8}',
            }
        ]
        df = _headlines_to_dataframe(headlines)
        assert df["emotion_anger"].iloc[0] == 0.2
        assert df["emotion_joy"].iloc[0] == 0.8

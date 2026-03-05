"""Tests for the emotion classification module (mocked — no torch in CI)."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

torch = pytest.importorskip("torch", reason="torch not available in CI")
pytest.importorskip("transformers", reason="transformers not available in CI")


class TestEmotionClassifier:
    def test_predict_returns_all_labels(self):
        """Classifier returns a dict with all 7 emotion labels."""
        from src.emotion.classifier import EmotionClassifier

        # Build classifier without calling __init__ (avoids model download)
        classifier = EmotionClassifier.__new__(EmotionClassifier)
        classifier.model_path = "xlm-roberta-base"
        classifier.labels = ["anger", "disgust", "fear", "joy", "sadness", "surprise", "neutral"]
        classifier.tokenizer = MagicMock()

        mock_model = MagicMock()
        logits = torch.randn(1, 7)
        mock_model.return_value = MagicMock(logits=logits)
        classifier.model = mock_model

        result = classifier.predict("test headline")
        assert set(result.keys()) == {
            "anger", "disgust", "fear", "joy", "sadness", "surprise", "neutral"
        }
        assert all(isinstance(v, float) for v in result.values())
        assert abs(sum(result.values()) - 1.0) < 0.01

    def test_labels_constant(self):
        """Default LABELS list has 7 entries."""
        from src.emotion.classifier import LABELS

        assert len(LABELS) == 7
        assert "neutral" in LABELS


class TestTrainerConfig:
    def test_load_training_config(self):
        """Training config loads from YAML."""
        from src.emotion.trainer import load_training_config

        cfg = load_training_config()
        assert "model" in cfg
        assert "training" in cfg
        assert "data" in cfg
        assert cfg["model"]["num_labels"] == 7

    def test_build_ekman_mapping(self):
        """Ekman mapping converts GoEmotions indices to 7 categories."""
        from src.emotion.trainer import build_ekman_mapping, load_training_config

        cfg = load_training_config()
        mapping = build_ekman_mapping(cfg)
        # 28 GoEmotions labels → each maps to one of 7 Ekman categories
        assert len(mapping) == 28
        assert all(0 <= v <= 6 for v in mapping.values())

"""XLM-RoBERTa emotion classifier for multilingual headlines."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer, PreTrainedModel

from src.config import CONFIGS_DIR, config

logger = logging.getLogger(__name__)

LABELS = ["anger", "disgust", "fear", "joy", "sadness", "surprise", "neutral"]


def _load_labels() -> list[str]:
    """Load emotion labels from training config, falling back to defaults."""
    import yaml

    config_path = CONFIGS_DIR / "training_config.yaml"
    if config_path.exists():
        with open(config_path) as f:
            cfg = yaml.safe_load(f)
        result: list[str] = cfg.get("data", {}).get("labels", LABELS)
        return result
    return LABELS


class EmotionClassifier:
    """Predict Ekman-6 + neutral emotion probabilities for text."""

    def __init__(self, model_path: str | None = None) -> None:
        self.model_path = model_path or config.emotion_model
        self.labels = _load_labels()
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
        self.model: PreTrainedModel = AutoModelForSequenceClassification.from_pretrained(
            self.model_path, num_labels=len(self.labels)
        )
        self.model.eval()
        logger.info("Loaded emotion model from %s (%d labels)", self.model_path, len(self.labels))

    def predict(self, text: str) -> dict[str, float]:
        """Return emotion probabilities for a single text."""
        return self.predict_batch([text])[0]

    def predict_batch(self, texts: list[str]) -> list[dict[str, float]]:
        """Return emotion probabilities for a batch of texts."""
        inputs = self.tokenizer(
            texts, padding=True, truncation=True, max_length=128, return_tensors="pt"
        )
        with torch.no_grad():
            logits = self.model(**inputs).logits
        probs = torch.softmax(logits, dim=-1)

        results: list[dict[str, float]] = []
        for row in probs:
            scores = {label: round(float(row[i]), 4) for i, label in enumerate(self.labels)}
            results.append(scores)
        return results

    def export_onnx(self, output_path: str | None = None) -> str:
        """Export model to ONNX format for optimized inference."""
        from optimum.onnxruntime import ORTModelForSequenceClassification

        out = output_path or config.onnx_model_path
        out_dir = Path(out).parent
        out_dir.mkdir(parents=True, exist_ok=True)

        ort_model = ORTModelForSequenceClassification.from_pretrained(
            self.model_path, export=True
        )
        ort_model.save_pretrained(str(out_dir))
        logger.info("Exported ONNX model to %s", out_dir)
        return str(out_dir)


class OnnxEmotionClassifier:
    """Lightweight ONNX-based emotion classifier for production inference."""

    def __init__(self, model_dir: str | None = None) -> None:
        from optimum.onnxruntime import ORTModelForSequenceClassification

        self.model_dir = model_dir or str(Path(config.onnx_model_path).parent)
        self.labels = _load_labels()
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_dir)
        self.model: Any = ORTModelForSequenceClassification.from_pretrained(self.model_dir)
        logger.info("Loaded ONNX emotion model from %s", self.model_dir)

    def predict(self, text: str) -> dict[str, float]:
        """Return emotion probabilities for a single text."""
        return self.predict_batch([text])[0]

    def predict_batch(self, texts: list[str]) -> list[dict[str, float]]:
        """Return emotion probabilities for a batch of texts."""
        inputs = self.tokenizer(
            texts, padding=True, truncation=True, max_length=128, return_tensors="pt"
        )
        outputs = self.model(**inputs)
        probs = torch.softmax(torch.tensor(outputs.logits), dim=-1)

        results: list[dict[str, float]] = []
        for row in probs:
            scores = {label: round(float(row[i]), 4) for i, label in enumerate(self.labels)}
            results.append(scores)
        return results


def classify_headlines(
    headlines: list[dict[str, Any]], model_path: str | None = None
) -> list[dict[str, Any]]:
    """Convenience: classify a list of headline dicts, adding 'emotions' key."""
    classifier = EmotionClassifier(model_path=model_path)
    texts = [h["title"] for h in headlines]
    predictions = classifier.predict_batch(texts)
    for headline, emotions in zip(headlines, predictions, strict=False):
        headline["emotions"] = emotions
    return headlines

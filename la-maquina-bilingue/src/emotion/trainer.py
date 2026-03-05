"""Training pipeline for XLM-RoBERTa emotion classifier on GoEmotions."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np
import torch
import yaml
from datasets import Dataset, load_dataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    EvalPrediction,
    Trainer,
    TrainingArguments,
)

from src.config import CONFIGS_DIR, MODELS_DIR

logger = logging.getLogger(__name__)


def load_training_config() -> dict[str, Any]:
    """Load training hyperparameters from YAML config."""
    config_path = CONFIGS_DIR / "training_config.yaml"
    with open(config_path) as f:
        result: dict[str, Any] = yaml.safe_load(f)
    return result


def build_ekman_mapping(cfg: dict[str, Any]) -> dict[int, int]:
    """Build GoEmotions label index → Ekman index mapping.

    GoEmotions has 28 fine-grained labels. We map each to one of the
    7 Ekman categories defined in training_config.yaml.
    """
    emotion_mapping: dict[str, list[str]] = cfg["data"]["emotion_mapping"]
    ekman_labels: list[str] = cfg["data"]["labels"]

    # GoEmotions label names (from the dataset)
    go_labels = [
        "admiration", "amusement", "anger", "annoyance", "approval", "caring",
        "confusion", "curiosity", "desire", "disappointment", "disapproval",
        "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief",
        "joy", "love", "nervousness", "optimism", "pride", "realization",
        "relief", "remorse", "sadness", "surprise", "neutral",
    ]

    fine_to_ekman: dict[str, str] = {}
    for ekman_cat, fine_list in emotion_mapping.items():
        for fine_label in fine_list:
            fine_to_ekman[fine_label] = ekman_cat

    mapping: dict[int, int] = {}
    for i, go_label in enumerate(go_labels):
        ekman_cat = fine_to_ekman.get(go_label, "neutral")
        mapping[i] = ekman_labels.index(ekman_cat)

    return mapping


def prepare_dataset(cfg: dict[str, Any]) -> tuple[Dataset, Dataset, Dataset]:
    """Load GoEmotions and map to Ekman-6 + neutral labels."""
    ekman_map = build_ekman_mapping(cfg)
    num_labels = len(cfg["data"]["labels"])

    ds = load_dataset("google-research-datasets/goemotions", "simplified")

    def remap(example: dict[str, Any]) -> dict[str, Any]:
        # GoEmotions can have multiple labels; we pick the majority-mapped Ekman category
        ekman_counts = [0] * num_labels
        for label_id in example["labels"]:
            if label_id in ekman_map:
                ekman_counts[ekman_map[label_id]] += 1
        example["label"] = int(np.argmax(ekman_counts))
        return example

    train = ds["train"].map(remap)
    val = ds["validation"].map(remap)
    test = ds["test"].map(remap)
    return train, val, test


def compute_metrics(pred: EvalPrediction) -> dict[str, float]:
    """Compute accuracy and per-class F1 for evaluation."""
    from sklearn.metrics import accuracy_score, f1_score

    labels = pred.label_ids
    preds = np.argmax(pred.predictions, axis=-1)
    acc = float(accuracy_score(labels, preds))
    f1_macro = float(f1_score(labels, preds, average="macro", zero_division=0))
    f1_weighted = float(f1_score(labels, preds, average="weighted", zero_division=0))
    return {"accuracy": acc, "f1_macro": f1_macro, "f1_weighted": f1_weighted}


def train(output_dir: str | None = None) -> str:
    """Run the full training pipeline. Returns path to saved model."""
    cfg = load_training_config()
    model_cfg = cfg["model"]
    train_cfg = cfg["training"]
    labels = cfg["data"]["labels"]

    out = Path(output_dir or str(MODELS_DIR / "emotion_finetuned"))
    out.mkdir(parents=True, exist_ok=True)

    # --- Experiment tracking ---
    import mlflow
    import wandb

    from src.config import config

    mlflow.set_tracking_uri(config.mlflow_tracking_uri)
    mlflow.set_experiment("emotion-classifier")
    wandb.init(
        project=config.wandb_project,
        entity=config.wandb_entity or None,
        config={"model": model_cfg, "training": train_cfg},
    )

    # --- Model + tokenizer ---
    tokenizer = AutoTokenizer.from_pretrained(model_cfg["base_model"])
    model = AutoModelForSequenceClassification.from_pretrained(
        model_cfg["base_model"],
        num_labels=len(labels),
        id2label={i: name for i, name in enumerate(labels)},
        label2id={name: i for i, name in enumerate(labels)},
    )

    # --- Data ---
    train_ds, val_ds, test_ds = prepare_dataset(cfg)

    def tokenize(examples: dict[str, Any]) -> dict[str, Any]:
        result: dict[str, Any] = tokenizer(
            examples["text"],
            padding="max_length",
            truncation=True,
            max_length=model_cfg["max_length"],
        )
        return result

    train_ds = train_ds.map(tokenize, batched=True)
    val_ds = val_ds.map(tokenize, batched=True)
    test_ds = test_ds.map(tokenize, batched=True)

    # --- Training ---
    training_args = TrainingArguments(
        output_dir=str(out),
        num_train_epochs=train_cfg["epochs"],
        per_device_train_batch_size=train_cfg["batch_size"],
        per_device_eval_batch_size=train_cfg["batch_size"],
        learning_rate=train_cfg["learning_rate"],
        warmup_ratio=train_cfg["warmup_ratio"],
        weight_decay=train_cfg["weight_decay"],
        fp16=train_cfg.get("fp16", torch.cuda.is_available()),
        gradient_accumulation_steps=train_cfg.get("gradient_accumulation_steps", 1),
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        report_to=["wandb", "mlflow"],
        logging_steps=50,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        compute_metrics=compute_metrics,
    )

    with mlflow.start_run():
        mlflow.log_params({"base_model": model_cfg["base_model"], **train_cfg})
        trainer.train()

        # Evaluate on test set
        test_results = trainer.evaluate(test_ds)
        mlflow.log_metrics({f"test_{k}": v for k, v in test_results.items()})
        wandb.log({f"test_{k}": v for k, v in test_results.items()})

        # Save model
        trainer.save_model(str(out))
        tokenizer.save_pretrained(str(out))
        mlflow.log_artifact(str(out))

    wandb.finish()
    logger.info("Training complete. Model saved to %s", out)
    return str(out)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train()

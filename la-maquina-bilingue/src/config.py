"""Shared configuration for La Máquina Bilingüe."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# Project root (la-maquina-bilingue/)
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"
CONFIGS_DIR = PROJECT_ROOT / "configs"


@dataclass
class Config:
    """Application configuration loaded from environment variables with defaults."""

    # Database
    duckdb_path: str = field(
        default_factory=lambda: os.getenv(
            "DUCKDB_PATH", str(DATA_DIR / "headlines.duckdb")
        )
    )

    # Qdrant
    qdrant_url: str = field(default_factory=lambda: os.getenv("QDRANT_URL", "http://localhost:6333"))
    qdrant_collection_en: str = "maquina_headlines_en"
    qdrant_collection_es: str = "maquina_headlines_es"

    # MLflow
    mlflow_tracking_uri: str = field(
        default_factory=lambda: os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
    )

    # W&B
    wandb_project: str = "la-maquina-bilingue"
    wandb_entity: str = field(default_factory=lambda: os.getenv("WANDB_ENTITY", ""))

    # Model
    embedding_model: str = "sentence-transformers/LaBSE"
    emotion_model: str = "xlm-roberta-base"
    onnx_model_path: str = field(
        default_factory=lambda: str(MODELS_DIR / "emotion_classifier.onnx")
    )

    # Matching
    match_cosine_threshold: float = 0.75
    match_time_window_hours: int = 24

    # Feeds config
    feeds_config_path: str = field(
        default_factory=lambda: str(PROJECT_ROOT / "src" / "ingestion" / "feeds.yaml")
    )

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000


config = Config()

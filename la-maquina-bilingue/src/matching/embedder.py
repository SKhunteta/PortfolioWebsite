"""LaBSE sentence embeddings for multilingual headline encoding."""

from __future__ import annotations

import logging

import numpy as np
from sentence_transformers import SentenceTransformer

from src.config import config

logger = logging.getLogger(__name__)


class HeadlineEmbedder:
    """Encode headlines into dense vectors using LaBSE."""

    def __init__(self, model_name: str | None = None) -> None:
        self.model_name = model_name or config.embedding_model
        self.model = SentenceTransformer(self.model_name)
        self.dimension = self.model.get_sentence_embedding_dimension() or 768
        logger.info("Loaded embedding model %s (dim=%d)", self.model_name, self.dimension)

    def encode(self, text: str) -> np.ndarray:
        """Encode a single text to a vector."""
        return self.model.encode(text, convert_to_numpy=True, normalize_embeddings=True)

    def encode_batch(self, texts: list[str], batch_size: int = 64) -> np.ndarray:
        """Encode a batch of texts to vectors."""
        return self.model.encode(
            texts, batch_size=batch_size, convert_to_numpy=True, normalize_embeddings=True
        )

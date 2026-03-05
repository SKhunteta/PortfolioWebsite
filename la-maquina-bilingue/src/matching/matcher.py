"""Cross-lingual headline matcher using Qdrant vector search."""

from __future__ import annotations

import logging
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from src.config import config
from src.ingestion.headline_store import HeadlineStore
from src.matching.embedder import HeadlineEmbedder

logger = logging.getLogger(__name__)


class HeadlineMatcher:
    """Match headlines across EN/ES using LaBSE embeddings + Qdrant."""

    def __init__(
        self,
        qdrant_url: str | None = None,
        store: HeadlineStore | None = None,
        embedder: HeadlineEmbedder | None = None,
    ) -> None:
        self.client = QdrantClient(url=qdrant_url or config.qdrant_url)
        self.store = store or HeadlineStore()
        self.embedder = embedder or HeadlineEmbedder()
        self.threshold = config.match_cosine_threshold
        self._ensure_collections()

    def _ensure_collections(self) -> None:
        """Create Qdrant collections if they don't exist."""
        dim = self.embedder.dimension
        for name in [config.qdrant_collection_en, config.qdrant_collection_es]:
            if not self.client.collection_exists(name):
                self.client.create_collection(
                    collection_name=name,
                    vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
                )
                logger.info("Created Qdrant collection: %s", name)

    def _collection_for_language(self, language: str) -> str:
        if language == "en":
            return config.qdrant_collection_en
        return config.qdrant_collection_es

    def index_headlines(self, language: str, limit: int = 500) -> int:
        """Embed and index recent headlines for a language into Qdrant."""
        headlines = self.store.get_by_language(language, limit=limit)
        if not headlines:
            return 0

        texts = [h["title"] for h in headlines]
        vectors = self.embedder.encode_batch(texts)
        collection = self._collection_for_language(language)

        points = [
            PointStruct(
                id=i,
                vector=vectors[i].tolist(),
                payload={"headline_id": h["id"], "title": h["title"], "source": h["source"]},
            )
            for i, h in enumerate(headlines)
        ]
        self.client.upsert(collection_name=collection, points=points)
        logger.info("Indexed %d %s headlines into %s", len(points), language.upper(), collection)
        return len(points)

    def find_matches(self, language: str = "en", limit: int = 100) -> list[dict[str, Any]]:
        """Find cross-lingual matches for headlines in the given language.

        For each EN headline, search the ES collection (and vice versa).
        """
        target_lang = "es" if language == "en" else "en"
        target_collection = self._collection_for_language(target_lang)

        headlines = self.store.get_by_language(language, limit=limit)
        if not headlines:
            return []

        texts = [h["title"] for h in headlines]
        vectors = self.embedder.encode_batch(texts)

        matches: list[dict[str, Any]] = []
        for i, headline in enumerate(headlines):
            results = self.client.search(
                collection_name=target_collection,
                query_vector=vectors[i].tolist(),
                limit=1,
            )
            if results and results[0].score >= self.threshold:
                best = results[0]
                match_info = {
                    "source_id": headline["id"],
                    "source_title": headline["title"],
                    "matched_id": best.payload["headline_id"],
                    "matched_title": best.payload["title"],
                    "score": round(best.score, 4),
                }
                matches.append(match_info)

                # Persist the match
                self.store.update_match(
                    headline["id"], best.payload["headline_id"], best.score
                )

        logger.info(
            "Found %d matches for %d %s headlines (threshold=%.2f)",
            len(matches), len(headlines), language.upper(), self.threshold,
        )
        return matches


def run_matching(db_path: str | None = None) -> dict[str, int]:
    """Full matching pipeline: index both languages, then find cross-lingual matches."""
    store = HeadlineStore(db_path=db_path)
    matcher = HeadlineMatcher(store=store)

    indexed = {}
    for lang in ["en", "es"]:
        indexed[lang] = matcher.index_headlines(lang)

    en_matches = matcher.find_matches("en")
    es_matches = matcher.find_matches("es")

    return {
        "indexed_en": indexed["en"],
        "indexed_es": indexed["es"],
        "matches_en": len(en_matches),
        "matches_es": len(es_matches),
    }

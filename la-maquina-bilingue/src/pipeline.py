"""End-to-end pipeline: ingest → classify → match → monitor."""

from __future__ import annotations

import logging
from typing import Any

from src.ingestion.headline_store import HeadlineStore
from src.ingestion.rss_fetcher import ingest

logger = logging.getLogger(__name__)


def run_ingest(db_path: str | None = None) -> dict[str, int]:
    """Step 1: Fetch RSS feeds and store headlines."""
    logger.info("=== Step 1: Ingesting headlines ===")
    counts = ingest(db_path=db_path)
    logger.info("Ingested: %s", counts)
    return counts


def run_classify(db_path: str | None = None) -> int:
    """Step 2: Run emotion classification on unscored headlines."""
    logger.info("=== Step 2: Classifying emotions ===")
    try:
        from src.emotion.classifier import EmotionClassifier
    except ImportError:
        logger.warning("Skipping classification (torch/transformers not installed)")
        return 0

    store = HeadlineStore(db_path=db_path)
    classifier = EmotionClassifier()
    classified = 0

    for lang in ["en", "es"]:
        headlines = store.get_by_language(lang, limit=500)
        unscored = [h for h in headlines if not h.get("emotions")]
        if not unscored:
            logger.info("No unscored %s headlines", lang.upper())
            continue

        texts = [h["title"] for h in unscored]
        predictions = classifier.predict_batch(texts)

        for headline, emotions in zip(unscored, predictions, strict=False):
            store.update_emotions(headline["id"], emotions)
            classified += 1

        logger.info("Classified %d %s headlines", len(unscored), lang.upper())

    return classified


def run_match(db_path: str | None = None) -> dict[str, int]:
    """Step 3: Match headlines across languages via Qdrant."""
    logger.info("=== Step 3: Matching across languages ===")
    try:
        from src.matching.matcher import run_matching
    except ImportError:
        logger.warning("Skipping matching (qdrant-client/sentence-transformers not installed)")
        return {}

    try:
        result = run_matching(db_path=db_path)
        logger.info("Matching result: %s", result)
        return result
    except Exception as e:
        logger.warning("Skipping matching (Qdrant unavailable: %s)", e)
        return {}


def run_monitor(db_path: str | None = None) -> list[dict[str, Any]]:
    """Step 4: Check for data/prediction drift."""
    logger.info("=== Step 4: Monitoring for drift ===")
    try:
        from src.monitoring.drift import DriftMonitor
    except ImportError:
        logger.warning("Skipping monitoring (pandas/evidently not installed)")
        return []

    store = HeadlineStore(db_path=db_path)
    monitor = DriftMonitor(store=store)

    try:
        results = monitor.run_all()
        return results
    except Exception as e:
        logger.warning("Drift monitoring failed: %s", e)
        return []


def run_all(db_path: str | None = None) -> dict[str, Any]:
    """Run the full pipeline: ingest → classify → match → monitor."""
    summary: dict[str, Any] = {}

    summary["ingest"] = run_ingest(db_path=db_path)
    summary["classified"] = run_classify(db_path=db_path)
    summary["matching"] = run_match(db_path=db_path)
    summary["monitoring"] = run_monitor(db_path=db_path)

    store = HeadlineStore(db_path=db_path)
    summary["totals"] = {
        "en": store.count("en"),
        "es": store.count("es"),
        "pairs": len(store.get_matched_pairs()),
    }

    logger.info("=== Pipeline complete ===")
    logger.info("Summary: %s", summary)
    return summary


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )
    run_all()

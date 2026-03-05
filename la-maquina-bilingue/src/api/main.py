"""FastAPI application for La Máquina Bilingüe."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Query

from src.ingestion.headline_store import HeadlineStore

app = FastAPI(
    title="La Máquina Bilingüe",
    description="Cross-lingual emotion analysis of EN/ES news headlines",
    version="0.1.0",
)

_store: HeadlineStore | None = None


def _get_store() -> HeadlineStore:
    global _store
    if _store is None:
        _store = HeadlineStore()
    return _store


@app.get("/health")
def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/stats")
def stats() -> dict[str, Any]:
    """Headline counts by language."""
    store = _get_store()
    return {
        "total": store.count(),
        "en": store.count("en"),
        "es": store.count("es"),
    }


@app.get("/headlines")
def get_headlines(
    language: str = Query("en", pattern="^(en|es)$"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[dict[str, Any]]:
    """List headlines for a language, newest first."""
    store = _get_store()
    return store.get_by_language(language, limit=limit, offset=offset)


@app.get("/pairs")
def get_pairs(
    limit: int = Query(50, ge=1, le=200),
) -> list[dict[str, Any]]:
    """Get cross-lingual matched headline pairs with emotion scores."""
    store = _get_store()
    return store.get_matched_pairs(limit=limit)


@app.get("/recent")
def get_recent(
    hours: int = Query(24, ge=1, le=168),
    language: str | None = Query(None, pattern="^(en|es)$"),
) -> list[dict[str, Any]]:
    """Get headlines from the last N hours."""
    store = _get_store()
    return store.get_recent(hours=hours, language=language)


@app.post("/ingest")
def trigger_ingest() -> dict[str, Any]:
    """Trigger RSS ingestion pipeline."""
    from src.ingestion.rss_fetcher import ingest

    counts = ingest()
    return {"status": "ok", "inserted": counts}

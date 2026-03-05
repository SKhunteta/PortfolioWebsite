"""Tests for the FastAPI serving layer."""

from __future__ import annotations

import os
import tempfile

import pytest
from fastapi.testclient import TestClient

from src.ingestion.headline_store import HeadlineStore


@pytest.fixture
def _temp_store(monkeypatch):
    """Patch the API to use a temp DuckDB database."""
    with tempfile.NamedTemporaryFile(suffix=".duckdb", delete=False) as f:
        db_path = f.name
    os.unlink(db_path)

    store = HeadlineStore(db_path=db_path)

    import src.api.main as api_module

    monkeypatch.setattr(api_module, "_store", store)
    yield store

    if os.path.exists(db_path):
        os.unlink(db_path)


@pytest.fixture
def client(_temp_store):
    """Create a FastAPI test client with a temp database."""
    from src.api.main import app

    return TestClient(app)


class TestHealthAndStats:
    def test_health(self, client):
        """Health endpoint returns ok."""
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}

    def test_stats_empty(self, client):
        """Stats endpoint with empty database."""
        resp = client.get("/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["en"] == 0
        assert data["es"] == 0


class TestHeadlineEndpoints:
    def test_get_headlines_empty(self, client):
        """Headlines endpoint returns empty list when no data."""
        resp = client.get("/headlines?language=en")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_headlines_with_data(self, client, _temp_store):
        """Headlines endpoint returns stored headlines."""
        from datetime import UTC, datetime

        from src.ingestion.headline_store import Headline

        _temp_store.upsert(Headline(
            id="api-test-1",
            title="Test headline",
            source="Test",
            language="en",
            url="https://example.com/api-test",
            published_at=datetime.now(UTC),
            fetched_at=datetime.now(UTC),
        ))

        resp = client.get("/headlines?language=en")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["title"] == "Test headline"

    def test_get_headlines_validates_language(self, client):
        """Headlines endpoint rejects invalid language."""
        resp = client.get("/headlines?language=fr")
        assert resp.status_code == 422

    def test_get_pairs_empty(self, client):
        """Pairs endpoint returns empty list when no matches."""
        resp = client.get("/pairs")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_recent_empty(self, client):
        """Recent endpoint returns empty list."""
        resp = client.get("/recent?hours=24")
        assert resp.status_code == 200
        assert resp.json() == []

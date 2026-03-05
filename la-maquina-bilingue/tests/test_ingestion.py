"""Tests for the RSS ingestion pipeline."""

from __future__ import annotations

import os
import tempfile
from datetime import UTC, datetime
from unittest.mock import MagicMock, patch

import pytest

from src.ingestion.headline_store import Headline, HeadlineStore
from src.ingestion.rss_fetcher import fetch_feed, load_feeds, parse_published_date

# --- Fixtures ---


@pytest.fixture
def temp_db():
    """Create a temporary DuckDB database for testing."""
    with tempfile.NamedTemporaryFile(suffix=".duckdb", delete=False) as f:
        db_path = f.name
    yield db_path
    os.unlink(db_path)


@pytest.fixture
def store(temp_db):
    """Create a HeadlineStore with a temp database."""
    return HeadlineStore(db_path=temp_db)


@pytest.fixture
def sample_headline():
    """Create a sample headline for testing."""
    return Headline(
        id="test-id-001",
        title="Test headline about climate change",
        source="BBC World",
        language="en",
        url="https://example.com/article-001",
        published_at=datetime(2024, 1, 15, 12, 0, 0, tzinfo=UTC),
        fetched_at=datetime.now(UTC),
    )


@pytest.fixture
def sample_headline_es():
    """Create a sample Spanish headline."""
    return Headline(
        id="test-id-002",
        title="Titular de prueba sobre el cambio climático",
        source="BBC Mundo",
        language="es",
        url="https://example.com/articulo-002",
        published_at=datetime(2024, 1, 15, 13, 0, 0, tzinfo=UTC),
        fetched_at=datetime.now(UTC),
    )


# --- HeadlineStore Tests ---


class TestHeadlineStore:
    def test_insert_and_count(self, store, sample_headline):
        """Inserting a headline increases the count."""
        assert store.count() == 0
        store.upsert(sample_headline)
        assert store.count() == 1

    def test_dedup_by_url(self, store, sample_headline):
        """Duplicate URLs are skipped on insert."""
        store.upsert(sample_headline)
        # Create a different headline with the same URL
        duplicate = Headline(
            id="different-id",
            title="Different title",
            source="Different source",
            language="en",
            url=sample_headline.url,  # Same URL
            published_at=datetime.now(UTC),
            fetched_at=datetime.now(UTC),
        )
        store.upsert(duplicate)
        assert store.count() == 1

    def test_count_by_language(self, store, sample_headline, sample_headline_es):
        """Count can filter by language."""
        store.upsert(sample_headline)
        store.upsert(sample_headline_es)
        assert store.count("en") == 1
        assert store.count("es") == 1
        assert store.count() == 2

    def test_get_by_language(self, store, sample_headline, sample_headline_es):
        """Get headlines filtered by language."""
        store.upsert(sample_headline)
        store.upsert(sample_headline_es)

        en_headlines = store.get_by_language("en")
        assert len(en_headlines) == 1
        assert en_headlines[0]["title"] == sample_headline.title

        es_headlines = store.get_by_language("es")
        assert len(es_headlines) == 1
        assert es_headlines[0]["title"] == sample_headline_es.title

    def test_upsert_batch(self, store):
        """Batch insert returns correct count of new insertions."""
        headlines = [
            Headline(
                id=f"batch-{i}",
                title=f"Headline {i}",
                source="Test",
                language="en",
                url=f"https://example.com/batch-{i}",
                published_at=datetime.now(UTC),
                fetched_at=datetime.now(UTC),
            )
            for i in range(5)
        ]
        inserted = store.upsert_batch(headlines)
        assert inserted == 5
        assert store.count() == 5

        # Re-insert same batch
        inserted_again = store.upsert_batch(headlines)
        assert inserted_again == 0
        assert store.count() == 5

    def test_update_emotions(self, store, sample_headline):
        """Emotion scores can be updated."""
        store.upsert(sample_headline)
        emotions = {
            "anger": 0.1, "joy": 0.05, "fear": 0.6,
            "sadness": 0.15, "surprise": 0.05, "disgust": 0.05,
        }
        store.update_emotions(sample_headline.id, emotions)

    def test_update_match(self, store, sample_headline, sample_headline_es):
        """Cross-lingual match can be set."""
        store.upsert(sample_headline)
        store.upsert(sample_headline_es)
        store.update_match(sample_headline.id, sample_headline_es.id, 0.89)

        pairs = store.get_matched_pairs()
        assert len(pairs) == 1
        assert pairs[0]["en_title"] == sample_headline.title
        assert pairs[0]["es_title"] == sample_headline_es.title
        assert pairs[0]["match_score"] == pytest.approx(0.89)


# --- Feed Loading Tests ---


class TestFeedLoading:
    def test_load_feeds_from_yaml(self):
        """feeds.yaml loads correctly with EN and ES feeds."""
        feeds = load_feeds()
        assert len(feeds) == 8

        en_feeds = [f for f in feeds if f["language"] == "en"]
        es_feeds = [f for f in feeds if f["language"] == "es"]
        assert len(en_feeds) == 4
        assert len(es_feeds) == 4

    def test_feed_config_has_required_fields(self):
        """Each feed config has name, url, and language."""
        feeds = load_feeds()
        for feed in feeds:
            assert "name" in feed
            assert "url" in feed
            assert "language" in feed
            assert feed["language"] in ("en", "es")


# --- RSS Parsing Tests ---


class TestRSSParsing:
    def test_parse_published_date_with_published(self):
        """Published date is extracted from published_parsed."""
        entry = MagicMock()
        entry.published_parsed = (2024, 1, 15, 12, 0, 0, 0, 15, 0)
        entry.updated_parsed = None
        dt = parse_published_date(entry)
        assert dt.year == 2024
        assert dt.month == 1
        assert dt.day == 15

    def test_parse_published_date_fallback(self):
        """Falls back to current time when no date is available."""
        entry = MagicMock()
        entry.published_parsed = None
        entry.updated_parsed = None
        dt = parse_published_date(entry)
        assert dt.year == datetime.now().year

    @patch("src.ingestion.rss_fetcher.feedparser.parse")
    def test_fetch_feed_handles_network_error(self, mock_parse):
        """Fetch gracefully handles network errors."""
        mock_parse.side_effect = Exception("Network error")
        feed_config = {"name": "Test Feed", "url": "http://bad-url.example.com", "language": "en"}
        result = fetch_feed(feed_config)
        assert result == []

    @patch("src.ingestion.rss_fetcher.feedparser.parse")
    def test_fetch_feed_parses_entries(self, mock_parse):
        """Fetch correctly parses RSS entries into Headlines."""
        mock_entry = MagicMock()
        mock_entry.get = lambda key, default="": {
            "title": "Test Headline",
            "link": "https://example.com/test",
        }.get(key, default)
        mock_entry.published_parsed = (2024, 6, 1, 10, 0, 0, 5, 153, 0)

        mock_feed = MagicMock()
        mock_feed.bozo = False
        mock_feed.entries = [mock_entry]
        mock_parse.return_value = mock_feed

        feed_config = {"name": "Test Source", "url": "http://test.com/rss", "language": "en"}
        headlines = fetch_feed(feed_config)

        assert len(headlines) == 1
        assert headlines[0].title == "Test Headline"
        assert headlines[0].source == "Test Source"
        assert headlines[0].language == "en"
        assert headlines[0].url == "https://example.com/test"

    @patch("src.ingestion.rss_fetcher.feedparser.parse")
    def test_fetch_feed_skips_empty_entries(self, mock_parse):
        """Entries without title or link are skipped."""
        mock_entry_no_title = MagicMock()
        mock_entry_no_title.get = lambda key, default="": {
            "title": "",
            "link": "https://example.com/test",
        }.get(key, default)

        mock_entry_no_link = MagicMock()
        mock_entry_no_link.get = lambda key, default="": {
            "title": "Has Title",
            "link": "",
        }.get(key, default)

        mock_feed = MagicMock()
        mock_feed.bozo = False
        mock_feed.entries = [mock_entry_no_title, mock_entry_no_link]
        mock_parse.return_value = mock_feed

        feed_config = {"name": "Test", "url": "http://test.com/rss", "language": "en"}
        headlines = fetch_feed(feed_config)
        assert len(headlines) == 0

"""RSS feed fetcher for English and Spanish news headlines."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from time import mktime

import feedparser
import yaml

from src.config import config
from src.ingestion.headline_store import Headline, HeadlineStore

logger = logging.getLogger(__name__)


def load_feeds(config_path: str | None = None) -> list[dict]:
    """Load feed definitions from feeds.yaml."""
    path = Path(config_path or config.feeds_config_path)
    with open(path) as f:
        data = yaml.safe_load(f)

    feeds = []
    for lang_group in ["english", "spanish"]:
        if lang_group in data:
            feeds.extend(data[lang_group])
    return feeds


def parse_published_date(entry: dict) -> datetime:
    """Extract publication date from an RSS entry."""
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        return datetime.fromtimestamp(mktime(entry.published_parsed), tz=timezone.utc)
    if hasattr(entry, "updated_parsed") and entry.updated_parsed:
        return datetime.fromtimestamp(mktime(entry.updated_parsed), tz=timezone.utc)
    return datetime.now(timezone.utc)


def fetch_feed(feed_config: dict) -> list[Headline]:
    """Fetch headlines from a single RSS feed."""
    name = feed_config["name"]
    url = feed_config["url"]
    language = feed_config["language"]

    logger.info(f"Fetching feed: {name} ({url})")

    try:
        parsed = feedparser.parse(url)
    except Exception as e:
        logger.error(f"Failed to fetch {name}: {e}")
        return []

    if parsed.bozo and not parsed.entries:
        logger.warning(f"Feed {name} returned bozo error: {parsed.bozo_exception}")
        return []

    headlines = []
    now = datetime.now(timezone.utc)

    for entry in parsed.entries:
        title = entry.get("title", "").strip()
        link = entry.get("link", "").strip()

        if not title or not link:
            continue

        headline = Headline(
            id=str(uuid.uuid4()),
            title=title,
            source=name,
            language=language,
            url=link,
            published_at=parse_published_date(entry),
            fetched_at=now,
        )
        headlines.append(headline)

    logger.info(f"Fetched {len(headlines)} headlines from {name}")
    return headlines


def fetch_all_feeds(config_path: str | None = None) -> dict[str, list[Headline]]:
    """Fetch from all configured RSS feeds. Returns headlines grouped by language."""
    feeds = load_feeds(config_path)
    results: dict[str, list[Headline]] = {"en": [], "es": []}

    for feed_config in feeds:
        headlines = fetch_feed(feed_config)
        lang = feed_config["language"]
        if lang in results:
            results[lang].extend(headlines)

    logger.info(
        f"Total fetched: {len(results['en'])} EN, {len(results['es'])} ES"
    )
    return results


def ingest(config_path: str | None = None, db_path: str | None = None) -> dict[str, int]:
    """Full ingestion pipeline: fetch all feeds and store in DuckDB."""
    store = HeadlineStore(db_path=db_path)
    all_headlines = fetch_all_feeds(config_path)

    counts = {}
    for lang, headlines in all_headlines.items():
        inserted = store.upsert_batch(headlines)
        counts[lang] = inserted
        logger.info(f"Inserted {inserted}/{len(headlines)} new {lang.upper()} headlines")

    return counts


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    counts = ingest()
    print(f"\nIngestion complete: {counts}")
    store = HeadlineStore()
    print(f"Total in DB: {store.count('en')} EN, {store.count('es')} ES")

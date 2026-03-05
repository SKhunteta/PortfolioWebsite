"""DuckDB storage layer for headlines."""

from __future__ import annotations

import duckdb
from dataclasses import dataclass
from datetime import datetime

from src.config import config


@dataclass
class Headline:
    """A single news headline with metadata."""

    id: str
    title: str
    source: str
    language: str
    url: str
    published_at: datetime
    fetched_at: datetime
    emotions: dict | None = None
    matched_id: str | None = None
    match_score: float | None = None


class HeadlineStore:
    """DuckDB-backed storage for news headlines."""

    def __init__(self, db_path: str | None = None) -> None:
        self.db_path = db_path or config.duckdb_path
        self._ensure_table()

    def _get_conn(self) -> duckdb.DuckDBPyConnection:
        return duckdb.connect(self.db_path)

    def _ensure_table(self) -> None:
        conn = self._get_conn()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS headlines (
                id VARCHAR PRIMARY KEY,
                title VARCHAR NOT NULL,
                source VARCHAR NOT NULL,
                language VARCHAR NOT NULL,
                url VARCHAR NOT NULL UNIQUE,
                published_at TIMESTAMP NOT NULL,
                fetched_at TIMESTAMP NOT NULL,
                emotions JSON,
                matched_id VARCHAR,
                match_score DOUBLE
            )
        """)
        conn.close()

    def upsert(self, headline: Headline) -> bool:
        """Insert a headline, skipping if URL already exists. Returns True if inserted."""
        conn = self._get_conn()
        try:
            conn.execute(
                """
                INSERT INTO headlines (id, title, source, language, url, published_at, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (url) DO NOTHING
                """,
                [
                    headline.id,
                    headline.title,
                    headline.source,
                    headline.language,
                    headline.url,
                    headline.published_at,
                    headline.fetched_at,
                ],
            )
            # Check if the row was actually inserted
            result = conn.execute(
                "SELECT id FROM headlines WHERE id = ?", [headline.id]
            ).fetchone()
            return result is not None
        finally:
            conn.close()

    def upsert_batch(self, headlines: list[Headline]) -> int:
        """Insert multiple headlines. Returns count of newly inserted."""
        inserted = 0
        for headline in headlines:
            if self.upsert(headline):
                inserted += 1
        return inserted

    def get_by_language(
        self, language: str, limit: int = 100, offset: int = 0
    ) -> list[dict]:
        """Get headlines for a language, newest first."""
        conn = self._get_conn()
        try:
            rows = conn.execute(
                """
                SELECT id, title, source, language, url, published_at, fetched_at,
                       emotions, matched_id, match_score
                FROM headlines
                WHERE language = ?
                ORDER BY published_at DESC
                LIMIT ? OFFSET ?
                """,
                [language, limit, offset],
            ).fetchall()
            columns = [
                "id", "title", "source", "language", "url", "published_at",
                "fetched_at", "emotions", "matched_id", "match_score",
            ]
            return [dict(zip(columns, row)) for row in rows]
        finally:
            conn.close()

    def get_matched_pairs(self, limit: int = 50) -> list[dict]:
        """Get headline pairs that have been matched across languages."""
        conn = self._get_conn()
        try:
            rows = conn.execute(
                """
                SELECT
                    h1.id as en_id, h1.title as en_title, h1.source as en_source,
                    h1.emotions as en_emotions, h1.published_at as en_published,
                    h2.id as es_id, h2.title as es_title, h2.source as es_source,
                    h2.emotions as es_emotions, h2.published_at as es_published,
                    h1.match_score
                FROM headlines h1
                JOIN headlines h2 ON h1.matched_id = h2.id
                WHERE h1.language = 'en' AND h2.language = 'es'
                ORDER BY h1.published_at DESC
                LIMIT ?
                """,
                [limit],
            ).fetchall()
            columns = [
                "en_id", "en_title", "en_source", "en_emotions", "en_published",
                "es_id", "es_title", "es_source", "es_emotions", "es_published",
                "match_score",
            ]
            return [dict(zip(columns, row)) for row in rows]
        finally:
            conn.close()

    def update_emotions(self, headline_id: str, emotions: dict) -> None:
        """Update emotion scores for a headline."""
        conn = self._get_conn()
        try:
            conn.execute(
                "UPDATE headlines SET emotions = ?::JSON WHERE id = ?",
                [str(emotions), headline_id],
            )
        finally:
            conn.close()

    def update_match(self, headline_id: str, matched_id: str, score: float) -> None:
        """Set the cross-lingual match for a headline."""
        conn = self._get_conn()
        try:
            conn.execute(
                "UPDATE headlines SET matched_id = ?, match_score = ? WHERE id = ?",
                [matched_id, score, headline_id],
            )
        finally:
            conn.close()

    def count(self, language: str | None = None) -> int:
        """Count headlines, optionally filtered by language."""
        conn = self._get_conn()
        try:
            if language:
                result = conn.execute(
                    "SELECT COUNT(*) FROM headlines WHERE language = ?", [language]
                ).fetchone()
            else:
                result = conn.execute("SELECT COUNT(*) FROM headlines").fetchone()
            return result[0] if result else 0
        finally:
            conn.close()

    def get_recent(self, hours: int = 24, language: str | None = None) -> list[dict]:
        """Get headlines from the last N hours."""
        conn = self._get_conn()
        try:
            query = """
                SELECT id, title, source, language, url, published_at, fetched_at,
                       emotions, matched_id, match_score
                FROM headlines
                WHERE fetched_at >= NOW() - INTERVAL ? HOUR
            """
            params: list = [hours]
            if language:
                query += " AND language = ?"
                params.append(language)
            query += " ORDER BY published_at DESC"

            rows = conn.execute(query, params).fetchall()
            columns = [
                "id", "title", "source", "language", "url", "published_at",
                "fetched_at", "emotions", "matched_id", "match_score",
            ]
            return [dict(zip(columns, row)) for row in rows]
        finally:
            conn.close()

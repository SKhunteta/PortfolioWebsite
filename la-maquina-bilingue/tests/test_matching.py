"""Tests for the cross-lingual matching module (mocked — no qdrant/torch in CI)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

np = pytest.importorskip("numpy", reason="numpy not available in CI")
pytest.importorskip("sentence_transformers", reason="sentence-transformers not available in CI")
pytest.importorskip("qdrant_client", reason="qdrant-client not available in CI")


class TestHeadlineEmbedder:
    @patch("src.matching.embedder.SentenceTransformer")
    def test_encode_returns_vector(self, mock_st):
        """Embedder returns a numpy vector for a single text."""
        mock_model = MagicMock()
        mock_model.encode.return_value = np.random.rand(768).astype(np.float32)
        mock_model.get_sentence_embedding_dimension.return_value = 768
        mock_st.return_value = mock_model

        from src.matching.embedder import HeadlineEmbedder

        embedder = HeadlineEmbedder(model_name="test-model")
        vec = embedder.encode("test headline")
        assert vec.shape == (768,)

    @patch("src.matching.embedder.SentenceTransformer")
    def test_encode_batch(self, mock_st):
        """Embedder batch-encodes multiple texts."""
        mock_model = MagicMock()
        mock_model.encode.return_value = np.random.rand(3, 768).astype(np.float32)
        mock_model.get_sentence_embedding_dimension.return_value = 768
        mock_st.return_value = mock_model

        from src.matching.embedder import HeadlineEmbedder

        embedder = HeadlineEmbedder(model_name="test-model")
        vecs = embedder.encode_batch(["a", "b", "c"])
        assert vecs.shape == (3, 768)


class TestHeadlineMatcher:
    @patch("src.matching.matcher.HeadlineEmbedder")
    @patch("src.matching.matcher.QdrantClient")
    @patch("src.matching.matcher.HeadlineStore")
    def test_collection_for_language(self, mock_store, mock_qdrant, mock_embedder):
        """Matcher maps language codes to correct Qdrant collections."""
        mock_embedder_inst = MagicMock()
        mock_embedder_inst.dimension = 768
        mock_embedder.return_value = mock_embedder_inst
        mock_qdrant.return_value = MagicMock()
        mock_qdrant.return_value.collection_exists.return_value = True

        from src.matching.matcher import HeadlineMatcher

        matcher = HeadlineMatcher(
            qdrant_url="http://fake:6333",
            store=mock_store.return_value,
            embedder=mock_embedder_inst,
        )
        assert matcher._collection_for_language("en") == "maquina_headlines_en"
        assert matcher._collection_for_language("es") == "maquina_headlines_es"

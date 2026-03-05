# La Máquina Bilingüe — Claude Code Instructions

## What This Is
Cross-lingual emotion analysis system comparing how EN and ES news outlets frame the same stories with different emotional language.

## Project Structure
- `src/ingestion/` — RSS feed fetching, DuckDB storage
- `src/matching/` — LaBSE embeddings, Qdrant vector search, cross-lingual story matching
- `src/emotion/` — XLM-RoBERTa emotion classification, training, evaluation, ONNX export
- `src/monitoring/` — Evidently AI drift detection
- `src/api/` — FastAPI serving layer
- `tests/` — pytest test suite
- `configs/` — training and monitoring config YAML files
- `data/` — DVC-tracked data directories

## Key Commands
```bash
# Run tests
pytest tests/ -v

# Lint
ruff check src/ tests/

# Type check
mypy src/

# Run API locally
uvicorn src.api.main:app --reload --port 8000

# Fetch headlines
python -m src.ingestion.rss_fetcher

# Full stack
docker-compose up
```

## Rules
- Always log to BOTH MLflow and W&B — never one without the other
- Run tests after every significant change
- Commit frequently with descriptive messages
- When in doubt, choose the simpler option
- Every metric should be visible somewhere

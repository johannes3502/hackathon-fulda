# Embedding-Benchmark (RAG-Pipeline)

Misst den Embedding-Schritt der Pipeline genau so, wie er im Einsatz läuft:
`app/sources/embeddings.py` → FastEmbed/ONNX, `jinaai/jina-embeddings-v2-base-de`
(pinned), `batch_size=16` für Dokumente, `query_embed` für Fact-Check-Queries.
Reine CPU, keine Thread-Sonderkonfiguration.

## Auf einem Rechner messen

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install fastembed==0.9.0 onnxruntime==1.24.4 numpy==2.4.6
.venv/bin/python scripts/benchmark_embedding.py
```

Der erste Lauf lädt das Modell (~0,6 GB) in `~/.cache/fastembed` — die
Modell-Ladezeit ist danach erst vergleichbar. Ergebnis landet als JSON + Markdown
in `benchmarks/results/` und wird mit committet, um Rechner zu vergleichen
(z. B. Laptop vs. Apple M5 Pro). Mac: `python3.12` via `brew`, sonst identisch.

Parameter: 5×10 Query-Läufe (Latenz p50/p95) und 128 Chunks à ~1200 Zeichen
(Throughput, Batch-Latenz). Optional überschreibbar via `--query-reps`,
`--num-chunks`, `--chunk-chars`.
Alle drei Werte müssen positive Ganzzahlen sein. Mit `--output-dir /tmp/418-benchmark`
lassen sich JSON- und Markdown-Berichte in einem anderen Verzeichnis ablegen;
relative Pfade beziehen sich auf das aktuelle Arbeitsverzeichnis. Ohne Flag
bleibt `backend/benchmarks/results/` das Ziel.

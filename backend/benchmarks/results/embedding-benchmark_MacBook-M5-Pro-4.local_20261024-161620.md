# Embedding-Benchmark (RAG-Pipeline)

Modell: `jinaai/jina-embeddings-v2-base-de` @ 3f9eede8 (FastEmbed/ONNX, CPU) · Vektor: 768d, L2=1.0
Gelaufen: 2026-10-24T14:16:20.981254+00:00

| Rechner | Wert |
|---|---|
| Host | MacBook-M5-Pro-4.local |
| CPU | arm (15 Threads) |
| RAM | 24.0 GB |
| OS | macOS-27.0.1-arm64-arm-64bit |
| Python | 3.12.13 |
| fastembed / onnxruntime | 0.9.0 / 1.24.4 |
| Modell geladen (inkl. Download falls kalt) | 0.5s |

| Metrik | Wert |
|---|---|
| Query-Latenz Ø / p95 | 6.1 ms / 6.58 ms |
| Query-Durchsatz | 164.0 q/s |
| Dokument-Embedding gesamt (128 Chunks à ~1200 Zeichen) | 5.37 s |
| Dokument-Durchsatz | 23.82 Chunks/s · 28581 Zeichen/s |
| Batch-Latenz (16 Chunks) Ø / p95 | 671.78 ms / 696.77 ms |

Vorgehen: gleiche Codepfade wie die Pipeline (`FastEmbedEmbedder`, batch_size=16, `query_embed` für Queries); Parameter: 5×10 Queries, 128 Chunks. Siehe `scripts/benchmark_embedding.py`.

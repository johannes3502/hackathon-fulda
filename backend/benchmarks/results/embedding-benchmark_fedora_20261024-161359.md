# Embedding-Benchmark (RAG-Pipeline)

Modell: `jinaai/jina-embeddings-v2-base-de` @ 3f9eede8 (FastEmbed/ONNX, CPU) · Vektor: 768d, L2=1.0
Gelaufen: 2026-10-24T14:13:59.435938+00:00

| Rechner | Wert |
|---|---|
| Host | fedora |
| CPU | 12th Gen Intel(R) Core(TM) i5-1235U (12 Threads) |
| RAM | 15.3 GB |
| OS | Linux-7.2.8-200.fc44.x86_64-x86_64-with-glibc2.43 |
| Python | 3.12.15 |
| fastembed / onnxruntime | 0.9.0 / 1.24.4 |
| Modell geladen (inkl. Download falls kalt) | 31.42s |

| Metrik | Wert |
|---|---|
| Query-Latenz Ø / p95 | 42.29 ms / 60.92 ms |
| Query-Durchsatz | 23.65 q/s |
| Dokument-Embedding gesamt (128 Chunks à ~1200 Zeichen) | 59.9 s |
| Dokument-Durchsatz | 2.14 Chunks/s · 2564 Zeichen/s |
| Batch-Latenz (16 Chunks) Ø / p95 | 7487.22 ms / 8490.62 ms |

Vorgehen: gleiche Codepfade wie die Pipeline (`FastEmbedEmbedder`, batch_size=16, `query_embed` für Queries); Parameter: 5×10 Queries, 128 Chunks. Siehe `scripts/benchmark_embedding.py`.

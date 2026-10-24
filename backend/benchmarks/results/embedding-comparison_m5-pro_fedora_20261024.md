# Embedding comparison: M5 Pro, Fedora i5, and the earlier Mac run

Ran `scripts/benchmark_embedding.py` **unchanged** from
`bench/embedding-benchmark` at `79be080`, following `backend/benchmarks/README.md`.
Defaults: 50 queries (5 repetitions of 10), 128 chunks of 1,200 characters,
eight document batches of 16, three query warmups and one short document warmup.
No thread overrides were set. The native Python 3.12 environment from the
earlier local benchmark was reused with the prescribed package versions.

```sh
cd backend
EMBEDDING_MODEL_PATH=/tmp/fulda-vector-model HF_HUB_OFFLINE=1 \
  /tmp/fulda-vector-bench-py312/bin/python -u scripts/benchmark_embedding.py
```

## Same workload: Mac versus the committed Fedora result

| Metric | M5 Pro | Fedora i5-1235U | Observed Mac advantage |
|---|---:|---:|---:|
| Query mean | 6.10 ms | 42.29 ms | 6.93× lower latency |
| Query p50 (script definition) | 6.13 ms | 42.69 ms | 6.96× lower latency |
| Query p95 | 6.58 ms | 60.92 ms | 9.26× lower latency |
| Sequential query throughput | 164.00 queries/s | 23.65 queries/s | 6.93× higher throughput |
| Embed 128 chunks | 5.37 s | 59.90 s | 11.15× lower elapsed time |
| Document throughput | 23.82 chunks/s | 2.14 chunks/s | 11.13× higher throughput |
| Batch mean / p95 | 671.78 / 696.77 ms | 7,487.22 / 8,490.62 ms | — |

Ratios use the rounded values saved by the script, hence the slight difference
between elapsed-time and throughput ratios. This compares the recorded machine
runs; it does not isolate CPU hardware from OS, memory, power or background load.
Query p95 has 50 observations; batch p95 has only eight and equals their maximum.

Mac hardware verified with `sysctl`: **Apple M5 Pro, 15 logical CPU cores,
24 GiB RAM**, macOS 27.0.1 (26A434), Python 3.12.13. Fedora reports 12 logical
cores, 15.3 GiB RAM and Python 3.12.15. Both results report FastEmbed 0.9.0,
ONNX Runtime 1.24.4, NumPy 2.4.6 and tokenizers 0.23.3.

## Compared with the previous local benchmark

| Metric | Earlier Mac run | Branch-prescribed Mac run |
|---|---:|---:|
| Query p50 | 6.05 ms | 6.13 ms |
| Query p95 | 6.33 ms | 6.58 ms |
| Document chunk size | ~891 characters | 1,200 characters |
| Document throughput | 37.33 chunks/s | 23.82 chunks/s |
| Character throughput | ~33,255 characters/s | 28,581 characters/s |

The earlier document throughput is the median across three 100-chunk runs.
The branch workload uses different text, longer chunks, eight separately timed
batches, different warmup and a different query set/sample count. Its chunk rate
is 36.2% lower; even character throughput is 14.1% lower. These are **different
workloads**, so neither percentage establishes a performance regression. Query
timings remain close, but are also not a controlled same-input comparison.
Earlier p50 uses `statistics.median`; the branch selects the upper middle sample.

The earlier PostgreSQL/hybrid-search results have no matching stage in this
embedding-only benchmark. They cannot be compared with query-embedding latency.

## Verification and limits

- Saved parameters, sample counts, character totals and package versions match
  the Fedora workload. The output vector is 768-dimensional with reported L2=1.0.
- Mac provider verified separately after timing: `CPUExecutionProvider`; FastEmbed
  reported FP32. No GPU, Core ML or special thread configuration was used.
- Mac weights were already downloaded at revision
  `3f9eede875721714945b6a99a3198299243cf2be` (download metadata verified).
  ONNX SHA256: `51654b7441fbfcfef6598b01cbd1ea925ca0f0cad81202fcd36fee325783f1b0`.
- Raw Mac output says CPU `arm`; the actual hardware identity is recorded above.
  It also says `model_cached_before_run: false`: that check only examines
  `~/.cache/fastembed`, ignoring `EMBEDDING_MODEL_PATH`. The Mac run was offline
  with a local model and performed **no download**. Generated files are unedited.
- Do not compare Fedora's 31.42-second load with the Mac's 0.50 seconds: the Fedora
  report permits download time and does not separate it. The script records a
  revision constant but does not enforce that revision when FastEmbed downloads
  without an explicit model path. Fedora's actual weight hash is unavailable.
- One prescribed run per machine; no concurrency, full upload/queue pipeline,
  retrieval quality or production latency was tested. Synthetic sentences are
  timing inputs, not verified factual claims or product guarantees.

Sources: [Mac raw result](embedding-benchmark_MacBook-M5-Pro-4.local_20261024-161620.json),
[Fedora raw result](embedding-benchmark_fedora_20261024-161359.json),
[earlier Mac raw result](../../../docs/benchmarks/2026-10-24-m5-pro-vectors.jsonl).

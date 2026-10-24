# Audio model

Silero VAD v6.2, copyright Silero Team, MIT license.
Source: <https://github.com/snakers4/silero-vad/tree/v6.2>.
Model: `src/silero_vad/data/silero_vad.onnx`.
SHA-256: `1a153a22f4509e292a94e67d6f9b85e8deb25b4988682b7e174c65279d8788e3`.

The image build downloads the model and upstream license into `/app/models/`.
The model is not committed and no model download takes place during inference.
The inference input layout follows upstream `OnnxWrapper` (512 samples +
64 context samples at 16 kHz; half those sizes at 8 kHz). Recurrent state is
reset between recordings. We use ONNX Runtime CPU without PyTorch.

Upstream license: <https://github.com/snakers4/silero-vad/blob/v6.2/LICENSE>.

# Speech-to-text model

OpenAI Whisper, converted to CTranslate2 by Systran:
`Systran/faster-whisper-small` (configurable via the `WHISPER_MODEL` build
argument), MIT license.
Sources: <https://github.com/openai/whisper>,
<https://github.com/SYSTRAN/faster-whisper>,
<https://huggingface.co/Systran/faster-whisper-small>.

The image build downloads the model into `/app/models/whisper`; it is not
committed. At runtime `WHISPER_MODEL_PATH` points to that directory, so
inference does not download model files. faster-whisper (MIT), CTranslate2
(MIT) and PyAV (BSD-3-Clause) are installed from PyPI. PyAV is pinned below
16 because faster-whisper 1.2.1 uses the `metadata_errors` argument removed
in later PyAV releases.

Model quality, German filler preservation and word-timestamp accuracy are not
validated by this repository.

# Embedding model

`jinaai/jina-embeddings-v2-base-de`, copyright Jina AI, Apache-2.0 license.
Source: <https://huggingface.co/jinaai/jina-embeddings-v2-base-de>, revision
`3f9eede875721714945b6a99a3198299243cf2be` (ONNX export `onnx/model.onnx`).
The image build downloads this revision into `/app/models/embedding/`; it is
not committed and inference does not download. Runs with FastEmbed and ONNX
Runtime on the CPU. Retrieval quality for our documents is not measured.

# Source-comparison model

Gemini API (Google), accessed through the OpenAI-compatible endpoint:
<https://ai.google.dev/gemini-api/docs/openai>. No model weights are shipped in
Git or in the image. Requests send transcript text and retrieved source
passages to Google; the Developer API has no EU region pinning. Paid-service
terms apply when billing is enabled. Upstream benchmarks do not establish
accuracy of our fact-checking pipeline.

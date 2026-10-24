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

# Embedding model

`jinaai/jina-embeddings-v2-base-de`, copyright Jina AI, Apache-2.0 license.
Source: <https://huggingface.co/jinaai/jina-embeddings-v2-base-de>, revision
`3f9eede875721714945b6a99a3198299243cf2be` (ONNX export `onnx/model.onnx`).
The image build downloads this revision into `/app/models/embedding/`; it is
not committed and inference does not download. Runs with FastEmbed and ONNX
Runtime on the CPU. Retrieval quality for our documents is not measured.

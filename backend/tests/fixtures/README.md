# Synthetic audio fixture

`speech-de.wav` contains only a computer-generated voice, no human recording.
Text: “In unserem Prototyp üben wir Präsentationen. Wir sprechen deutlich und
erklären unsere Quellen.” Generated with eSpeak NG, German voice, 145 words/minute,
then converted to 16 kHz mono PCM using FFmpeg:

```sh
espeak-ng -v de -s 145 -w /tmp/fulda-synthetic-speech.wav 'In unserem Prototyp üben wir Präsentationen. Wir sprechen deutlich und erklären unsere Quellen.'
ffmpeg -nostdin -loglevel error -i /tmp/fulda-synthetic-speech.wav -ar 16000 -ac 1 backend/tests/fixtures/speech-de.wav
```

This fixture checks wiring and basic synthetic speech/noise discrimination.
It does not validate VAD accuracy for human speakers, accents or microphones.
`app/demo/words.json` is a separate invented timestamp example; it is not an
ASR transcript or alignment of this WAV file.

## Timestamp review evaluation

`test_review.py` contains twenty adversarial writer fixtures (unknown references,
numbers/times, units, source/HTML injection, personality, emotion, quantifiers,
causality, audience effects and free advice), plus timestamp/coverage/quote tests.
`test_review_db.py` uses synthetic sessions against PostgreSQL; the HTTP smoke in
`scripts/smoke_review.py` additionally uses the real worker and object storage.

[`review-human-labels.json`](review-human-labels.json) is a prepared packet of
30 synthetic claims against five evidence fixtures. A human should mark each
`humanLabel` as `supported`, `unsupported` or `unclear`, using only its referenced
fixture, and add notes. Every label is currently null. These are **not** thirty
human-labeled claims, and no accuracy/support rate may be reported from them yet.
The API's evaluation endpoint reports code-verifier counts separately and leaves
`humanLabeledClaims` null; it does not import this packet automatically.

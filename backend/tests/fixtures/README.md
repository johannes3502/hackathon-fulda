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

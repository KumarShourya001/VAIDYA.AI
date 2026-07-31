# Vaidya.AI

Edge-first ambient clinical scribe. Records a doctor-patient consultation,
transcribes it locally, and turns it into a structured clinical note plus FHIR R4
resources. All inference runs on the machine — audio never leaves it.

## Requirements

- Python 3.10+, Node 20+
- ffmpeg on PATH
- Ollama running locally
- NVIDIA GPU for the fast path (falls back to CPU automatically)

## Setup

```
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

```
cd frontend
npm install
```

Pull the language model once, then it works offline:

```
ollama pull llama3.2:3b
```

## Run

Backend:

```
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --app-dir backend
```

Frontend:

```
npm --prefix frontend run dev
```

Open http://localhost:5173.

## Demo safety

`data/samples/sample_consult_01.wav` is a bundled consultation. The "Load sample
consultation" button uses it, so a broken microphone cannot kill a demo.
Regenerate it with `backend/scripts/make_sample.ps1` (Windows TTS, no network).

## Status

Phase 1 items 1-3 and 8-9 work: audio in, local transcription with timestamps,
naive speaker attribution with manual correction, encounters saved and listed,
offline indicator and ASR latency readout.

Not built yet: SOAP note generation, entity extraction, FHIR bundle, review screen.

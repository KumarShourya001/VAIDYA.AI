# Vaidya.AI

Edge-first ambient clinical scribe. It records a doctor-patient consultation,
transcribes it locally, and turns it into a structured clinical note plus FHIR R4B
resources. All inference runs on the machine — audio never leaves it.

It also keeps a medical portfolio for each patient: conditions, allergies,
medications, doctors seen and appointments, behind a sign-in, with an emergency
card that a responder can read without one.

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

Pull the models once, then everything works offline:

```
ollama pull llama3.2:3b
ollama pull qwen2.5:7b
```

Seed the demo data (drops and recreates all tables):

```
cd backend
.venv\Scripts\python.exe -m app.seed
```

## Run

Backend:

```
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8000
```

Frontend:

```
npm --prefix frontend run dev
```

Open http://localhost:5173 and sign in with `ananya` / `vaidya123`.

## Demo accounts

All fictional. Password for each is `vaidya123`.

| Username | Name | Notes |
|---|---|---|
| ananya | Ananya Sharma | Asthma, severe penicillin allergy |
| rohit | Rohit Verma | Type 2 diabetes, hypertension |
| meera | Meera Nair | Migraine with aura |

## The four tabs

- **Consultation** — record, upload or load the bundled sample, transcribe, label
  speakers, generate the note, edit every field, inspect the FHIR bundle.
- **My record** — the patient's portfolio.
- **Ask Vaidya** — a chatbot grounded in that patient's record. It explains the
  note, repeats what the doctor prescribed, and refuses to recommend or change
  any medication. Emergency symptoms trigger an escalation message.
- **Emergency card** — blood group, allergies, active conditions, current
  medications and contacts.

The emergency card is also reachable at `#emergency/<patient id>` **without
signing in**, the way a phone lock screen shows a medical ID. It exposes only
that minimal set; notes and transcripts stay behind the login.

## Demo safety

`data/samples/sample_consult_01.wav` is a bundled consultation, so a broken
microphone cannot kill a demo. Regenerate it with
`backend/scripts/make_sample.ps1` (Windows TTS, no network).

## Model choice

The note generator is switchable per request from the Consultation tab.

| | llama3.2:3b | qwen2.5:7b |
|---|---|---|
| Speed | ~8 s | ~35 s |
| Medication capture | misses drugs never named outright | catches them |
| Symptom durations | captured | often missed |
| Invented durations | occasionally | none observed |

llama3.2:3b is the default because the demo needs to stay quick. qwen2.5:7b is
the better clinical read.

## What this is not

Prototype-grade authentication: salted PBKDF2 and random session tokens, but no
rate limiting, no password reset, no expiry. Do not put real patient data behind
it. Nothing here is a medical device and no output should be acted on without a
clinician.

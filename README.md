# Vaidya.AI

Edge-first ambient clinical scribe. It records a doctor-patient consultation,
transcribes it locally, and turns it into a structured clinical note plus FHIR R4B
resources. All inference runs on the machine — audio never leaves it.

It also keeps a medical portfolio for each patient: conditions, allergies,
medications, doctors seen and appointments, behind a sign-in, with an emergency
card that a responder can read without one.


## Live demo

Deployed in demo mode (replays a bundled sample consultation, no live inference):
https://vaidya-web.onrender.com

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

## Accounts

Anyone can create one from the sign-in screen. Usernames are 3+ characters,
passwords 8+. The optional profile fields (blood group, phone, emergency
contact) are what populate the emergency card, so the form says so rather than
collecting them silently.

Each patient sees only their own encounters. Another patient's consultation
returns 404 rather than 403, so a signed-in account cannot probe for what exists.

### Seeded demo accounts

All fictional. Password for each is `vaidya123`.

| Username | Name | Notes |
|---|---|---|
| ananya | Ananya Sharma | Asthma, severe penicillin allergy |
| rohit | Rohit Verma | Type 2 diabetes, hypertension |
| meera | Meera Nair | Migraine with aura |

## The four tabs

- **Consultation** — record, upload or load the bundled sample, transcribe, label
  speakers, generate the note, edit every field, inspect the FHIR bundle.
- **My record** — the patient's portfolio. "Edit record" makes the profile,
  medical conditions and allergies editable: add rows, remove rows, change any
  field, save. Current medications are not editable here; they come from the
  most recent consultation note and are corrected on the note itself.
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

## Deployment

The backend cannot run on a serverless host. faster-whisper plus its CUDA
runtime is roughly 2 GB against Vercel's 250 MB function limit, Ollama is a
persistent process with gigabyte weights, a note takes 8 to 35 seconds against a
10 second function timeout, and the filesystem has to persist between requests.
So the two halves deploy to different places.

**Frontend to Vercel.** Root directory `frontend`, framework Vite. Set one
environment variable:

```
VITE_API_URL=https://<your-backend-host>
```

**Backend to any container host with a disk** (Render, Railway, Fly). A
`Dockerfile` and a `render.yaml` blueprint are included. Set:

```
VAIDYA_DEMO_MODE=true
VAIDYA_ORIGINS=https://<your-vercel-domain>
DATABASE_URL=postgresql://...      # optional; falls back to sqlite on the disk
```

### Hosted database

Set `DATABASE_URL` and nothing is written to a local file. Any managed Postgres
works; Neon and Supabase both have a free tier that needs no card.

1. Create a Postgres database on the provider.
2. Copy the connection string. If it begins `postgres://`, change that prefix to
   `postgresql://` — SQLAlchemy needs the longer form.
3. Set it as `DATABASE_URL` on the backend host, and locally in `backend/.env`
   if you want to point your laptop at the same database.
4. Create the tables and demo patients:

```
cd backend
set DATABASE_URL=postgresql://...
.venv\Scripts\python.exe -m app.seed
```

The schema compiles cleanly for Postgres — `SERIAL` keys, cascading foreign
keys — and the same code runs on either engine. Only the SQLite foreign-key
pragma is conditional.

One caveat: uploaded recordings still go to `VAIDYA_DATA_DIR` on the host's
filesystem, not into the database. On a host without a persistent disk they
disappear when the container restarts. In demo mode nothing is uploaded, so it
does not arise; if you want real uploads in the cloud, they need object storage.

### Speech in the browser

The hosted site has no speech model, but recording still works there: whisper
tiny runs inside the visitor's browser through transformers.js, and only the
resulting text is sent to the server. The audio itself never leaves the device,
so the privacy claim holds on the web as well as on a laptop.

The model is about 150 MB at fp32 and downloads once, then the browser caches
it. Int8 builds are smaller but the whisper decoder ones currently fail to load
under onnxruntime-web, which is why full precision is pinned in `browserAsr.js`.

Measured on a desktop browser: 16 seconds of audio transcribed in 5.8 seconds,
roughly 3x realtime, with usable timestamps.

Locally the server does the transcription instead, because whisper `small` on
the GPU is both faster and more accurate than tiny in a browser.

A transcript made this way stops at the transcript: turning it into a clinical
note still needs the language model, so that step only works on a full install.

### Demo mode

A cloud host has no GPU and no Ollama, so `VAIDYA_DEMO_MODE=true` makes the
backend replay precomputed results for the bundled sample instead of running
models. The whole flow still demonstrates — transcript, speaker labels, note,
editing, FHIR bundle — and the status bar says plainly that it is replaying
rather than inferring. Any other audio is refused with an explanation instead of
hanging or silently failing.

The precomputed files are `data/samples/sample_consult_01.segments.json` and
`.note.json`, generated on a GPU machine with qwen2.5:7b.

Test it locally before deploying:

```
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --env-file .env.demo --port 8001
```

### Deploying does change the privacy story

The whole pitch is that audio and inference stay on the device. A deployed copy
holds patient records on someone else's server, so it is a showcase of the
interface, not the product. The honest live demo is still the laptop: full local
inference, network adapter off. Say which one you are showing.

## What this is not

Prototype-grade authentication: salted PBKDF2 and random session tokens, but no
rate limiting, no password reset, no expiry. Do not put real patient data behind
it. Nothing here is a medical device and no output should be acted on without a
clinician.

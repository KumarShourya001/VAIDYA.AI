import json
import shutil
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from . import asr, audio, auth, config, fhir_map, llm, speakers
from .db import get_db
from .encounters import build_detail
from .models_db import Encounter, Note, Segment, now
from .schemas import EncounterDetail, EncounterOut

router = APIRouter(prefix="/api", tags=["pipeline"])

SAMPLE_WAV = config.SAMPLES_DIR / "sample_consult_01.wav"
SAMPLE_SEGMENTS = config.SAMPLES_DIR / "sample_consult_01.segments.json"
SAMPLE_NOTE = config.SAMPLES_DIR / "sample_consult_01.note.json"

DEMO_REFUSAL = (
    "This deployment has no GPU and no local model, so it can only replay the "
    "bundled sample consultation. Run the project locally to process your own audio."
)


@router.post("/audio/upload", response_model=EncounterOut)
def upload_audio(
    file: UploadFile = File(...),
    source: str = Form("upload"),
    patient_label: str = Form(None),
    patient=Depends(auth.optional_patient),
    db: Session = Depends(get_db),
):
    if not audio.have_ffmpeg():
        raise HTTPException(500, "ffmpeg not available on this machine")

    uid = uuid.uuid4().hex[:8]
    raw_path = config.AUDIO_DIR / f"{uid}_raw{_extension(file.filename)}"
    with open(raw_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    wav_path = config.AUDIO_DIR / f"{uid}.wav"
    try:
        audio.to_wav16k(raw_path, wav_path)
    except RuntimeError as e:
        raise HTTPException(400, str(e))
    finally:
        raw_path.unlink(missing_ok=True)

    return _create_encounter(db, source, wav_path, patient_label, patient)


@router.post("/audio/sample", response_model=EncounterOut)
def load_sample(patient=Depends(auth.optional_patient), db: Session = Depends(get_db)):
    if not SAMPLE_WAV.exists():
        raise HTTPException(500, "bundled sample missing; run scripts/make_sample.ps1")

    # copy rather than reference, so deleting an encounter cannot eat the demo asset
    uid = uuid.uuid4().hex[:8]
    wav_path = config.AUDIO_DIR / f"{uid}.wav"
    shutil.copyfile(SAMPLE_WAV, wav_path)

    return _create_encounter(db, "sample", wav_path, "Sample Patient", patient)


@router.post("/encounters/{encounter_id}/transcribe", response_model=EncounterDetail)
def transcribe_encounter(encounter_id: int, db: Session = Depends(get_db)):
    enc = db.get(Encounter, encounter_id)
    if not enc:
        raise HTTPException(404, "encounter not found")
    if not enc.audio_path:
        raise HTTPException(400, "encounter has no audio")

    if config.DEMO_MODE:
        segs, language, asr_ms = _replay_transcript(enc)
        asr_label = "precomputed"
    else:
        wav_path = config.AUDIO_DIR / enc.audio_path
        if not wav_path.exists():
            raise HTTPException(404, f"audio file missing: {enc.audio_path}")

        try:
            segs, language, asr_ms = asr.transcribe(wav_path)
        except Exception as e:
            raise HTTPException(500, f"transcription failed: {e}")

        speakers.assign(segs, wav_path)
        asr_label = f"{config.ASR_MODEL} ({asr.device()})"

    # re-transcribing replaces the previous run rather than appending to it
    for old in enc.segments:
        db.delete(old)

    for i, s in enumerate(segs):
        db.add(Segment(
            encounter_id=enc.id,
            idx=i,
            start_s=s["start_s"],
            end_s=s["end_s"],
            text=s["text"],
            avg_logprob=s["avg_logprob"],
            speaker=s["speaker"],
        ))

    enc.language = language
    enc.asr_ms = asr_ms
    enc.asr_model = asr_label
    enc.status = "transcribed"

    db.commit()
    db.refresh(enc)
    return build_detail(enc)


@router.post("/encounters/{encounter_id}/note", response_model=EncounterDetail)
def generate_note(encounter_id: int, model: str = None, db: Session = Depends(get_db)):
    enc = db.get(Encounter, encounter_id)
    if not enc:
        raise HTTPException(404, "encounter not found")
    if not enc.segments:
        raise HTTPException(400, "transcribe the encounter first")

    if config.DEMO_MODE:
        raw_json, llm_ms, model = _replay_note(enc)
    else:
        model = model or config.LLM_MODEL
        transcript_text = llm.transcript_from_segments(enc.segments)
        try:
            note, llm_ms = llm.generate_note(transcript_text, model)
        except llm.LLMError as e:
            raise HTTPException(503, str(e))
        raw_json = note.model_dump_json()
    if enc.note:
        enc.note.raw_note_json = raw_json
        enc.note.updated_at = now()
    else:
        # assign through the relationship, not by foreign key: rebuild_bundle below
        # reads enc.note, and a plain db.add() leaves it None until the next request
        enc.note = Note(raw_note_json=raw_json)

    enc.llm_ms = llm_ms
    enc.llm_model = model
    enc.status = "noted"

    db.flush()  # the bundle builder reads enc.note, so the note must exist first
    fhir_map.rebuild_bundle(db, enc)

    db.commit()
    db.refresh(enc)
    return build_detail(enc)


def _replay_transcript(enc):
    if enc.source != "sample" or not SAMPLE_SEGMENTS.exists():
        raise HTTPException(503, DEMO_REFUSAL)
    data = json.loads(SAMPLE_SEGMENTS.read_text(encoding="utf-8"))
    return data["segments"], data["language"], data["asr_ms"]


def _replay_note(enc):
    if enc.source != "sample" or not SAMPLE_NOTE.exists():
        raise HTTPException(503, DEMO_REFUSAL)
    data = json.loads(SAMPLE_NOTE.read_text(encoding="utf-8"))
    return json.dumps(data["note"]), data["llm_ms"], f"{data['llm_model']} (precomputed)"


def _create_encounter(db, source, wav_path, patient_label, patient=None):
    # filename only, so the database survives the project being moved
    enc = Encounter(
        source=source,
        audio_path=wav_path.name,
        patient_id=patient.id if patient else None,
        patient_label=patient.full_name if patient else patient_label,
        duration_s=audio.duration_of(wav_path),
        status="new",
    )
    db.add(enc)
    db.commit()
    db.refresh(enc)
    return enc


def _extension(filename):
    if not filename or "." not in filename:
        return ".bin"
    return "." + filename.rsplit(".", 1)[1].lower()

import shutil
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from . import asr, audio, config, speakers
from .db import get_db
from .encounters import build_detail
from .models_db import Encounter, Segment
from .schemas import EncounterDetail, EncounterOut

router = APIRouter(prefix="/api", tags=["pipeline"])

SAMPLE_WAV = config.SAMPLES_DIR / "sample_consult_01.wav"


@router.post("/audio/upload", response_model=EncounterOut)
def upload_audio(
    file: UploadFile = File(...),
    source: str = Form("upload"),
    patient_label: str = Form(None),
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

    return _create_encounter(db, source, wav_path, patient_label)


@router.post("/audio/sample", response_model=EncounterOut)
def load_sample(db: Session = Depends(get_db)):
    if not SAMPLE_WAV.exists():
        raise HTTPException(500, "bundled sample missing; run scripts/make_sample.ps1")

    # copy rather than reference, so deleting an encounter cannot eat the demo asset
    uid = uuid.uuid4().hex[:8]
    wav_path = config.AUDIO_DIR / f"{uid}.wav"
    shutil.copyfile(SAMPLE_WAV, wav_path)

    return _create_encounter(db, "sample", wav_path, "Sample Patient")


@router.post("/encounters/{encounter_id}/transcribe", response_model=EncounterDetail)
def transcribe_encounter(encounter_id: int, db: Session = Depends(get_db)):
    enc = db.get(Encounter, encounter_id)
    if not enc:
        raise HTTPException(404, "encounter not found")
    if not enc.audio_path:
        raise HTTPException(400, "encounter has no audio")

    wav_path = config.AUDIO_DIR / enc.audio_path
    if not wav_path.exists():
        raise HTTPException(404, f"audio file missing: {enc.audio_path}")

    try:
        segs, language, asr_ms = asr.transcribe(wav_path)
    except Exception as e:
        raise HTTPException(500, f"transcription failed: {e}")

    speakers.assign(segs, wav_path)

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
    enc.asr_model = f"{config.ASR_MODEL} ({asr.device()})"
    enc.status = "transcribed"

    db.commit()
    db.refresh(enc)
    return build_detail(enc)


def _create_encounter(db, source, wav_path, patient_label):
    # filename only, so the database survives the project being moved
    enc = Encounter(
        source=source,
        audio_path=wav_path.name,
        patient_label=patient_label,
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

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .db import get_db
from .models_db import Encounter, Segment
from .schemas import EncounterOut, EncounterDetail, SegmentOut, SegmentEdit

router = APIRouter(prefix="/api/encounters", tags=["encounters"])


@router.get("", response_model=list[EncounterOut])
def list_encounters(db: Session = Depends(get_db)):
    return db.query(Encounter).order_by(Encounter.id.desc()).all()


def build_detail(enc):
    detail = EncounterDetail.model_validate(enc)
    detail.segments = [SegmentOut.model_validate(s) for s in enc.segments]

    if enc.note:
        note_json = enc.note.final_note_json or enc.note.raw_note_json
        detail.note = json.loads(note_json)
        detail.reviewed = enc.note.reviewed
    if enc.bundle:
        detail.fhir_bundle = json.loads(enc.bundle.bundle_json)
        detail.fhir_valid = bool(enc.bundle.valid)

    return detail


@router.get("/{encounter_id}", response_model=EncounterDetail)
def get_encounter(encounter_id: int, db: Session = Depends(get_db)):
    enc = db.get(Encounter, encounter_id)
    if not enc:
        raise HTTPException(404, "encounter not found")
    return build_detail(enc)


@router.delete("/{encounter_id}")
def delete_encounter(encounter_id: int, db: Session = Depends(get_db)):
    enc = db.get(Encounter, encounter_id)
    if not enc:
        raise HTTPException(404, "encounter not found")
    db.delete(enc)
    db.commit()
    return {"deleted": encounter_id}


@router.patch("/{encounter_id}/segments", response_model=list[SegmentOut])
def edit_segments(encounter_id: int, edits: list[SegmentEdit], db: Session = Depends(get_db)):
    enc = db.get(Encounter, encounter_id)
    if not enc:
        raise HTTPException(404, "encounter not found")

    by_id = {s.id: s for s in enc.segments}
    for e in edits:
        seg = by_id.get(e.id)
        if not seg:
            continue
        if e.speaker is not None:
            seg.speaker = e.speaker
        if e.text is not None:
            seg.text = e.text
        seg.edited = 1

    db.commit()
    return [SegmentOut.model_validate(s) for s in enc.segments]

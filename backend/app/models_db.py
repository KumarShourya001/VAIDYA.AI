from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import relationship

from .db import Base


def now():
    return datetime.now().isoformat(timespec="seconds")


class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(Integer, primary_key=True)
    created_at = Column(String, nullable=False, default=now)
    patient_label = Column(String)
    source = Column(String, nullable=False)  # mic | upload | sample
    audio_path = Column(String)
    language = Column(String)
    duration_s = Column(Float)
    status = Column(String, nullable=False, default="new")  # new|transcribed|noted|reviewed
    asr_ms = Column(Integer)
    llm_ms = Column(Integer)
    asr_model = Column(String)
    llm_model = Column(String)

    segments = relationship(
        "Segment", back_populates="encounter", cascade="all, delete-orphan",
        order_by="Segment.idx",
    )
    note = relationship("Note", back_populates="encounter", uselist=False,
                        cascade="all, delete-orphan")
    bundle = relationship("FhirBundle", back_populates="encounter", uselist=False,
                          cascade="all, delete-orphan")


class Segment(Base):
    __tablename__ = "segments"

    id = Column(Integer, primary_key=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id", ondelete="CASCADE"), nullable=False)
    idx = Column(Integer, nullable=False)
    start_s = Column(Float, nullable=False)
    end_s = Column(Float, nullable=False)
    speaker = Column(String)  # doctor | patient | unknown
    text = Column(Text, nullable=False)
    avg_logprob = Column(Float)
    edited = Column(Integer, default=0)

    encounter = relationship("Encounter", back_populates="segments")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id", ondelete="CASCADE"), nullable=False)
    raw_note_json = Column(Text, nullable=False)
    final_note_json = Column(Text)
    reviewed = Column(Integer, default=0)
    created_at = Column(String, nullable=False, default=now)
    updated_at = Column(String)

    encounter = relationship("Encounter", back_populates="note")


class FhirBundle(Base):
    __tablename__ = "fhir_bundles"

    id = Column(Integer, primary_key=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id", ondelete="CASCADE"), nullable=False)
    bundle_json = Column(Text, nullable=False)
    valid = Column(Integer, nullable=False)
    error = Column(Text)
    created_at = Column(String, nullable=False, default=now)

    encounter = relationship("Encounter", back_populates="bundle")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True)
    encounter_id = Column(Integer, ForeignKey("encounters.id", ondelete="CASCADE"))
    image_path = Column(String, nullable=False)
    ocr_text = Column(Text)
    meds_json = Column(Text)
    created_at = Column(String, nullable=False, default=now)

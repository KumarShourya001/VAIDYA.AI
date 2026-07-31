import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("VAIDYA_DATA_DIR", BASE_DIR / "data"))
AUDIO_DIR = DATA_DIR / "audio"
SAMPLES_DIR = BASE_DIR / "data" / "samples"
DB_PATH = DATA_DIR / "vaidya.db"

for d in (DATA_DIR, AUDIO_DIR, SAMPLES_DIR):
    d.mkdir(parents=True, exist_ok=True)

# postgres://... on a host with a managed database, sqlite on a laptop
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

# small leaves VRAM for Ollama; medium fights the LLM for space on an 8GB card
ASR_MODEL = os.getenv("VAIDYA_ASR_MODEL", "small")
ASR_DEVICE = os.getenv("VAIDYA_ASR_DEVICE", "cuda")
ASR_COMPUTE = os.getenv("VAIDYA_ASR_COMPUTE", "float16")

OLLAMA_URL = os.getenv("VAIDYA_OLLAMA_URL", "http://127.0.0.1:11434")
LLM_MODEL = os.getenv("VAIDYA_LLM_MODEL", "llama3.2:3b")
LLM_RETRIES = 2

# On a host with no GPU and no Ollama the bundled sample is served from
# precomputed results, so the whole flow still demonstrates. Anything other than
# the sample is refused with an explanation rather than left to hang.
DEMO_MODE = os.getenv("VAIDYA_DEMO_MODE", "").lower() in ("1", "true", "yes")

FRONTEND_ORIGINS = [
    o.strip()
    for o in os.getenv("VAIDYA_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

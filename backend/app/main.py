import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import audio, config
from .db import init_db
from . import chat, encounters, pipeline, portfolio

app = FastAPI(title="Vaidya.AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(encounters.router)
app.include_router(pipeline.router)
app.include_router(portfolio.router)
app.include_router(chat.router)

init_db()


@app.get("/api/health")
def health():
    ollama_up = False
    try:
        r = requests.get(f"{config.OLLAMA_URL}/api/tags", timeout=1)
        ollama_up = r.status_code == 200
    except requests.RequestException:
        pass

    return {
        "ok": True,
        "offline": not config.DEMO_MODE,  # local runs never talk to the internet
        "demo_mode": config.DEMO_MODE,
        "ffmpeg": audio.have_ffmpeg(),
        "ollama": ollama_up,
        "asr_model": config.ASR_MODEL,
        "asr_device": config.ASR_DEVICE,
        "llm_model": config.LLM_MODEL,
    }

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.public import router as public_router

app = FastAPI(
    title="EventInvite API",
    description="Backend API for the EventInvite wedding/event management platform.",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS — allow all origins in development. Lock this down in production.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(public_router, prefix="/api")
app.include_router(admin_router, prefix="/api/admin")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}

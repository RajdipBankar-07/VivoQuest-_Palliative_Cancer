from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .api import health, bundling, matching, routing

app = FastAPI(
    title="VivoQuest AI Care Coordination Microservice",
    description=(
        "AI-enabled clinical task bundling, intelligent provider matching, and routing engine "
        "for VivoQuest's preventive healthcare marketplace in India."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware (allows communication from Express API Gateway & Next.js frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4000",
        "http://127.0.0.1:4000",
        settings.CORE_API_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(health.router)
app.include_router(bundling.router)
app.include_router(matching.router)
app.include_router(routing.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_AI_SERVICE_ERROR",
                "message": "An unexpected error occurred in the VivoQuest AI service.",
                "detail": str(exc) if settings.ENVIRONMENT == "development" else None,
            },
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

from fastapi import APIRouter
from datetime import datetime
from ..config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "vivoquest-ai-services",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "modules": {
            "bundling_engine": "active",
            "provider_matching": "active",
            "routing_estimator": "active_deterministic_fallback",
        },
    }

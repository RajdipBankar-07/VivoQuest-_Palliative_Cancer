from fastapi import APIRouter, HTTPException, status
from ..schemas.tasks import (
    BundlingEvaluationRequest,
    BundlingEvaluationResponse,
)
from ..services.bundling_engine import evaluate_clinical_bundles

router = APIRouter(prefix="/api/v1/bundles", tags=["Clinical Task Bundling"])


@router.post(
    "/evaluate",
    response_model=BundlingEvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate care tasks for single-visit Super-Visit bundling",
)
def evaluate_bundles(request: BundlingEvaluationRequest):
    try:
        return evaluate_clinical_bundles(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clinical bundling engine error: {str(e)}",
        )

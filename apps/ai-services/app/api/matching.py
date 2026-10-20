from fastapi import APIRouter, HTTPException, status
from ..schemas.providers import MatchingRequest, MatchingResponse
from ..services.matching_engine import rank_provider_candidates

router = APIRouter(prefix="/api/v1/matching", tags=["Intelligent Provider Matching"])


@router.post(
    "/rank-providers",
    response_model=MatchingResponse,
    status_code=status.HTTP_200_OK,
    summary="Rank eligible healthcare providers using verified credentials, skills, and proximity",
)
def rank_providers(request: MatchingRequest):
    try:
        return rank_provider_candidates(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Provider matching engine error: {str(e)}",
        )

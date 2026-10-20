from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from ..schemas.common import GeoCoordinates, DistanceEstimate
from ..services.routing_service import deterministic_router

router = APIRouter(prefix="/api/v1/routing", tags=["Routing & Transit Estimation"])


class RouteEstimateRequest(BaseModel):
    origin: GeoCoordinates
    destination: GeoCoordinates


@router.post(
    "/estimate",
    response_model=DistanceEstimate,
    status_code=status.HTTP_200_OK,
    summary="Estimate road distance and travel time using deterministic urban metrics",
)
def estimate_route(request: RouteEstimateRequest):
    try:
        return deterministic_router.estimate_travel(request.origin, request.destination)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route calculation error: {str(e)}",
        )

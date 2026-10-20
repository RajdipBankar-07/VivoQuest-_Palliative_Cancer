from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from .common import GeoCoordinates, LocationSpec
from .tasks import BundleItem, ClinicalTask


class ProviderCandidate(BaseModel):
    provider_id: str
    full_name: str
    title: str = "Dr."
    profession_type: str = Field(
        ...,
        description="physician, physiotherapist, nurse, phlebotomist, dietitian, chw, technician",
    )
    registration_number: str
    registration_council: Optional[str] = "Maharashtra Medical Council"
    verification_status: str = Field(
        ...,
        description="'verified', 'pending_review', or 'unverified'",
    )
    service_clusters: List[str] = Field(default_factory=list)
    years_of_experience: int = 1
    rating: float = Field(default=5.0, ge=1.0, le=5.0)
    total_visits_completed: int = 0
    current_location: Optional[GeoCoordinates] = None
    has_transport: bool = True
    carries_equipment: List[str] = Field(default_factory=list)


class MatchingRequest(BaseModel):
    target_bundle: Optional[BundleItem] = None
    single_task: Optional[ClinicalTask] = None
    patient_location: LocationSpec
    candidate_providers: List[ProviderCandidate]


class RankedProvider(BaseModel):
    provider_id: str
    full_name: str
    title: str
    profession_type: str
    registration_number: str
    verification_status: str
    match_score: float = Field(..., ge=0.0, le=100.0)
    is_eligible: bool
    estimated_distance_km: Optional[float] = None
    estimated_travel_minutes: Optional[int] = None
    reasons: List[str] = Field(default_factory=list)
    score_breakdown: Dict[str, float] = Field(default_factory=dict)


class MatchingResponse(BaseModel):
    target_identifier: str
    total_evaluated: int
    total_eligible: int
    ranked_providers: List[RankedProvider]
    requires_human_approval: bool = True
    disclaimer: str = (
        "Provider matching ranks eligibility based on verified clinical credentials, geographic cluster, "
        "and skill tags. Dispatch authorization requires Care Coordinator human sign-off."
    )

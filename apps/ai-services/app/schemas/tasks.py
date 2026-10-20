from pydantic import BaseModel, Field
from typing import List, Optional
from .common import LocationSpec


class ClinicalTask(BaseModel):
    task_id: str = Field(..., description="Unique task or booking identifier")
    service_code: str = Field(..., description="Canonical service code")
    title: str = Field(..., description="Service title")
    required_profession_type: str = Field(
        ...,
        description="Profession type: phlebotomist, physiotherapist, nurse, dietitian, physician, chw, technician",
    )
    required_credentials: List[str] = Field(default_factory=list)
    estimated_duration_minutes: int = Field(default=30, ge=5, le=180)
    requires_fasting: bool = Field(default=False)
    equipment_needed: List[str] = Field(default_factory=list)
    patient_id: str = Field(..., description="Anonymized patient reference (no plain PII)")
    location: LocationSpec
    priority: str = Field(default="routine", description="routine, time_sensitive, urgent_fasting")


class BundlingEvaluationRequest(BaseModel):
    tasks: List[ClinicalTask] = Field(..., min_length=1, description="List of tasks to evaluate")
    max_total_minutes: int = Field(default=120, le=180, description="Max total duration for a single visit")
    preferred_date: Optional[str] = None


class BundleItem(BaseModel):
    bundle_id: str
    title: str
    bundle_type: str = Field(
        ...,
        description="'single_provider_visit' or 'multidisciplinary_coordinated_window'",
    )
    task_ids: List[str]
    tasks: List[ClinicalTask]
    total_duration_minutes: int
    eligible_profession_types: List[str]
    shared_equipment: List[str]
    compatibility_score: float = Field(..., ge=0.0, le=1.0)
    matching_criteria: List[str]
    clinical_safeguards: List[str]


class BundlingEvaluationResponse(BaseModel):
    is_bundling_recommended: bool
    suggested_bundles: List[BundleItem]
    unbundled_tasks: List[ClinicalTask]
    total_efficiency_gain_minutes: int
    disclaimer: str = (
        "VivoQuest Clinical Bundling Engine outputs procedural coordination recommendations only. "
        "It does not diagnose patients or supersede attending physician orders."
    )
